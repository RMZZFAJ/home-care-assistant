import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/catalog/presentations/route";
import { createSupplySchema } from "@/lib/validation/documents";

describe("presentation factor request boundary", () => {
  it("keeps typed package intent and refuses fractional counts, forged conversion metadata and BAL conversion", () => {
    const line = {
      productId: "material",
      quantity: "20",
      manualQuantity: "0",
      presentations: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          version: 1,
          packages: "2",
        },
      ],
    };
    const input = {
      careRecipientId: "20000000-0000-4000-8000-000000000001",
      type: "COM",
      payload: { origin: "purchase", lines: [line] },
      idempotencyKey: "40000000-0000-4000-8000-000000000001",
    };
    expect(createSupplySchema.safeParse(input).success).toBe(true);
    for (const packages of ["0", "1.5", "NaN", null])
      expect(
        createSupplySchema.safeParse({
          ...input,
          payload: {
            ...input.payload,
            lines: [
              {
                ...line,
                presentations: [{ ...line.presentations[0], packages }],
              },
            ],
          },
        }).success,
      ).toBe(false);
    expect(
      createSupplySchema.safeParse({ ...input, type: "BAL" }).success,
    ).toBe(false);
    expect(
      createSupplySchema.safeParse({
        ...input,
        payload: {
          ...input.payload,
          lines: [{ ...line, metadata: { presentationConversions: [] } }],
        },
      }).success,
    ).toBe(false);
  });
  it("requires a reference version only for editing and rejects invalid versioned factors before Auth", async () => {
    const input = {
      action: "presentation",
      careRecipientId: "20000000-0000-4000-8000-000000000001",
      id: null,
      referenceVersion: null,
      productId: "material",
      barcode: "0123456789012",
      name: "Embalagem",
      baseQuantity: "10",
      active: true,
      idempotencyKey: "40000000-0000-4000-8000-000000000001",
    };
    for (const change of [
      { referenceVersion: 1 },
      { id: "30000000-0000-4000-8000-000000000001" },
      { baseQuantity: "NaN" },
      { active: null },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/catalog/presentations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, ...change }),
        }),
      );
      expect(response.status).toBe(400);
    }
  });
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
