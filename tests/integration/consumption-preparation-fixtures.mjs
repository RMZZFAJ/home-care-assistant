import { randomUUID } from "node:crypto";
import { setup, rpc } from "./v4-fixtures.mjs";
export async function consumptionPreparationFixture(
  purpose = "consumption_report_family",
) {
  const f = await setup(),
    reporting = purpose.startsWith("consumption_report_"),
    location = purpose.endsWith("team") ? "CARE_TEAM" : "FAMILY";
  const id = reporting
    ? f.patient
    : await rpc(f.admin, "report_extraordinary_consumption", {
        p_patient: f.patient,
        p_kind: "consumption",
        p_location: location,
        p_text: "Relato original fictício preservado",
        p_lines: [{ productId: f.products[0], quantity: "1" }],
        p_key: randomUUID(),
      });
  const fields = {
    kind: "consumption",
    location,
    text: "Minha declaração fictícia preservada entre sessões",
    reason:
      purpose === "consumption_reject" ? "Rejeição fictícia motivada" : "",
    reminderId: "",
    lines:
      purpose.endsWith("accept") || purpose.endsWith("reject")
        ? []
        : [
            {
              productId: f.products[0],
              name: "",
              unit: "",
              quantity: "1,000000",
            },
          ],
  };
  const scope = { p_patient: f.patient, p_purpose: purpose, p_target: id };
  const ref = await rpc(f.admin, "consumption_preparation_reference", {
    ...scope,
    p_fields: fields,
  });
  fields.lines = fields.lines.map((l) => {
    const c = ref.reference.catalog.find((c) => c.id === l.productId);
    return { ...l, name: c.name, unit: c.unit };
  });
  const content = {
    consumption: fields,
    reference: ref.reference,
    referenceHash: ref.referenceHash,
  };
  return { ...f, scope, content };
}
export function saveConsumptionPreparation(
  f,
  content = f.content,
  current = null,
  key = randomUUID(),
  client = f.admin,
) {
  return rpc(client, "consumption_preparation_command", {
    ...f.scope,
    p_id: current?.id ?? null,
    p_expected: current?.revision ?? null,
    p_key: key,
    p_body: {
      action: "save",
      content,
      navigation: { version: 1, stage: "consumption_preparation" },
    },
  });
}
export function consumptionPreparationPacket(f, saved, key = randomUUID()) {
  const v = f.content.consumption,
    p = f.scope.p_purpose,
    report = p.startsWith("consumption_report_"),
    command = report
      ? {
          action: "report",
          careRecipientId: f.patient,
          kind: v.kind,
          location: v.location,
          text: v.text.trim(),
          lines: v.lines.map(({ productId, unit, quantity }) => ({
            productId,
            unit,
            quantity: String(Number(quantity.replace(",", "."))),
          })),
          idempotencyKey: key,
          ...(v.reminderId ? { reminderId: v.reminderId } : {}),
        }
      : p === "consumption_supplement"
        ? {
            action: "supplement",
            id: f.scope.p_target,
            text: v.text.trim(),
            lines: v.lines.map(({ productId, unit, quantity }) => ({
              productId,
              unit,
              quantity: String(Number(quantity.replace(",", "."))),
            })),
            expectedVersion: f.content.reference.report.version,
            idempotencyKey: key,
          }
        : {
            action: "confirm",
            id: f.scope.p_target,
            accept: p === "consumption_accept",
            expectedVersion: f.content.reference.report.version,
            idempotencyKey: key,
            ...(p === "consumption_reject" ? { reason: v.reason.trim() } : {}),
          };
  return {
    ...f.scope,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: key,
    p_body: { command, referenceHash: f.content.referenceHash },
  };
}
