import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { legacyPdfFixture } from "../support/legacy-pdf-fixtures.mjs";

async function fixture() {
  const f = await setup(),
    owner = await actor("family", f.patient),
    doc = await rpc(owner, "create_supply_document", {
      p_patient: f.patient,
      p_type: "COM",
      p_payload: {
        origin: "purchase",
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  return { ...f, owner, doc };
}
const archive = (f, cursor = null, version = null) =>
  rpc(f.owner, "pdf_archive", {
    p_document: f.doc.id,
    p_version: version,
    p_before: cursor?.at ?? null,
    p_kind: cursor?.kind ?? null,
    p_reference: cursor?.reference ?? null,
    p_limit: 20,
  });
const reserve = (f) =>
  rpc(f.owner, "reserve_pdf_issuance", {
    p_document: f.doc.id,
    p_key: randomUUID(),
    p_version: 1,
  });

test("mixed archive preserves legacy files and paginates 103 records across insertion without private paths or worker proof", async () => {
  const f = await fixture(),
    legacy = await legacyPdfFixture(f.owner, f.doc.id),
    ids = [];
  for (let i = 0; i < 101; i++) ids.push((await reserve(f)).id);
  let page = await archive(f);
  const entries = [...page.data],
    newer = await reserve(f);
  for (let round = 0; page.next && round < 8; round++) {
    page = await archive(f, page.next);
    entries.push(...page.data);
  }
  assert.equal(page.next, null);
  assert.equal(entries.length, 103);
  assert.equal(
    new Set(entries.map((r) => r.kind + ":" + r.reference)).size,
    103,
  );
  assert.deepEqual(
    entries
      .filter((r) => r.kind === "issuance")
      .map((r) => r.reference)
      .sort(),
    ids.sort(),
  );
  assert.ok(!entries.some((r) => r.reference === newer.id));
  assert.equal(
    entries.find((r) => r.kind === "legacy_original").sha256,
    legacy.hash,
  );
  assert.equal(entries.find((r) => r.kind === "legacy_render").renderer, 4);
  assert.ok(
    !/objectPath|object_path|lease|snapshot|sourceHash|idempotency/i.test(
      JSON.stringify(entries),
    ),
  );
  assert.deepEqual((await archive(f, null, 2)).data, []);
  assert.equal((await archive(f, null, 1)).data.length, 20);
  for (const patch of [
    { p_before: new Date().toISOString() },
    { p_kind: "forged", p_before: new Date().toISOString(), p_reference: "x" },
    { p_limit: 51 },
    { p_version: 0 },
  ]) {
    const result = await f.owner.rpc("pdf_archive", {
      p_document: f.doc.id,
      ...patch,
    });
    assert.equal(result.error?.code, "22023");
  }
  const a = await legacy.service.storage
    .from("document-receipts")
    .download(`${f.doc.id}/1.pdf`);
  assert.ifError(a.error);
  assert.equal(
    Buffer.compare(Buffer.from(await a.data.arrayBuffer()), legacy.bytes),
    0,
  );
});

test("archive uses current patient authority and is unavailable to anonymous, service or revoked members", async () => {
  const f = await fixture();
  await reserve(f);
  for (const key of [env.anonKey, env.serviceKey]) {
    const client = createClient(env.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal(
      (await client.rpc("pdf_archive", { p_document: f.doc.id })).error?.code,
      "42501",
    );
  }
  const other = await setup();
  assert.equal((await (await actor("family",other.patient)).rpc("pdf_archive",{p_document:f.doc.id})).error?.code,"42501","A different active patient cannot read the previous patient's archive");
  await actor("family",f.patient);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)};`,
  );
  assert.equal(
    (await f.owner.rpc("pdf_archive", { p_document: f.doc.id })).error?.code,
    "42501",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
  );
  const outsider = await actor("professional", other.patient);
  assert.equal(
    (await outsider.rpc("pdf_archive", { p_document: f.doc.id })).error?.code,
    "42501",
  );
});
