import { describe, expect, it } from "vitest";
import { scheduleCommandSchema } from "@/lib/validation/schedules";
import { POST } from "@/app/api/schedules/route";
import { databaseError, ApiError } from "@/lib/server/api";
const id = "10000000-0000-4000-8000-000000000001";
const packet = {
  careRecipientId: id,
  idempotencyKey: "20000000-0000-4000-8000-000000000001",
  expectedVersion: null,
  command: {
    action: "series",
    body: {
      professionalId: id,
      shiftTypeId: id,
      shiftTypeVersion: 2,
      timezone: "America/Sao_Paulo",
      recurrence: "dates",
      weekdays: [],
      dates: ["2100-01-15", "2100-02-27"],
      anchorDate: "2100-01-15",
      validUntil: "2100-02-28",
      notes: "Duas datas distintas com um único tipo",
    },
  },
};
describe("selected shift date boundary", () => {
  it("accepts chosen dates without repeating hours and rejects missing or ambiguous calendar references", () => {
    expect(scheduleCommandSchema.parse(packet).command).toEqual(packet.command);
    for (const change of [
      { dates: [] },
      { dates: ["2100-01-15", "2100-01-15"] },
      { dates: ["2100-02-29"] },
      { dates: ["2100-03-01"] },
      { shiftTypeVersion: undefined },
      { shiftTypeVersion: "2" },
      { weekdays: [1] },
      { workHours: 12 },
      { recurrence: "weekly", weekdays: [1] },
    ])
      expect(
        scheduleCommandSchema.safeParse({
          ...packet,
          command: {
            ...packet.command,
            body: { ...packet.command.body, ...change },
          },
        }).success,
        JSON.stringify(change),
      ).toBe(false);
  });
  it("rejects invalid dates and forged actor metadata before Auth or mutation", async () => {
    for (const change of [
      { dates: ["tomorrow"] },
      { dates: ["2100-01-15"], ownerId: id },
      { dates: ["2100-01-15"], actorId: id },
    ]) {
      const response = await POST(
        new Request("https://care.example/api/schedules", {
          method: "POST",
          headers: {
            origin: "https://care.example",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ...packet,
            command: {
              ...packet.command,
              body: { ...packet.command.body, ...change },
            },
          }),
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("reports a changed reviewed type as a schedule version conflict", () => {
    try {
      databaseError({
        code: "PT409",
        message: "stale schedule type reference",
      });
      throw new Error("The stale type must fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
    }
  });
});
