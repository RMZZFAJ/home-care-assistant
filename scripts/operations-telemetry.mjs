import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { externalOperatorPath } from "./operator-files.mjs";
import { verifyBackup } from "./backup-archive.mjs";

function endpoint(value) {
  const url = new URL(value);
  const approved = url.protocol === "https:" && url.hostname === "qwfrqychokvhdzakibid.supabase.co" && !url.port || url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "54321";
  if (!approved || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid telemetry destination.");
  return new URL("/rest/v1/rpc/record_operations_event", url);
}

/** Optional internal adapter. Reporting cannot turn a failed backup into success
 * or turn a reporting failure into loss of an already verified archive. */
export async function reportOperatorEvent(config, event, transport = fetch) {
  if (!config || config.enabled === false) return "disabled";
  try {
    if (config.enabled !== true || Object.keys(config).some(key => !["enabled", "url", "serviceKeyFile"].includes(key))) return "unconfirmed";
    const destination = endpoint(config.url);
    const key = (await readFile(await externalOperatorPath(config.serviceKeyFile), "utf8")).trim();
    if (!key || key.length > 8192 || /[\r\n]/.test(key)) return "unconfirmed";
    const response = await transport(destination, { method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ p_event: event }), signal: AbortSignal.timeout(3000) });
    if (!response.ok) return "unconfirmed";
    const data = await response.json();
    return data?.recorded === true && data.idempotencyKey === event.idempotencyKey ? "confirmed" : "unconfirmed";
  } catch { return "unconfirmed"; }
}

export async function reportVerifiedBackup(config, receipt, key, transport) {
  if (!config || config.enabled === false) return "disabled";
  try {
    if (receipt.state !== "verified" || !receipt.archivePath || !Number.isFinite(Date.parse(receipt.at))) return "unconfirmed";
    const verified = await verifyBackup({ directory: receipt.archivePath, key, includeMetadata: true });
    if (verified.backupId !== receipt.backupId || verified.manifestSha256 !== receipt.manifestSha256 || verified.files !== receipt.files || verified.bytes !== receipt.bytes) return "unconfirmed";
    if (verified.metadata?.project !== "qwfrqychokvhdzakibid" || verified.metadata.requestedAt !== receipt.at || !Number.isInteger(verified.metadata.migrationsMatched) || verified.metadata.migrationsMatched < 1 || verified.metadata.stableTablesMatchedAcrossCapture !== true) return "unconfirmed";
    const event = { environment: "operator", component: "backup", code: "BACKUP_VERIFIED", idempotencyKey: receipt.backupId, correlationId: receipt.backupId, observedAt: verified.metadata.requestedAt, metrics: { archiveId: verified.backupId, manifestSha256: verified.manifestSha256, files: verified.files, bytes: verified.bytes, sourceMigrations: verified.metadata.migrationsMatched, retentionComplete: receipt.retentionComplete === true } };
    const result = await reportOperatorEvent(config, event, transport);
    if (receipt.retentionComplete === false) await reportOperatorEvent(config, { ...event, code: "BACKUP_RETENTION", idempotencyKey: randomUUID(), metrics: { count: 1 } }, transport);
    return result;
  } catch { return "unconfirmed"; }
}

export function reportBackupFailure(config) {
  const id = randomUUID();
  return reportOperatorEvent(config, { environment: "operator", component: "backup", code: "BACKUP_FAILURE", idempotencyKey: id, correlationId: id, observedAt: new Date().toISOString(), metrics: { count: 1 } });
}

export function reportRecoveryProbe(config, result) {
  if (!config || config.enabled === false) return Promise.resolve("disabled");
  if (result.verified !== true || result.stableTableDigestsMatched !== true || result.foreignKeysChecked !== true || result.cronEnabled !== false || result.networkExtensionEnabled !== false || result.operationalRecoveryGate !== "D6_NOT_SATISFIED_BY_THIS_PROBE" || !Number.isInteger(result.restoredTables) || result.restoredTables < 1) return Promise.resolve("unconfirmed");
  const id = randomUUID();
  return reportOperatorEvent(config, { environment: "operator", component: "recovery", code: "RECOVERY_PROBE_VERIFIED", idempotencyKey: id, correlationId: id, observedAt: new Date().toISOString(), metrics: { archiveId: result.backupId, manifestSha256: result.manifestSha256, files: result.files, bytes: result.bytes } });
}

export function reportRecoveryFailure(config) {
  const id = randomUUID();
  return reportOperatorEvent(config, { environment: "operator", component: "recovery", code: "RECOVERY_FAILURE", idempotencyKey: id, correlationId: id, observedAt: new Date().toISOString(), metrics: { count: 1 } });
}
