import { expect, it } from "vitest";
import { consumptionFollowUp, consumptionLocationLabel, consumptionReadStampMatches, mergeConsumptionRead } from "@/lib/consumption/follow-up";
import type { ConsumptionReport } from "@/types/consumption";

const stamp = { id: "report", care_recipient_id: "patient", version: 2, status: "reported" as const };
const report = { kind: "consumption" as const, location: "FAMILY" as const, status: "reported" as ConsumptionReport["status"], current_lines: [], movements: [] };

it("a delayed read cannot erase a committed supplement", () => {
  const current = Object.freeze(stamp), older = Object.freeze({ ...stamp, version: 1 });
  expect(mergeConsumptionRead(current, older)).toBe(current);
  expect(mergeConsumptionRead(older, current)).toBe(current);
});
it.each(["confirmed", "rejected"] as const)("a delayed reported snapshot cannot reopen the same version after %s", status => {
  const current = { ...stamp, status };
  expect(mergeConsumptionRead(current, { ...stamp })).toBe(current);
  expect(mergeConsumptionRead({ ...stamp }, current)).toBe(current);
  expect(mergeConsumptionRead(current, { ...stamp, version: 3 })).toBe(current);
});
it("preserves the immutable decision but accepts fresh detail for the same terminal fact", () => {
  const current = { ...stamp, status: "confirmed" as const };
  expect(mergeConsumptionRead(current, { ...stamp, status: "rejected" as const })).toBe(current);
  const fresh = { ...current };
  expect(mergeConsumptionRead(current, fresh)).toBe(fresh);
  expect(mergeConsumptionRead(null, fresh)).toBe(fresh);
});
it("does not carry another report or patient into the selected read", () => {
  const next = { ...stamp, id: "other" };
  expect(mergeConsumptionRead({ ...stamp, version: 3 }, next)).toBe(next);
  expect(consumptionReadStampMatches(next, stamp.id, stamp.care_recipient_id)).toBe(false);
  expect(consumptionReadStampMatches({ ...stamp, care_recipient_id: "other" }, stamp.id, stamp.care_recipient_id)).toBe(false);
  expect(consumptionReadStampMatches(stamp, stamp.id, stamp.care_recipient_id)).toBe(true);
});
it("ordering requires a valid positive native version and known state", () => {
  for (const version of [0, -1, 1.5, NaN, Infinity, 2147483648, "2" as unknown as number])
    expect(consumptionReadStampMatches({ ...stamp, version }, stamp.id, stamp.care_recipient_id)).toBe(false);
  expect(consumptionReadStampMatches({ ...stamp, status: "future" as ConsumptionReport["status"] }, stamp.id, stamp.care_recipient_id)).toBe(false);
  expect(consumptionReadStampMatches(undefined, stamp.id, stamp.care_recipient_id)).toBe(false);
});
it("text-only consumption needs a supplement, while a structured version awaits custody review", () => {
  expect(consumptionFollowUp(report)).toMatchObject({ pending: true, heading: "Completar os materiais do consumo" });
  const lines = [{ productId: "material", name: "Material", unit: "unidade", quantity: "2" }];
  expect(consumptionFollowUp({ ...report, current_lines: lines }).heading).toBe("Conferir o consumo da família");
  expect(consumptionFollowUp({ ...report, current_lines: lines, location: "CARE_TEAM" }).heading).toBe("Conferir o consumo da equipe");
});
it("a shortage and its confirmation are never described as a stock debit", () => {
  expect(consumptionFollowUp({ ...report, kind: "shortage" })).toMatchObject({ pending: true, heading: "Conferir a falta, sem desconto" });
  const confirmed = consumptionFollowUp({ ...report, kind: "shortage", status: "confirmed" });
  expect(confirmed).toMatchObject({ pending: false, heading: "Consultar a falta conferida" });
  expect(confirmed.description).toContain("sem desconto de estoque");
});
it("missing movement evidence does not prove zero or a custody source", () => {
  const missing = consumptionFollowUp({ ...report, status: "confirmed" });
  expect(missing).toMatchObject({ pending: false, heading: "Consultar os movimentos da confirmação" });
  expect(missing.description).toContain("não foi tratada como zero");
  expect(consumptionLocationLabel("FAMILY")).toBe("Família");
  expect(consumptionLocationLabel("CARE_TEAM")).toBe("Equipe");
  expect(consumptionLocationLabel("TRANSIT")).toBe("Custódia não identificada");
});
it("confirmed movement and rejection direct to preserved facts rather than another decision", () => {
  expect(consumptionFollowUp({ ...report, status: "confirmed", movements: [{ id: "movement", productId: "material", quantity: "2", source: "FAMILY", destination: null, createdAt: "2026-11-11T00:00:00Z" }] })).toMatchObject({ pending: false, heading: "Consultar o consumo confirmado" });
  expect(consumptionFollowUp({ ...report, status: "rejected" })).toMatchObject({ pending: false, heading: "Consultar a rejeição do relato" });
});
