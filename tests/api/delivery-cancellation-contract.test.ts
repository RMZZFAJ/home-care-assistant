import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/documents/[id]/route";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const request = (action: string, body: unknown) =>
  new Request("https://care.example/api/documents/" + id, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://care.example",
    },
    body: JSON.stringify({
      action,
      body,
      idempotencyKey: id,
      expectedVersion: 3,
    }),
  });
describe("personal versioned delivery cancellation boundary", () => {
  it("rejects editable consumed quantities, absent return and forged identity before authentication", async () => {
    const body = {
      reason: "Conciliação real",
      requestId: id,
      referenceHash: "ab".repeat(32),
      lines: [{ lineId: id, returnQuantity: "1" }],
    };
    for (const invalid of [
      { ...body, actorId: id },
      { ...body, requestId: undefined },
      { ...body, referenceHash: undefined },
      { ...body, lines: [{ ...body.lines[0], consumedQuantity: "1" }] },
      { ...body, lines: [{ lineId: id, returnQuantity: null }] },
    ]) {
      const response = await POST(request("consent_cancel", invalid), {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("requires the specific request and an own reason for withdrawal and refusal", async () => {
    for (const action of ["withdraw_cancellation", "refuse_cancellation"])
      for (const body of [
        { reason: "Decisão sem referência" },
        { requestId: id, reason: null },
        { requestId: id, reason: "Motivo legítimo", requestedBy: id },
      ]) {
        const response = await POST(request(action, body), {
          params: Promise.resolve({ id }),
        });
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          code: "VALIDATION_ERROR",
        });
      }
  });
  it("reports source changes as a review conflict and unavailable evidence as a read problem", () => {
    for (const message of [
      "delivery cancellation decision conflict",
      "stale delivery consumption reference",
      "delivery unit reference changed",
      "delivery consumption reference unavailable",
      "delivery transit requires reconciliation",
    ]) {
      try {
        databaseError({ code: "P0001", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          code: /conflict|changed|stale/.test(message)
            ? "VERSION_CONFLICT"
            : "VALIDATION_ERROR",
        });
        expect((error as Error).message).not.toMatch(
          /nova contagem|recontagem/i,
        );
      }
    }
  });
});
