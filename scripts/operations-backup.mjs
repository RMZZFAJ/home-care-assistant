import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBackup, backupStoreStatus } from "./backup-filesystem-store.mjs";
import { externalOperatorPath, inside } from "./operator-files.mjs";
import { captureRemoteBackup } from "./backup-remote-capture.mjs";
import { verifyBackup } from "./backup-archive.mjs";
import { reportVerifiedBackup, reportBackupFailure } from "./operations-telemetry.mjs";

/** Config contains paths/references only. The encryption key remains separate. */
export async function runConfiguredBackup(configFile, command) {
  if (!["scheduled", "critical", "verify"].includes(command))
    throw new Error("Choose scheduled, critical or verify.");
  const path = await externalOperatorPath(configFile),
    configBytes = await readFile(path);
  if (configBytes.length > 16_384)
    throw new Error("Invalid backup configuration.");
  const config = JSON.parse(configBytes);
  const fields = [
    "format",
    "root",
    "keyFile",
    "scheduleEnabled",
    "keepCriticalCapture",
    "source",
    "telemetry",
  ];
  if (
    config.format !== "hca-operator-backup-v1" ||
    Object.keys(config).some((k) => !fields.includes(k)) ||
    typeof config.scheduleEnabled !== "boolean" ||
    typeof config.keepCriticalCapture !== "boolean"
  )
    throw new Error("Invalid backup configuration.");
  const root = await externalOperatorPath(config.root),
    keyFile = await externalOperatorPath(config.keyFile);
  if (inside(root, keyFile) || inside(root, path))
    throw new Error(
      "Key and configuration must remain separate from the backup store.",
    );
  const key = await readFile(keyFile);
  if (key.length !== 32) throw new Error("A separate 256-bit key is required.");
  if (command === "verify") {
    const index = await backupStoreStatus({ root, key });
    if (!Object.keys(index.entries).length)
      throw new Error("No completed backups to verify.");
    for (const entry of Object.values(index.entries)) {
      const result = await verifyBackup({
        directory: resolve(root, "archives", entry.id),
        key,
      });
      if (
        result.backupId !== entry.id ||
        result.manifestSha256 !== entry.manifestSha256
      )
        throw new Error("Stored backup identity mismatch.");
    }
    return {
      state: "verified",
      archives: Object.keys(index.entries).length,
      dailySlots: Object.keys(index.daily).length,
      weeklySlots: Object.keys(index.weekly).length,
      pendingPrune: index.pendingPrune.length,
      operationalExternalBackupActive: false,
      recoveryD6Proved: false,
    };
  }
  if (
    !config.source ||
    Object.keys(config.source).some(
      (k) => !["project", "cliExecutable", "profileFile"].includes(k),
    )
  )
    throw new Error("Invalid backup source configuration.");
  let result;
  try { result = await runBackup({
    root,
    key,
    mode: command,
    scheduleEnabled: config.scheduleEnabled,
    keepCapture: command === "critical" && config.keepCriticalCapture,
    capture: (destination) =>
      captureRemoteBackup(destination, config.source, (step) =>
        process.stderr.write("Backup capture: " + step + "\n"),
      ),
  }); } catch (error) { await reportBackupFailure(config.telemetry); throw error; }
  if (result.state === "verified") result.telemetry = await reportVerifiedBackup(config.telemetry, result, key);
  return result;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [command, flag, path, ...extra] = process.argv.slice(2);
    if (flag !== "--config-file" || !path || extra.length)
      throw new Error("An external configuration file is required.");
    const result = await runConfiguredBackup(path, command);
    // Paths and diagnostics remain in the protected filesystem receipt.
    const publicReceipt = { ...result };
    delete publicReceipt.archivePath;
    delete publicReceipt.capturePath;
    console.log(JSON.stringify(publicReceipt));
  } catch {
    console.error(
      "Backup operation not confirmed. Inspect the protected configuration, capture and run receipt; no operational recovery approval.",
    );
    process.exitCode = 1;
  }
}
