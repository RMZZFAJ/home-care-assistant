import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { presentationCommandSchema } from "@/lib/validation/catalogue";
import { shortNameChange } from "@/lib/validation/governance";

describe("contextual field boundaries", () => {
  const req = () => ({ careRecipientId: randomUUID(), lines: [{ productId: "p1", currentStock: null, urgent: false }], extraItems: [], observations: [], idempotencyKey: randomUUID() });
  it("accepts1000 and rejects1001 without mutating the submitted observation or losing its exact path", () => {
    const valid = { ...req(), observations: ["a".repeat(1000)] }; expect(requisitionInputSchema.safeParse(valid).success).toBe(true);
    const input = { ...valid, observations: ["a".repeat(1001)] }, result = requisitionInputSchema.safeParse(input); expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["observations", 0], message: "A observação deve ter até 1.000 caracteres." }));
    expect(input.observations[0]).toHaveLength(1001);
  });
  it("keeps the extra-item name path and a meaningful Portuguese message", () => {
    const result = requisitionInputSchema.safeParse({ ...req(), extraItems: [{ id: "extra:legacy", name: "   ", currentStock: null, urgent: false }] });
    expect(result.success).toBe(false); if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["extraItems", 0, "name"], message: "Informe o nome do item." }));
  });
  it("identifies every incomplete presentation field and refuses malformed factors in Portuguese", () => {
    const base = { action: "presentation", careRecipientId: randomUUID(), id: null, referenceVersion: null, productId: "", barcode: "", name: "", baseQuantity: "", active: true, idempotencyKey: randomUUID() };
    const result = presentationCommandSchema.safeParse(base); expect(result.success).toBe(false);
    if (!result.success) { expect(new Set(result.error.issues.map(issue => issue.path[0]))).toEqual(new Set(["productId", "barcode", "name", "baseQuantity"])); expect(result.error.issues.every(issue => /Escolha|Informe/.test(issue.message))).toBe(true); }
    expect(presentationCommandSchema.safeParse({ ...base, productId: "p", name: "Pacote", barcode: "00123456", baseQuantity: "1,5" }).success).toBe(true);
  });
  it("separates keep, canonical replacement and explicit removal; blank replacement never means omission", () => {
    expect(shortNameChange("keep", "old")).toEqual({}); expect(shortNameChange("change", " Nome novo ")).toEqual({ patientShortName: "Nome novo" }); expect(shortNameChange("remove", "old")).toEqual({ patientShortName: null });
    for (const value of ["", "  ", "x".repeat(61)]) expect(() => shortNameChange("change", value)).toThrow(/1 a 60/);
    expect(() => shortNameChange("forged", "Nome")).toThrow(/Escolha/);
  });
});
