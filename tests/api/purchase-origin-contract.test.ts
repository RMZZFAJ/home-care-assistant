import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/documents/route";
import { createSupplySchema } from "@/lib/validation/documents";
import { databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001",
  input = {
    careRecipientId: id,
    type: "COM",
    idempotencyKey: id,
    payload: { lines: [{ productId: "fralda", quantity: "2" }] },
  };
describe("explicit acquisition origin", () => {
  it("rejects omitted or malformed official origin at the API boundary before authentication", async () => {
    for (const origin of [undefined, null, "", true, "other"]) {
      const response = await POST(
        new Request("https://care.example/api/documents", {
          method: "POST",
          headers: {
            origin: "https://care.example",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ...input,
            payload: { ...input.payload, origin },
          }),
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("allows an unknown draft and explicit purchase/donation without adding financial fields", () => {
    expect(
      createSupplySchema.safeParse({ ...input, draft: true }).success,
    ).toBe(true);
    for (const origin of ["purchase", "donation"])
      expect(
        createSupplySchema.safeParse({
          ...input,
          payload: { ...input.payload, origin },
        }).success,
      ).toBe(true);
  });
  it("returns a safe editable-choice error for direct RPC rejection", () => {
    expect(() =>
      databaseError({ code: "22023", message: "purchase origin required" }),
    ).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR", status: 400 }),
    );
  });
});
