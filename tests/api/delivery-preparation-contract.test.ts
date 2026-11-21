import { describe, expect, it } from "vitest";
import { createSupplySchema } from "@/lib/validation/documents";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const input = {
  careRecipientId: id,
  type: "ENT",
  idempotencyKey: id,
  payload: {
    source: "FAMILY",
    destination: "CARE_TEAM",
    recipientId: id,
    recipientReason: "Escolha manual própria",
    recipientReference: "ab".repeat(32),
    lines: [{ productId: "fralda", quantity: "2" }],
  },
};
describe("delivery recipient preparation boundary", () => {
  it("accepts only a textual reason and a valid reference, with no client authority snapshot", () => {
    expect(createSupplySchema.safeParse(input).success).toBe(true);
    for (const override of [
      { recipientReason: null },
      { recipientReason: "x" },
      { recipientReason: "x".repeat(1001) },
      { recipientReference: "old" },
      { selectedBy: id },
      { suggestedId: id },
      { recipientSelection: { recipientId: id } },
    ])
      expect(
        createSupplySchema.safeParse({
          ...input,
          payload: { ...input.payload, ...override },
        }).success,
      ).toBe(false);
  });
  it("separates stale source from an editable reason error", () => {
    for (const [message, code] of [
      ["stale delivery recipient reference", "VERSION_CONFLICT"],
      ["recipient selection reason required", "VALIDATION_ERROR"],
    ]) {
      try {
        databaseError({ code: "P0001", message });
        throw Error("expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(code);
      }
    }
  });
});
