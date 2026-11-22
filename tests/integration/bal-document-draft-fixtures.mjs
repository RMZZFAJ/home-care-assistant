import { randomUUID } from "node:crypto";
import { legacyBalance, actor, rpc } from "./bal-review-fixtures.mjs";
import { optionalLegacyRecount } from "./bal-optional-recount-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

export const balDocumentPurposes = [
  "review_family",
  "review_supervisor",
  "assign_recount",
];
export async function balDocumentFixture(purpose) {
  const f =
    purpose === "assign_recount"
      ? await optionalLegacyRecount()
      : await legacyBalance();
  const actorName = purpose === "review_supervisor" ? "supervisor" : "family";
  const identity =
    purpose === "review_supervisor"
      ? await shiftWorker(f.patient, "supervisor")
      : fixtures.family;
  const client =
    identity.client ?? f.family ?? (await actor(actorName, f.patient));
  const document = await rpc(client, "operational_document", {
    p_id: f.document.id,
  });
  const source =
    purpose === "assign_recount"
      ? await rpc(client, "balance_recount_context", { p_id: document.id })
      : document.balanceReview;
  const content = {
    documentVersion: document.version,
    fields:
      purpose === "assign_recount"
        ? {
            reason: "  Designação pessoal de reconto  ",
            referenceHash: source.referenceHash,
            targetShiftId: f.target.id,
            targetShiftVersion: String(f.target.version),
            targetLabel: f.target.professional_name,
            query: "Sheila",
          }
        : {
            comment:
              "  Parecer pessoal independente \n observações de quem contou preservadas 🩺  ",
            referenceHash: source.referenceHash,
          },
    materials: [],
    divergentIds: [],
  };
  const body =
    purpose === "assign_recount"
      ? {
          documentId: document.id,
          targetShiftId: f.target.id,
          targetShiftVersion: f.target.version,
          referenceHash: source.referenceHash,
          reason: content.fields.reason.trim(),
        }
      : {
          group: purpose.slice(7),
          comment: content.fields.comment,
          reviewReference: source.referenceHash,
        };
  return {
    ...f,
    document,
    target: purpose === "assign_recount" ? source.targets.find(row => row.id === content.fields.targetShiftId) : null,
    actorName,
    identity,
    client,
    purpose,
    source,
    content,
    body,
  };
}
export function saveBalDocument(
  f,
  content = f.content,
  saved = null,
  key = randomUUID(),
  client = f.client,
) {
  return rpc(client, "supply_draft_command", {
    p_patient: f.patient,
    p_kind: "BAL",
    p_purpose: f.purpose,
    p_target: f.document.id,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: key,
    p_body: {
      action: "save",
      content,
      navigation: { version: 1, stage: "bal_" + f.purpose },
    },
  });
}
export const balDocumentPacket = (f, saved, key = randomUUID()) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: f.document.id,
  p_key: key,
  p_body: {
    action: f.purpose === "assign_recount" ? "assign_recount" : "approve",
    expectedVersion: f.document.version,
    body: f.body,
  },
});
export const balDocumentFacts = (f) =>
  sql(
    `select jsonb_build_object('doc',(select to_jsonb(d) from public.operational_documents d where id=${q(f.document.id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${q(f.document.id)}),'reviews',(select jsonb_agg(to_jsonb(r) order by id) from public.balance_reviews r where document_id=${q(f.document.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}),'cycles',(select jsonb_agg(to_jsonb(c) order by id) from public.bal_cycles c where care_recipient_id=${q(f.patient)}),'assignments',(select jsonb_agg(to_jsonb(a) order by id) from public.bal_assignments a where care_recipient_id=${q(f.patient)}));`,
  );
