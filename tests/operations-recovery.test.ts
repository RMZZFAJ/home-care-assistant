import { expect, it } from "vitest";
import { recoveryEvidence } from "@/lib/operations/recovery";
import type { Diagnostics } from "@/lib/operations/contracts";

const archive = "00000000-0000-4000-8000-000000000001", hash = "a".repeat(64);
const backup: Diagnostics["events"][number] = { id: archive, component: "backup", code: "BACKUP_VERIFIED", severity: "info", correlationId: archive, at: "2026-11-09T01:00:00Z", metrics: { archiveId: archive, manifestSha256: hash, files: 10, bytes: 1000 } };
const probe: typeof backup = { ...backup, id: "00000000-0000-4000-8000-000000000002", component: "recovery", code: "RECOVERY_PROBE_VERIFIED", at: "2026-11-09T02:00:00Z" };
// The consumer receives diagnostics parsed by operationsDiagnostics at its boundary.
function report(events: Diagnostics["events"], components: Diagnostics["components"] = []) {
  return recoveryEvidence({ events, components } as Diagnostics);
}

it("matches the latest scoped copy and isolated report without modifying their source", () => {
  const events = structuredClone([backup, probe]), before = JSON.stringify(events);
  expect(report(events)).toMatchObject({ compatible: true, backupVerified: true, probeVerified: true });
  expect(JSON.stringify(events)).toBe(before);
});
it("does not borrow an older successful backup after a newer failure or retention alert", () => {
  for (const code of ["BACKUP_FAILURE", "BACKUP_LATE", "BACKUP_RETENTION"] as const) {
    const result = report([backup, probe, { ...backup, code, at: "2026-11-09T03:00:00Z", metrics: {} }]);
    expect(result.backup?.code).toBe(code); expect(result.compatible).toBe(false);
  }
});
it("does not borrow an older probe after the latest failed attempt", () => {
  const result = report([probe, backup, { ...probe, code: "RECOVERY_FAILURE", at: "2026-11-09T03:00:00Z", metrics: {} }]);
  expect(result.probe?.code).toBe("RECOVERY_FAILURE"); expect(result.compatible).toBe(false);
});
it.each([
  { archiveId: "00000000-0000-4000-8000-000000000003" }, { manifestSha256: "b".repeat(64) }, { files: 11 }, { bytes: 1001 }, { files: 0 }, { archiveId: undefined }, { manifestSha256: undefined },
])("rejects different or incomplete probe evidence: %j", metrics => {
  expect(report([backup, { ...probe, metrics: { ...probe.metrics, ...metrics } }]).compatible).toBe(false);
});
it("does not confirm an older probe or observations missing from the recent window", () => {
  expect(report([backup, { ...probe, at: "2026-11-09T00:00:00Z" }]).compatible).toBe(false);
  for (const component of ["backup", "recovery"] as const) expect(report([backup, probe], [{ component, observedAt: "2026-11-09T03:00:00Z", successAt: null, state: "attention" }]).compatible).toBe(false);
  expect(report([])).toMatchObject({ backup: null, probe: null, compatible: false });
});
it("refuses success codes attributed to another component", () => {
  expect(report([{ ...backup, component: "application" }, probe]).compatible).toBe(false);
});
it("cannot promote a copy lacking its own authenticated manifest or positive counts", () => {
  for (const metrics of [{}, { ...backup.metrics, bytes: 0 }, { ...backup.metrics, files: undefined }, { ...backup.metrics, manifestSha256: undefined }]) {
    expect(report([{ ...backup, metrics }, probe]).compatible).toBe(false);
  }
});
