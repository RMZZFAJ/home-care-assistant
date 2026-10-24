import { describe, expect, it } from "vitest";
import { civilInstant, localMinute } from "@/lib/schedules/time";
describe("patient civil time", () => {
  it("converts an overnight Brazilian shift independently of the device zone", () => {
    expect(civilInstant("2026-11-02T19:00", "America/Sao_Paulo")).toBe("2026-11-02T22:00:00.000Z");
    expect(localMinute("2026-11-03T10:00:00Z", "America/Sao_Paulo")).toBe("2026-11-03T07:00");
  });
  it("rejects a civil instant skipped by a timezone transition", () => {
    expect(() => civilInstant("2026-03-08T02:30", "America/New_York")).toThrow("não existe");
  });
});
