import { randomUUID } from "node:crypto";
import {
  balanceSetup,
  balanceCommand,
  shiftWorker,
  shiftCommand,
  localToday,
} from "./shift-fixtures.mjs";
import { deferralFixture, deferralState } from "./bal-deferral-fixtures.mjs";
import { setup, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const preparationPurposes = [
  "configure",
  "assign",
  "request_deferral",
  "defer",
  "approve_deferral",
  "reject_deferral",
];
export async function preparationFixture(purpose) {
  let f;
  if (purpose === "assign") {
    f = await setup();
    const first = await shiftWorker(f.patient),
      second = await shiftWorker(f.patient),
      today = localToday();
    sql(`update public.profiles set full_name='Primeira profissional fictícia da atribuição' where id=${q(first.id)};
      update public.profiles set full_name='Segunda profissional fictícia da atribuição' where id=${q(second.id)};`);
    const type = await shiftCommand(f.admin, f.patient, "type", {
      name: "Cobertura simultânea para preparação",
      startsLocal: "00:00",
      durationMinutes: 1440,
    });
    for (const pro of [first, second])
      await shiftCommand(f.admin, f.patient, "series", {
        professionalId: pro.id,
        shiftTypeId: type.id,
        timezone: "America/Sao_Paulo",
        recurrence: "once",
        weekdays: [],
        anchorDate: today,
        validUntil: today,
        notes: "Atribuição explicitamente pendente",
      });
    await balanceCommand(f.admin, f.patient, "configure", {
      enabled: true,
      timezone: "America/Sao_Paulo",
      weekday: new Date(today + "T12:00:00Z").getUTCDay(),
      shiftTypeId: type.id,
      startsOn: today,
      reason: "Preparar cobertura ambígua autorizada",
    });
    f.pro = first;
  } else
    f =
      purpose.endsWith("_deferral") && purpose !== "request_deferral"
        ? await deferralFixture(false)
        : await balanceSetup();
  const client = purpose === "request_deferral" ? f.pro.client : f.admin;
  const w = await rpc(client, "balance_workspace", { p_patient: f.patient }),
    a = w.eligibility.assignment,
    r = w.regime;
  const targetResourceId =
    purpose === "configure"
      ? f.patient
      : purpose === "assign"
        ? w.obligations.find((o) => o.state === "pending").cycle_id
        : purpose === "approve_deferral" || purpose === "reject_deferral"
          ? f.proposal.id
          : a.id;
  const scope = {
    p_patient: f.patient,
    p_purpose: purpose,
    p_target: targetResourceId,
  };
  const source = await rpc(client, "balance_preparation_reference", scope);
  const target =
    purpose === "assign"
      ? w.targets.find((t) => t.professional_id === f.pro.id)
      : w.targets.find(
          (t) => Date.parse(t.starts_at) >= Date.parse(a?.ends_at ?? ""),
        );
  const values = {
    reason: "  Minha justificativa pessoal preservada 🩺 \n  ",
    enabled: "false",
    weekday: String(r.weekday),
    shiftTypeId: r.shift_type_id,
    shiftTypeLabel: w.types.find((t) => t.id === r.shift_type_id).name,
    professionalId: r.designated_professional_id ?? "",
    professionalLabel: "",
    timezone: r.timezone,
    startsOn: r.starts_on,
    targetShiftId: target?.id ?? "",
    targetShiftLabel: target?.professional_name ?? "",
    targetShiftQuery: "Busca própria ainda incompleta",
  };
  const referenceVersion =
    purpose === "configure"
      ? r.version
      : purpose === "defer" || purpose === "request_deferral"
        ? a.version
        : null;
  const content = {
      values,
      referenceHash: source.referenceHash,
      referenceVersion,
    },
    reason = values.reason.trim();
  const command =
    purpose === "configure"
      ? {
          action: purpose,
          body: {
            enabled: false,
            weekday: r.weekday,
            shiftTypeId: r.shift_type_id,
            professionalId: r.designated_professional_id ?? null,
            timezone: r.timezone,
            startsOn: r.starts_on,
            reason,
          },
        }
      : purpose === "assign"
        ? {
            action: purpose,
            body: {
              cycleId: targetResourceId,
              targetShiftId: target.id,
              reason,
            },
          }
        : purpose === "request_deferral" || purpose === "defer"
          ? {
              action: purpose,
              body: {
                assignmentId: targetResourceId,
                targetShiftId: target.id,
                reason,
              },
            }
          : {
              action: "decide_deferral",
              body: {
                id: targetResourceId,
                approve: purpose === "approve_deferral",
                reason,
              },
            };
  return {
    ...f,
    client,
    scope,
    source,
    content,
    command,
    purpose,
    targetResourceId,
    identity: purpose === "request_deferral" ? f.pro : fixtures.adminA,
  };
}
export const savePreparation = (
  f,
  content = f.content,
  saved = null,
  key = randomUUID(),
  client = f.client,
) =>
  rpc(client, "balance_preparation_command", {
    ...f.scope,
    p_id: saved?.id ?? null,
    p_expected: saved?.revision ?? null,
    p_key: key,
    p_body: {
      action: "save",
      content,
      navigation: { version: 1, stage: "bal_" + f.purpose },
    },
  });
export const preparationPacket = (f, saved, key = randomUUID()) => ({
  ...f.scope,
  p_id: saved.id,
  p_expected: saved.revision,
  p_key: key,
  p_body: {
    command: f.command,
    referenceHash: f.content.referenceHash,
    expectedVersion: f.content.referenceVersion,
  },
});
export const preparationFacts = (f) => ({
  ...deferralState(f.patient),
  regime: JSON.parse(
    sql(
      `select coalesce((select to_jsonb(r) from public.bal_regimes r where care_recipient_id=${q(f.patient)}),'null'::jsonb);`,
    ),
  ),
  documents: JSON.parse(
    sql(
      `select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]'::jsonb) from public.operational_documents d where care_recipient_id=${q(f.patient)};`,
    ),
  ),
});
