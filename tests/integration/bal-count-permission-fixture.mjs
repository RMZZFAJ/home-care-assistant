import { randomUUID } from "node:crypto";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { balanceSetup, dayOffset, shiftCommand, shiftWorker } from "./shift-fixtures.mjs";
import { rpc } from "./v4-fixtures.mjs";

export async function countPermissionFixture() {
  const fixture = await balanceSetup({ stableCurrentWindow: true });
  const substitute = await shiftWorker(fixture.patient);
  const name = "Marisa Fonseca";
  sql(`update public.profiles set full_name=${q(name)} where id=${q(substitute.id)}`);
  return { ...fixture, substitute, substituteName: name };
}

export const countPermissionWorkspace = (client, patient) => rpc(client, "balance_workspace", { p_patient: patient });

export function publishReplacementShift(fixture) {
  return shiftCommand(fixture.admin, fixture.patient, "series", {
    professionalId: fixture.substitute.id, shiftTypeId: fixture.type.id, timezone: "America/Sao_Paulo",
    recurrence: "weekly", weekdays: [0,1,2,3,4,5,6], anchorDate: fixture.today,
    validUntil: dayOffset(fixture.today, 2), notes: "Plantão real da profissional substituta na residência fictícia",
  });
}

export function countPermissionCommand(client, patientId, targetId, action, expectedVersion, referenceHash, body, key = randomUUID()) {
  return client.rpc("execute_balance_decision", {
    p_patient: patientId, p_target: targetId, p_key: key,
    p_intention: { domain: "balance_workspace", action, expectedVersion, referenceHash, body },
  });
}
