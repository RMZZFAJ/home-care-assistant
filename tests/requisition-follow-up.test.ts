import { expect, it } from "vitest";
import { requisitionDeliveries, requisitionFollowUp } from "@/lib/requisitions/follow-up";

const active = {
  historical: false, status: "submitted", archivedAt: null, completedAt: null,
  scienceSatisfied: false, designationPending: false, eligible: false,
  personalScience: false, fulfilled: 0, total: 2,
};

it("routes pending and partial fulfillment to the materials, independently of science", () => {
  for (const scienceSatisfied of [true, false]) {
    const result = requisitionFollowUp({ ...active, scienceSatisfied, fulfilled: 1 });
    expect(result).toMatchObject({ pending: true, section: "materials" });
    expect(result.description).toContain("1 de 2 itens permanecem em aberto");
    expect(result.description).toContain("compra e expedição não comprovam recebimento");
  }
});
it("keeps full fulfillment distinct from required science and manual archiving", () => {
  const complete = { ...active, fulfilled: 2, completedAt: "2026-11-11T03:00:00Z" };
  const family = requisitionFollowUp({ ...complete, eligible: true });
  expect(family).toMatchObject({ pending: true, section: "workflow" });
  expect(family.heading).toContain("minha ciência");
  expect(family.description).toContain("não substitui essa ciência");
  expect(requisitionFollowUp({ ...complete, designationPending: true }).heading).toContain("designação");
  expect(requisitionFollowUp(complete).heading).toBe("Acompanhar a ciência familiar");
  const satisfied = requisitionFollowUp({ ...complete, scienceSatisfied: true });
  expect(satisfied).toMatchObject({ pending: false, section: "workflow" });
  expect(satisfied.description).toContain("ciência dispensada não atribui confirmação");
});
it.each([
  { ...active, historical: true },
  { ...active, status: "cancelled" },
  { ...active, archivedAt: "2026-11-11T03:00:00Z" },
])("terminal and historical records never solicit a current receipt or science %j", facts => {
  expect(requisitionFollowUp(facts)).toMatchObject({ pending: false, section: "history" });
});
it("does not infer completion from an empty item projection or an unrecorded lifecycle", () => {
  expect(requisitionFollowUp({ ...active, total: 0 }).description).toContain("nenhuma conclusão foi inferida");
  expect(requisitionFollowUp({ ...active, fulfilled: 2, scienceSatisfied: true }).heading).toBe("Conferir o registro de conclusão");
});
it("aggregates the same delivery per REQ item, with exact decimals and stable identities", () => {
  const a = { id: "a", code: "ENT-0001", status: "disputed", acceptedQuantity: "0.1" };
  const pending = { id: "b", code: "ENT-0002", status: "pending_receipt", acceptedQuantity: "0" };
  expect(requisitionDeliveries([pending, a, { ...a, acceptedQuantity: "0.2" }])).toEqual([
    { ...a, acceptedQuantity: "0.3" }, pending,
  ]);
});
it.each([null, "NaN", "-1", "unreadable"])("missing or invalid accepted quantity remains unknown %s", acceptedQuantity => {
  const row = { id: "a", code: null, status: "draft", acceptedQuantity };
  expect(requisitionDeliveries([row, { ...row, acceptedQuantity: "1" }])).toEqual([
    { ...row, acceptedQuantity: null },
  ]);
});
