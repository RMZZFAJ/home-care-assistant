import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

async function fixture() {
  const f = await setup(),
    family = await actor("family", f.patient);
  const document = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "2" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  assert.equal(document.status, "pending_approval");
  return { ...f, document };
}
const content = (document) => ({
  documentVersion: document.version,
  fields: {
    [document.lines[0].id]: "1,",
    reason: "Motivo ainda em preparação",
  },
  divergentIds: [],
  materials: document.lines.map((l) => ({
    id: l.id,
    name: l.name_snapshot,
    unit: l.unit_snapshot,
    quantityDecimals: 0,
  })),
});
const stages = {
  approve: "approval",
  purchase: "acquisition",
  receive: "arrival",
};
const packet = (f, purpose, document = f.document) => ({
  p_patient: f.patient,
  p_kind: "COM",
  p_purpose: purpose,
  p_target: document.id,
  p_id: null,
  p_expected: null,
  p_body: {
    action: "save",
    content: content(document),
    navigation: { version: 1, stage: stages[purpose] },
  },
  p_key: randomUUID(),
});
const read = (client, p) =>
  rpc(client, "supply_draft_context", {
    p_patient: p.p_patient,
    p_kind: p.p_kind,
    p_purpose: p.p_purpose,
    p_target: p.p_target,
  });
const facts = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(f.document.id)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(f.document.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'pdf',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.document.id)}));`,
  );
const confirm = (saved, document, action) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: document.id,
  p_body: {
    action,
    expectedVersion: document.version,
    body: { lines: [{ lineId: document.lines[0].id, quantity: "2" }] },
  },
  p_key: randomUUID(),
});

test("COM operation drafts isolate three purposes, resume on another Auth device and preserve CAS, privacy and official facts", async () => {
  const f = await fixture(),
    peer = await draftDevice(f.patient, "adminA"),
    family = await actor("family", f.patient),
    before = facts(f),
    ids = [];
  for (const purpose of Object.keys(stages)) {
    const p = packet(f, purpose),
      first = await rpc(f.admin, "supply_draft_command", p);
    ids.push(first.id);
    const offered = await read(peer, p);
    assert.equal(offered.content.fields[f.document.lines[0].id], "1,");
    assert.equal(offered.navigation.stage, stages[purpose]);
    assert.equal((await rpc(peer, "supply_draft_command", p)).revision, 1);
    const races = await Promise.all(
      [f.admin, peer].map((client, i) =>
        client.rpc("supply_draft_command", {
          ...p,
          p_id: first.id,
          p_expected: 1,
          p_key: randomUUID(),
          p_body: {
            ...p.p_body,
            content: {
              ...p.p_body.content,
              fields: {
                ...p.p_body.content.fields,
                reason: "Dispositivo " + i,
              },
            },
          },
        }),
      ),
    );
    assert.equal(races.filter((r) => !r.error).length, 1);
    assert.equal(races.find((r) => r.error).error.code, "PT409");
    assert.equal(await read(family, p), null);
    assert.equal(
      (
        await family.rpc("supply_draft_command", {
          ...p,
          p_id: first.id,
          p_expected: 2,
          p_key: randomUUID(),
        })
      ).error?.code,
      "42501",
    );
    assert.equal(facts(f), before);
  }
  assert.equal(new Set(ids).size, 3);
  const p = packet(f, "purchase"),
    saved = await read(f.admin, p);
  await rpc(f.admin, "supply_draft_command", {
    ...p,
    p_id: saved.id,
    p_expected: saved.revision,
    p_body: { action: "discard" },
    p_key: randomUUID(),
  });
  assert.equal(await read(f.admin, p), null);
  assert.equal((await read(f.admin, packet(f, "approve"))).state, "active");
  assert.equal(facts(f), before);
});

test("COM approval acquisition and arrival consume only their saved revision, recover one result and preserve separate stock facts", async () => {
  const f = await fixture();
  let document = f.document;
  for (const action of Object.keys(stages)) {
    const p = packet(f, action, document),
      saved = await rpc(f.admin, "supply_draft_command", p),
      before = facts(f),
      command = confirm(saved, document, action);
    const mismatched = await f.admin.rpc("commit_supply_draft", {
      ...command,
      p_body: {
        ...command.p_body,
        action: action === "approve" ? "purchase" : "approve",
      },
    });
    assert.equal(mismatched.error?.code, "22023");
    assert.equal(facts(f), before);
    const wrongVersion = await f.admin.rpc("commit_supply_draft", {
      ...command,
      p_body: { ...command.p_body, expectedVersion: document.version + 1 },
      p_key: randomUUID(),
    });
    assert.equal(wrongVersion.error?.code, "PT409");
    assert.equal(facts(f), before);
    const result = await rpc(f.admin, "commit_supply_draft", command);
    document = result.result;
    const after = facts(f);
    assert.equal(result.state, "consumed");
    assert.equal((await read(f.admin, p)).content, null);
    assert.deepEqual(
      (await rpc(f.admin, "commit_supply_draft", command)).result,
      document,
    );
    assert.equal(facts(f), after);
    assert.equal(
      (
        await f.admin.rpc("commit_supply_draft", {
          ...command,
          p_key: randomUUID(),
        })
      ).error?.code,
      "PT409",
    );
    await rpc(f.admin, "supply_draft_command", {
      ...p,
      p_id: saved.id,
      p_expected: result.revision,
      p_body: { action: "acknowledge" },
      p_key: randomUUID(),
    });
    assert.equal(await read(f.admin, p), null);
    assert.equal(facts(f), after);
    assert.equal(
      sql(
        `select coalesce(sum(quantity),0)=${action === "receive" ? 2 : 0} from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`,
      ),
      "t",
    );
  }
});

test("COM draft confirmation rechecks revoked capability after its real lock and refuses another target or purpose", async () => {
  const f = await fixture(),
    p = packet(f, "approve"),
    saved = await rpc(f.admin, "supply_draft_command", p),
    before = facts(f),
    command = confirm(saved, f.document, "approve");
  const denied = await whileAdvisoryWaits(
    `supply-draft-slot:${fixtures.adminA.id}:${f.patient}:COM:approve:${f.document.id}`,
    () => f.admin.rpc("commit_supply_draft", command),
    () =>
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.approve',false);`,
      ),
  );
  assert.equal(denied.error?.code, "42501");
  assert.equal(facts(f), before);
  assert.equal((await read(f.admin, p)).revision, 1);
  assert.equal(
    sql(
      `select count(*) from private.creation_draft_commands where owner_id=${sqlLiteral(fixtures.adminA.id)} and idempotency_key=${sqlLiteral(command.p_key)};`,
    ),
    "0",
  );
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.adminA.id)} and capability='com.approve';`,
  );
  assert.equal(
    (
      await f.admin.rpc("commit_supply_draft", {
        ...command,
        p_target: randomUUID(),
      })
    ).error?.code,
    "PT409",
  );
  assert.equal(
    (
      await f.admin.rpc("supply_draft_command", {
        ...p,
        p_kind: "ENT",
        p_key: randomUUID(),
      })
    ).error?.code,
    "22023",
  );
  assert.equal(facts(f), before);
  await rpc(f.admin, "commit_supply_draft", command);
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)','EXECUTE') or has_function_privilege('service_role','public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)','EXECUTE');",
    ),
    "f",
  );
});
