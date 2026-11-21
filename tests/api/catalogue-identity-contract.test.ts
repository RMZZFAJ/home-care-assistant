import { describe, expect, it } from "vitest";
import { catalogueIdentityCommandSchema } from "@/lib/validation/catalogue";
import { POST } from "@/app/api/catalog/identities/route";

const input = {
  careRecipientId: "20000000-0000-4000-8000-000000000001",
  productId: "material-original",
  successorId: "material-futuro",
  referenceHash: "ab".repeat(32),
  action: "retire",
  reason: "Escolha própria sem conversão de unidades",
  idempotencyKey: "40000000-0000-4000-8000-000000000001",
};
describe("catalogue identity boundary", () => {
  it("preserves two material identities and requires a reviewed own action without author, quantity or merge fields", () => {
    expect(catalogueIdentityCommandSchema.parse(input)).toEqual(input);
    for (const change of [
      { referenceHash: null },
      { successorId: input.productId },
      { action: "merge" },
      { action: "reactivate" },
      { reason: null },
      { actorId: input.careRecipientId },
      { quantity: "4" },
      { rewriteHistory: true },
    ])
      expect(
        catalogueIdentityCommandSchema.safeParse({ ...input, ...change })
          .success,
      ).toBe(false);
    expect(
      catalogueIdentityCommandSchema.safeParse({
        ...input,
        action: "reactivate",
        successorId: null,
      }).success,
    ).toBe(true);
  });
  it("rejects invalid Unicode reasons and forged identity commands before Auth", async () => {
    expect(
      catalogueIdentityCommandSchema.safeParse({
        ...input,
        reason: "😀".repeat(500),
      }).success,
    ).toBe(true);
    for (const change of [
      { reason: "😀".repeat(501) },
      { reason: "😀" },
      { referenceHash: "old" },
      { successorId: input.productId },
      { actorId: input.careRecipientId },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/catalog/identities", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, ...change }),
        }),
      );
      expect(response.status).toBe(400);
    }
  });
});
