import { describe, expect, it } from "vitest";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { POST } from "@/app/api/requisitions/route";

const base = { careRecipientId: "10000000-0000-4000-8000-000000000001", lines: [{ productId: "product", productName: "Produto", category: "higiene", currentStock: 0, urgent: false }], extraItems: [], observations: [], idempotencyKey: "20000000-0000-4000-8000-000000000001" };
describe("requisition API contract", () => {
  it("requires explicit patient and supports patient catalogues larger than the legacy seed", () => {
    expect(requisitionInputSchema.safeParse({ ...base, careRecipientId: undefined }).success).toBe(false);
    expect(requisitionInputSchema.safeParse({ ...base, lines: Array.from({ length: 40 }, (_, i) => ({ ...base.lines[0], productId: `product-${i}` })) }).success).toBe(true);
  });
  it("rejects removed fields, spoofed actors and untrusted protocols before accessing storage", async () => {
    for (const body of [{ ...base, actorId: "forged" }, { ...base, protocol: "HC-000001" }, { ...base, lines: [{ ...base.lines[0], requestedQuantity: 1 }] }]) {
      const response = await POST(new Request("https://care.example/api/requisitions", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body: JSON.stringify(body) }));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("rejects cross-site JSON without touching authentication or database", async () => {
    const response = await POST(new Request("https://care.example/api/requisitions", { method: "POST", headers: { "content-type": "application/json", origin: "https://attacker.example" }, body: JSON.stringify(base) }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "INVALID_ORIGIN" });
  });
});
