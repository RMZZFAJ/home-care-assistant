import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/catalog/presentations/route";

describe("presentation factor request boundary", () => {
  it("rejects forbidden factors and incomplete presentations before authentication", async () => {
    const input = {
      careRecipientId: "20000000-0000-4000-8000-000000000001",
      productId: "material",
      unit: "mL",
      decimals: 1,
      barcode: "0123456789012",
      name: "Embalagem",
      baseQuantity: "1.5",
    };
    for (const change of [
      { baseQuantity: "NaN" },
      { baseQuantity: "Infinity" },
      { baseQuantity: 0 },
      { baseQuantity: -1 },
      { baseQuantity: null },
      { baseQuantity: "0.0000001" },
      { name: undefined },
      { barcode: undefined },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/catalog/presentations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, ...change }),
        }),
      );
      expect(response.status, JSON.stringify(change)).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});
