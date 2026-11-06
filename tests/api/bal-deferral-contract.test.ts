import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/balances/route";
import { balanceCommandSchema } from "@/lib/validation/balances";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const packet = (body: unknown) => ({
  careRecipientId: id,
  command: { action: "decide_deferral", body },
  idempotencyKey: id,
  expectedVersion: null,
});
describe("BAL deferral decision boundary", () => {
  it("accepts a real boolean and a 1000-unit own reason without an editable destination", () => {
    const body = { id, approve: false, reason: "😀".repeat(500) };
    expect(balanceCommandSchema.parse(packet(body)).command.body).toEqual(body);
  });
  it("rejects null or coercible decisions, destination/authorship overrides and oversized own reasons before Auth", async () => {
    for (const change of [
      { approve: null },
      { approve: "false" },
      { targetShiftId: id },
      { decidedBy: id },
      { reason: null },
      { reason: "😀".repeat(501) },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/balances", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            packet({
              id,
              approve: false,
              reason: "Recusa legítima com motivo próprio",
              ...change,
            }),
          ),
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("explains obsolete or already decided proposals as version conflicts without prescribing a stock recount", () => {
    for (const message of [
      "obsolete balance deferral target or assignment",
      "balance deferral already decided or superseded",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
        expect((error as Error).message).not.toMatch(
          /estoque mudou|nova contagem/i,
        );
      }
    }
  });
});
