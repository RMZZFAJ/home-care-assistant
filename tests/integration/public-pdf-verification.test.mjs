import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, fixtures, actor, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const service = createClient(env.url, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const subject = () => randomBytes(32).toString("hex");
async function availableWindow(requests, uploads) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = JSON.parse(
      sql(
        "select jsonb_build_object('bucket',floor(extract(epoch from clock_timestamp())/60),'left',60-mod(extract(epoch from clock_timestamp()),60),'requests',coalesce((select requests from private.pdf_verification_windows where subject='global' and bucket=floor(extract(epoch from clock_timestamp())/60)),0),'uploads',coalesce((select uploads from private.pdf_verification_windows where subject='global' and bucket=floor(extract(epoch from clock_timestamp())/60)),0));",
      ),
    );
    if (
      state.requests + requests <= 60 &&
      state.uploads + uploads <= 12 &&
      state.left >= 8
    )
      return state;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(60000, Math.ceil(state.left * 1000) + 100)),
    );
  }
  throw new Error(
    "No uncontended observed local budget window; counters were preserved",
  );
}
test("anonymous and authenticated callers cannot bypass the bounded public facade or alter its counters", async () => {
  const f = await setup(),
    anon = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    signed = await actor("family", f.patient);
  for (const client of [anon, signed]) {
    assert.equal(
      (
        await client.rpc("claim_pdf_verification", {
          p_subject: subject(),
          p_upload: false,
        })
      ).error?.code,
      "42501",
    );
    assert.equal(
      (
        await client.rpc("pdf_issuance_public", {
          p_code: "A".repeat(32),
          p_hash: null,
        })
      ).error?.code,
      "42501",
    );
    assert.equal(
      (await client.rpc("legacy_pdf_public", { p_hash: "a".repeat(64) })).error
        ?.code,
      "42501",
    );
  }
  assert.equal(
    sql(
      "select not has_table_privilege('anon','private.pdf_verification_windows','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('authenticated','private.pdf_verification_windows','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('service_role','private.pdf_verification_windows','SELECT,INSERT,UPDATE,DELETE');",
    ),
    "t",
  );
  assert.equal(
    (
      await service.rpc("claim_pdf_verification", {
        p_subject: "raw-address",
        p_upload: false,
      })
    ).error?.code,
    "22023",
  );
  assert.equal(
    (
      await service.rpc("claim_pdf_verification", {
        p_subject: subject(),
        p_upload: null,
      })
    ).error?.code,
    "22023",
  );
  assert.equal(typeof fixtures.family.id, "string");
});

test("the real shared DB limiter caps concurrent uploads atomically and expires old hashed buckets", async () => {
  const key = subject();
  // Test traffic may already have consumed a global minute. Preserve it; wait for
  // an actual new DB bucket only when necessary, rather than delete live counters.
  await availableWindow(4, 4);
  const oldBucket = Number(
    sql("select floor(extract(epoch from clock_timestamp())/60)-10;"),
  );
  sql(
    `insert into private.pdf_verification_windows(bucket,subject) values(${oldBucket},${sqlLiteral(key)});`,
  );
  const result = await Promise.all(
    Array.from({ length: 8 }, () =>
      rpc(service, "claim_pdf_verification", {
        p_subject: key,
        p_upload: true,
      }),
    ),
  );
  assert.equal(result.filter(Boolean).length, 4);
  assert.equal(result.filter((v) => !v).length, 4);
  assert.equal(
    sql(
      `select count(*) from private.pdf_verification_windows where subject=${sqlLiteral(key)} and bucket=${oldBucket};`,
    ),
    "0",
  );
  assert.equal(
    sql(
      `select max(uploads) from private.pdf_verification_windows where subject=${sqlLiteral(key)};`,
    ),
    "4",
  );
});

test("shared request budget also caps individual clients and the global minute", async () => {
  const observed = await availableWindow(40, 0),
    stamp = observed.bucket,
    used = observed.requests;
  const results = [];
  for (let i = 0; i < 4; i++) {
    const key = subject(),
      batch = await Promise.all(
        Array.from({ length: 24 }, () =>
          rpc(service, "claim_pdf_verification", {
            p_subject: key,
            p_upload: false,
          }),
        ),
      );
    assert.ok(batch.filter(Boolean).length <= 20);
    results.push(...batch);
  }
  assert.equal(
    Number(sql("select floor(extract(epoch from clock_timestamp())/60);")),
    stamp,
    "Budget probe must complete inside its observed DB minute",
  );
  assert.equal(results.filter(Boolean).length, 60 - used);
  assert.equal(
    await rpc(service, "claim_pdf_verification", {
      p_subject: subject(),
      p_upload: false,
    }),
    false,
  );
});
