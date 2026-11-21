import type { Diagnostics } from "./contracts";

type Event = Diagnostics["events"][number];

/** A recent, scoped report is evidence to inspect, never permission to restore. */
export function recoveryEvidence(data: Diagnostics) {
  const events = [...data.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id));
  const backup = events.find(event => event.component === "backup") ?? null;
  const probe = events.find(event => event.component === "recovery") ?? null;
  const complete = (event: Event | null) => Boolean(event?.metrics.archiveId && event.metrics.manifestSha256 && (event.metrics.files ?? 0) > 0 && (event.metrics.bytes ?? 0) > 0);
  const current = (event: Event | null, component: "backup" | "recovery") => {
    const observed = data.components.find(item => item.component === component)?.observedAt;
    return Boolean(event && (!observed || Date.parse(observed) <= Date.parse(event.at)));
  };
  const backupVerified = backup?.code === "BACKUP_VERIFIED" && complete(backup) && current(backup, "backup");
  const probeVerified = probe?.code === "RECOVERY_PROBE_VERIFIED" && complete(probe) && current(probe, "recovery");
  const sameArchive = Boolean(backup && probe && backup.metrics.archiveId === probe.metrics.archiveId && backup.metrics.manifestSha256 === probe.metrics.manifestSha256 && backup.metrics.files === probe.metrics.files && backup.metrics.bytes === probe.metrics.bytes);
  const compatible = backupVerified && probeVerified && sameArchive && Date.parse(probe!.at) >= Date.parse(backup!.at);
  return { backup, probe, backupVerified, probeVerified, compatible };
}
