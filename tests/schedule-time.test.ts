import { describe, expect, it } from "vitest";
import {
  civilInstant,
  editedCivilInstant,
  localMinute,
} from "@/lib/schedules/time";
describe("patient civil time", () => {
  it("converts an overnight Brazilian shift independently of the device zone", () => {
    expect(civilInstant("2026-11-02T19:00", "America/Sao_Paulo")).toBe(
      "2026-11-02T22:00:00.000Z",
    );
    expect(localMinute("2026-11-03T10:00:00Z", "America/Sao_Paulo")).toBe(
      "2026-11-03T07:00",
    );
  });
  it("rejects a civil instant skipped by a timezone transition", () => {
    expect(() => civilInstant("2026-03-08T02:30", "America/New_York")).toThrow(
      "não existe",
    );
  });
  it("preserves native seconds and microseconds when the displayed minute is unchanged", () => {
    const original = "2026-11-02T22:00:37.123456+00:00";
    expect(
      editedCivilInstant("2026-11-02T19:00", original, "America/Sao_Paulo"),
    ).toBe(original);
    expect(
      editedCivilInstant("2026-11-02T20:00", original, "America/Sao_Paulo"),
    ).toBe("2026-11-02T23:00:00.000Z");
  });
  it("keeps either native instant of a repeated civil minute rather than changing the chosen offset", () => {
    for (const original of [
      "2026-11-01T01:30:19-04:00",
      "2026-11-01T01:30:19-05:00",
    ]) {
      expect(
        editedCivilInstant("2026-11-01T01:30", original, "America/New_York"),
      ).toBe(original);
    }
  });
  it("still rejects a newly selected skipped minute", () => {
    expect(() =>
      editedCivilInstant(
        "2026-03-08T02:30",
        "2026-03-08T06:30:00Z",
        "America/New_York",
      ),
    ).toThrow("não existe");
  });
});
