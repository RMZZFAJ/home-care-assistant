import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/documents/[id]/route";
import { ApiError, databaseError } from "@/lib/server/api";

const id = "20000000-0000-4000-8000-000000000001";
const request = (action: string, body: unknown) => new Request("https://care.example/api/documents/" + id, { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body: JSON.stringify({ action, body, idempotencyKey: id, expectedVersion: 2 }) });
describe("COM parcel and expectation boundary", () => {
  it("rejects edited receipt quantities and absent/forged closure consent before authentication", async () => {
    for (const [action, body] of [
      ["validate_receipt", { receiptId: id, quantity: "8" }],
      ["validate_receipt", { receiptId: id, lines: [{ lineId: id, quantity: "8" }] }],
      ["reject_receipt", { receiptId: id, reason: null }],
      ["close_expectation", { reason: "Encerrar a expectativa", confirmed: false }],
      ["close_expectation", { reason: "Encerrar a expectativa", confirmed: true, waivedQuantity: "8" }],
      ["close_expectation", { reason: "Encerrar a expectativa", confirmed: true, actorId: id }],
    ] as const) {
      const response = await POST(request(action, body), { params: Promise.resolve({ id }) }); expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("explains an ineligible expectation without requesting a stock recount or deletion", () => {
    for (const message of ["no purchase expectation remaining", "purchase has acquisition or receipt facts"]) {
      try { databaseError({ code: "23514", message }); expect.unreachable(); }
      catch (error) { expect(error).toBeInstanceOf(ApiError); expect(error).toMatchObject({ code: "VALIDATION_ERROR", status: 400, retryable: false }); expect((error as Error).message).not.toMatch(/recontagem|nova contagem/i); }
    }
  });
});
