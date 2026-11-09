import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  transferFixture,
  declareTransfer,
  transferCommand,
  rpc,
} from "./transfer-fixtures.mjs";
import { env } from "./v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const decisionActions = ["agree", "decline", "withdraw", "dispatch"];
export const decisionReason =
  "\uFEFF\n Justificativa própria preservada entre aparelhos\u00a0\t";
export async function transferDecisionFixture(action = "agree") {
  const f = await transferFixture();
  const declaration = await declareTransfer(f);
  assert.ifError(declaration.response.error);
  let document = declaration.response.data;
  if (action === "dispatch") {
    const agreed = await transferCommand(
      f.counterparty.client,
      document.id,
      "agree",
      document.version,
      { reason: "Concordância própria anterior à expedição" },
    );
    assert.ifError(agreed.error);
    document = agreed.data;
  }
  const writer = ["agree", "decline"].includes(action)
    ? f.counterparty
    : f.initiator;
  document = await rpc(writer.client, "operational_document", {
    p_id: document.id,
  });
  return {
    ...f,
    action,
    purpose: "transfer_" + action,
    writer,
    client: writer.client,
    document,
  };
}
export async function decisionPeer(f) {
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (
      await client.auth.signInWithPassword({
        email: f.writer.email,
        password: fixturePassword,
      })
    ).error,
  );
  await rpc(client, "select_active_context", { p_patient: f.patient });
  return client;
}
export const decisionPacket = (f) => ({
  p_patient: f.patient,
  p_kind: "ENT",
  p_purpose: f.purpose,
  p_target: f.document.id,
  p_id: null,
  p_expected: null,
  p_key: randomUUID(),
  p_body: {
    action: "save",
    navigation: { version: 1, stage: "ent_" + f.purpose },
    content: {
      documentVersion: f.document.version,
      fields: { reason: f.action === "dispatch" ? "" : decisionReason },
      divergentIds: [],
      materials: f.document.lines.map((l) => ({
        id: l.id,
        name: l.name_snapshot,
        unit: l.unit_snapshot,
        quantityDecimals: 0,
      })),
    },
  },
});
export const decisionCommit = (
  f,
  saved,
  body = f.action === "dispatch" ? {} : { reason: decisionReason.trim() },
) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: f.document.id,
  p_key: randomUUID(),
  p_body: { action: f.action, body, expectedVersion: f.document.version },
});
export const decisionRead = (client, f) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: f.purpose,
    p_target: f.document.id,
  });
export const decisionFacts = (f) => {
  const patient = q(f.patient);
  return sql(
    "select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=" +
      patient +
      "),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where e.care_recipient_id=" +
      patient +
      "),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where m.care_recipient_id=" +
      patient +
      "),'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where t.care_recipient_id=" +
      patient +
      "));",
  );
};
