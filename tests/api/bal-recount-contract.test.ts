import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/balances/route";
import { GET } from "@/app/api/balances/recount/route";
import { balanceCommandSchema } from "@/lib/validation/balances";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const body = {
  documentId: id,
  targetShiftId: id,
  targetShiftVersion: 1,
  referenceHash: "a".repeat(64),
  reason: "Reconto com designação explícita",
};
const packet = (change = {}) => ({
  careRecipientId: id,
  command: { action: "assign_recount", body: { ...body, ...change } },
  idempotencyKey: id,
  expectedVersion: 2,
});
describe("BAL recount designation boundary", () => {
  it("accepts a frozen target version and source without client authorship", () => {
    expect(
      balanceCommandSchema.parse(packet({ targetShiftVersion: 2147483647 }))
        .command.body,
    ).toMatchObject({ targetShiftVersion: 2147483647 });
  });
  it("rejects absent, coercible or out-of-range versions and forged authorship before Auth", async () => {
    for (const change of [
      { targetShiftVersion: undefined },
      { targetShiftVersion: null },
      { targetShiftVersion: "1" },
      { targetShiftVersion: 0 },
      { targetShiftVersion: 2147483648 },
      { referenceHash: "" },
      { referenceHash: null },
      { designerId: id },
      { professionalId: id },
      { reason: "😀".repeat(501) },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/balances", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(packet(change)),
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("rejects missing and invalid document identifiers on the read endpoint", async () => {
    for (const query of ["", "?documentId=invalid"]) {
      const response = await GET(
        new Request("https://care.example/api/balances/recount" + query),
      );
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toMatch(/no-store/);
    }
  });
  it("classifies designation conflicts as a comparison of the actual count and target", () => {
    for (const message of [
      "stale recount assignment reference",
      "stale recount target shift",
      "another recount assignment is active",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
        expect((error as Error).message).toMatch(/Compare a referência/);
      }
    }
  });
});
