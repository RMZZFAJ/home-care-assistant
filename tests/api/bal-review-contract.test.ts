import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/documents/[id]/route";
import { supplyCommandSchema } from "@/lib/validation/documents";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const command = (body: unknown) => ({
  action: "approve",
  body,
  idempotencyKey: id,
  expectedVersion: 3,
});
describe("independent BAL review boundary", () => {
  it("preserves a 2000-unit own comment and accepts the old group-only contract", () => {
    for (const body of [
      { group: "family" },
      {
        group: "supervisor",
        comment: "😀".repeat(1000),
        reviewReference: "ab".repeat(32),
      },
    ]) {
      const parsed = supplyCommandSchema.parse(command(body));
      expect(parsed.body).toEqual(body);
    }
  });
  it("rejects oversized or null comments, forged count authorship and malformed reference before authentication", async () => {
    for (const change of [
      { comment: "a".repeat(2001) },
      { comment: "😀".repeat(1001) },
      { comment: null },
      { counterId: id },
      { counterNotes: "Substituição indevida" },
      { group: "reader" },
      { reviewReference: null },
      { reviewReference: "old" },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/documents/" + id, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(command({ group: "family", ...change })),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("reports changed review references as conflicts and unavailable count attribution as a validation problem", () => {
    for (const message of [
      "stale balance review reference",
      "balance review group unavailable or already reviewed",
      "balance count attribution unavailable; recount required",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          code: message.includes("attribution")
            ? "VALIDATION_ERROR"
            : "VERSION_CONFLICT",
        });
      }
    }
  });
});
