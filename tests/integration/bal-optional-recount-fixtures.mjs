import { legacyBalance } from "./bal-review-fixtures.mjs";
import { shiftWorker, shiftCommand, localToday } from "./shift-fixtures.mjs";
import { actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export async function optionalLegacyRecount() {
  const f = await legacyBalance({ policy: "optional", quantity: "2" });
  const family = await actor("family", f.patient),
    pro = await shiftWorker(f.patient),
    today = localToday();
  sql(
    `update public.profiles set full_name='Sheila fictícia, reconto legado' where id=${sqlLiteral(pro.id)};`,
  );
  const type = await shiftCommand(f.admin, f.patient, "type", {
    name: "Plantão real do reconto legado",
    startsLocal: "00:00",
    durationMinutes: 1440,
  });
  await shiftCommand(f.admin, f.patient, "series", {
    professionalId: pro.id,
    shiftTypeId: type.id,
    timezone: "America/Sao_Paulo",
    recurrence: "once",
    weekdays: [],
    anchorDate: today,
    validUntil: today,
    notes: "Janela explícita para reconto da contagem legada",
  });
  const source = await rpc(family, "balance_recount_context", {
    p_id: f.document.id,
  });
  return {
    ...f,
    family,
    pro,
    source,
    target: source.targets.find((row) => row.professional_id === pro.id),
  };
}
