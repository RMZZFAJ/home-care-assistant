import { randomUUID } from "node:crypto";
import { unavailableDelivery } from "./delivery-regularization-fixtures.mjs";
import { actor, fixtures, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const regularizationStages = {
  propose_regularization: "ent_regularization_proposal",
  approve_regularization: "ent_regularization_approval",
  reject_regularization: "ent_regularization_rejection",
  withdraw_regularization: "ent_regularization_withdrawal",
  record_regularization_finding: "ent_regularization_finding",
};
export const privateReason =
  "Minha apuração própria preserva a autoria e o estoque";
export async function regularizationFixture(
  purpose = "propose_regularization",
) {
  const f = await unavailableDelivery(),
    family = await actor("family", f.patient);
  let document = await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  });
  if (purpose !== "propose_regularization") {
    document = await rpc(f.admin, "supply_document_command", {
      p_id: document.id,
      p_action: "propose_regularization",
      p_body: {
        reason:
          "Proposta oficial fictícia independente do preenchimento privado",
        basis: "Contagem e limites declarados de forma fictícia",
        reviewerId: fixtures.family.id,
        ...(purpose === "record_regularization_finding"
          ? { followUpOwnerId: fixtures.adminA.id }
          : {}),
        lines: document.lines.map((line) => ({
          lineId: line.id,
          receivedQuantity:
            purpose === "record_regularization_finding" ? "0" : "1",
          returnedQuantity: "0",
          missingQuantity: "0",
        })),
      },
      p_key: randomUUID(),
      p_version: document.version,
    });
    if (purpose === "record_regularization_finding")
      document = await rpc(family, "supply_document_command", {
        p_id: document.id,
        p_action: "review_regularization",
        p_body: {
          caseId: document.deliveryRegularization.currentId,
          accept: true,
          reason: "Conferência independente preserva a parcela desconhecida",
        },
        p_key: randomUUID(),
        p_version: document.version,
      });
  }
  const role = ["approve_regularization", "reject_regularization"].includes(
    purpose,
  )
    ? "family"
    : "adminA";
  return {
    ...f,
    family,
    document,
    purpose,
    role,
    client: role === "family" ? family : f.admin,
  };
}
export function regularizationPacket(f) {
  const current = f.document.deliveryRegularization.cases.find(
    (item) => item.id === f.document.deliveryRegularization.currentId,
  );
  return {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: f.purpose,
    p_target: f.document.id,
    p_id: null,
    p_expected: null,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      navigation: { version: 1, stage: regularizationStages[f.purpose] },
      content: {
        documentVersion: f.document.version,
        fields: {
          reason: privateReason,
          basis: "Evidências próprias mantidas entre aparelhos",
          reviewerId: fixtures.family.id,
          reviewerLabel: "Familiar conferente preservado",
          followUpOwnerId: fixtures.adminA.id,
          followUpOwnerLabel: "Responsável preservado",
          caseId: current?.id ?? "",
          caseLabel: current?.proposal.reason ?? "Sem proposta anterior",
          ...Object.fromEntries(
            f.document.lines.flatMap((line) =>
              ["receivedQuantity", "returnedQuantity", "missingQuantity"].map(
                (key) => [line.id + ":" + key, "0"],
              ),
            ),
          ),
        },
        divergentIds: [],
        materials: f.document.lines.map((line) => ({
          id: line.id,
          name: line.name_snapshot,
          unit: line.unit_snapshot,
          quantityDecimals: 0,
        })),
      },
    },
  };
}
export function regularizationBody(f) {
  if (f.purpose === "propose_regularization")
    return {
      reason: privateReason,
      basis: "Evidências próprias mantidas entre aparelhos",
      reviewerId: fixtures.family.id,
      followUpOwnerId: fixtures.adminA.id,
      lines: f.document.lines.map((line) => ({
        lineId: line.id,
        receivedQuantity: "0",
        returnedQuantity: "0",
        missingQuantity: "0",
      })),
    };
  const caseId = f.document.deliveryRegularization.currentId;
  return f.purpose === "record_regularization_finding"
    ? { caseId, text: privateReason }
    : {
        caseId,
        reason: privateReason,
        ...(["approve_regularization", "reject_regularization"].includes(
          f.purpose,
        )
          ? { accept: f.purpose === "approve_regularization" }
          : {}),
      };
}
export function regularizationCommit(f, saved, body = regularizationBody(f)) {
  return {
    p_id: saved.id,
    p_expected: saved.revision,
    p_target: f.document.id,
    p_key: randomUUID(),
    p_body: {
      action: ["approve_regularization", "reject_regularization"].includes(
        f.purpose,
      )
        ? "review_regularization"
        : f.purpose,
      body,
      expectedVersion: f.document.version,
    },
  };
}
export const regularizationRead = (client, f) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: f.purpose,
    p_target: f.document.id,
  });
export const regularizationFacts = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where d.id=${q(f.document.id)}),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.document_events e where e.document_id=${q(f.document.id)}),'stock',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from public.stock_movements m where m.care_recipient_id=${q(f.patient)}),'cases',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.delivery_regularizations r where r.document_id=${q(f.document.id)}),'findings',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from public.delivery_regularization_findings x where x.care_recipient_id=${q(f.patient)}));`,
  );
