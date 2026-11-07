import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/consumption/route";
import { ApiError, databaseError } from "@/lib/server/api";
import {
  consumptionCommand,
  consumptionFilters,
} from "@/lib/validation/consumption";
const id = "20000000-0000-4000-8000-000000000001";
const request = (body: unknown) =>
  new Request("https://care.example/api/consumption", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://care.example",
    },
    body: JSON.stringify(body),
  });
describe("versioned consumption boundary", () => {
  it("rejects implicit decisions, edited confirmation quantities and forged authors before authentication", async () => {
    const base = {
      action: "confirm",
      id,
      accept: true,
      expectedVersion: 1,
      idempotencyKey: id,
    };
    for (const input of [
      { ...base, accept: null },
      { action: "confirm", id, accept: true },
      { ...base, lines: [{ productId: "material", quantity: "9" }] },
      { ...base, actorId: id },
      { ...base, accept: false },
      { ...base, reason: "Texto que não pertence a uma confirmação" },
    ]) {
      const response = await POST(request(input));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("keeps textual decimal precision and rejects duplicate material, zero and invalid periods", () => {
    const input = {
      action: "supplement",
      id,
      text: "Esclarecimento próprio",
      expectedVersion: 2,
      idempotencyKey: id,
      lines: [{ productId: "material", quantity: "0,000001", unit: "unidade" }],
    };
    expect(consumptionCommand.parse(input)).toMatchObject({
      lines: [{ quantity: "0.000001" }],
    });
    expect(
      consumptionCommand.safeParse({
        ...input,
        lines: [...input.lines, ...input.lines],
      }).success,
    ).toBe(false);
    expect(
      consumptionCommand.safeParse({
        ...input,
        lines: [{ productId: "material", quantity: "0" }],
      }).success,
    ).toBe(false);
    expect(
      consumptionCommand.safeParse({
        ...input,
        lines: [{ productId: "material", quantity: "1.0000001" }],
      }).success,
    ).toBe(false);
    expect(
      consumptionFilters.safeParse({ from: "2026-11-06", to: "2026-11-05" })
        .success,
    ).toBe(false);
  });
  it("classifies changed structure and opposite decisions as conflicts, and missing structure as a complement task", () => {
    for (const message of [
      "consumption decision conflict",
      "stale consumption report",
      "structured consumption supplement required",
    ]) {
      try {
        databaseError({ code: "P0001", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          code: message.includes("required")
            ? "VALIDATION_ERROR"
            : "VERSION_CONFLICT",
          status: message.includes("required") ? 400 : 409,
        });
        expect((error as Error).message).not.toMatch(
          /recontagem|nova contagem/i,
        );
      }
    }
  });
});
