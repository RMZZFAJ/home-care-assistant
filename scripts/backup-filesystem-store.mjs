import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { sealBackup, verifyBackup } from "./backup-archive.mjs";
import {
  backupUuid,
  createOperatorDirectory,
  externalOperatorPath,
  noOperatorLinks,
  removeOperatorBackupTree,
} from "./operator-files.mjs";

const format = "hca-backup-store-v1",
  maxIndex = 2 * 1024 * 1024;
const dictionary = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function mac(key, payload) {
  const derived = createHmac("sha256", key)
    .update("hca-backup-store-index-key-v1")
    .digest();
  return createHmac("sha256", derived).update(payload).digest("hex");
}
async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
async function save(root, key, value) {
  const payload = JSON.stringify(value),
    path = join(root, "index.json"),
    temporary = join(root, randomUUID() + ".index-pending");
  if (Buffer.byteLength(payload) > maxIndex)
    throw new Error("Backup index requires operator review.");
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(
      JSON.stringify({ payload, mac: mac(key, payload) }) + "\n",
    );
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, path);
}
async function load(root, key) {
  await noOperatorLinks(join(root, "index.json"));
  const bytes = await readFile(join(root, "index.json"));
  if (bytes.length > maxIndex) throw new Error("Invalid backup index.");
  const envelope = JSON.parse(bytes),
    actual = envelope.mac;
  if (
    typeof envelope.payload !== "string" ||
    typeof actual !== "string" ||
    !/^[a-f0-9]{64}$/.test(actual) ||
    !timingSafeEqual(
      Buffer.from(actual, "hex"),
      Buffer.from(mac(key, envelope.payload), "hex"),
    )
  )
    throw new Error("Backup index authentication failed.");
  const index = JSON.parse(envelope.payload);
  if (
    index.format !== format ||
    !backupUuid(index.storeId) ||
    !dictionary(index.entries) ||
    !dictionary(index.daily) ||
    !dictionary(index.weekly) ||
    !Array.isArray(index.pendingPrune) ||
    (index.lastCompletedAt !== null &&
      (typeof index.lastCompletedAt !== "string" ||
        !Number.isFinite(Date.parse(index.lastCompletedAt))))
  )
    throw new Error("Invalid backup index structure.");
  for (const [id, entry] of Object.entries(index.entries)) {
    if (
      !backupUuid(id) ||
      entry.id !== id ||
      !["scheduled", "critical"].includes(entry.mode) ||
      !/^[a-f0-9]{64}$/.test(entry.manifestSha256)
    )
      throw new Error("Invalid backup entry.");
  }
  for (const slots of [index.daily, index.weekly])
    for (const [date, id] of Object.entries(slots)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !index.entries[id])
        throw new Error("Invalid backup retention slot.");
    }
  for (const entry of index.pendingPrune)
    if (
      !backupUuid(entry.id) ||
      !/^[a-f0-9]{64}$/.test(entry.manifestSha256) ||
      index.entries[entry.id]
    )
      throw new Error("Invalid backup prune queue.");
  return index;
}
function slot(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.valueOf()))
    throw new Error("Invalid backup clock.");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`,
    monday = new Date(day + "T12:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return {
    day,
    week: monday.toISOString().slice(0, 10),
    afterWindow: Number(parts.hour) * 60 + Number(parts.minute) >= 150,
  };
}
const keepLatest = (slots, count) =>
  Object.fromEntries(
    Object.entries(slots)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, count),
  );
async function prune(root, key, index) {
  while (index.pendingPrune.length) {
    const entry = index.pendingPrune[0],
      path = join(root, "archives", entry.id);
    if (await exists(path)) {
      const proof = await verifyBackup({ directory: path, key });
      if (
        proof.backupId !== entry.id ||
        proof.manifestSha256 !== entry.manifestSha256
      )
        throw new Error("Prune archive identity mismatch.");
      await removeOperatorBackupTree(root, "archives", entry.id);
    }
    index.pendingPrune.shift();
    await save(root, key, index);
  }
}
/** Filesystem destination contract used by the CLI; capture and time are injectable only in code. */
export async function runBackup({
  root: directory,
  key,
  capture,
  mode = "scheduled",
  scheduleEnabled = false,
  keepCapture = false,
  now = new Date(),
}) {
  if (
    !(key instanceof Uint8Array) ||
    key.length !== 32 ||
    typeof capture !== "function" ||
    !["scheduled", "critical"].includes(mode)
  )
    throw new Error("Invalid backup job configuration.");
  const root = await externalOperatorPath(directory),
    label = slot(now);
  if (!(await exists(root))) {
    await createOperatorDirectory(root);
    for (const name of ["archives", "captures", "runs"])
      await createOperatorDirectory(join(root, name));
    await save(root, key, {
      format,
      storeId: randomUUID(),
      entries: {},
      daily: {},
      weekly: {},
      pendingPrune: [],
      lastCompletedAt: null,
    });
  }
  await noOperatorLinks(root);
  for (const name of ["archives", "captures", "runs"]) {
    const path = join(root, name);
    await noOperatorLinks(path);
    if (!(await lstat(path)).isDirectory())
      throw new Error("Backup collection is unavailable.");
  }
  const attempt = randomUUID(),
    lockPath = join(root, "active.lock"),
    lock = await open(lockPath, "wx", 0o600);
  try {
    await lock.writeFile(attempt);
    await lock.sync();
    const index = await load(root, key);
    if (
      index.lastCompletedAt &&
      now.valueOf() < Date.parse(index.lastCompletedAt)
    )
      throw new Error("Backup clock regressed; operator review required.");
    if (
      mode === "scheduled" &&
      (!scheduleEnabled ||
        index.daily[label.day] ||
        (!label.afterWindow &&
          (!index.lastCompletedAt ||
            now.valueOf() - Date.parse(index.lastCompletedAt) < 86_400_000)))
    ) {
      return {
        state: !scheduleEnabled ? "schedule_disabled" : "not_due",
        operationalExternalBackupActive: false,
      };
    }
    const capturePath = join(root, "captures", attempt);
    const metadata = await capture(capturePath);
    const staged = join(root, "archives", attempt);
    const sealed = await sealBackup({
      source: capturePath,
      destination: staged,
      key,
      metadata: {
        ...metadata,
        storeId: index.storeId,
        mode,
        requestedAt: now.toISOString(),
      },
    });
    const verified = await verifyBackup({ directory: staged, key });
    if (
      verified.backupId !== sealed.backupId ||
      verified.manifestSha256 !== sealed.manifestSha256
    )
      throw new Error("Backup verification mismatch.");
    const archivePath = join(root, "archives", sealed.backupId);
    await rename(staged, archivePath);
    const previousDay = Object.keys(index.daily).sort().at(-1);
    index.entries[sealed.backupId] = {
      id: sealed.backupId,
      mode,
      createdAt: now.toISOString(),
      manifestSha256: sealed.manifestSha256,
      files: sealed.files,
      bytes: sealed.bytes,
    };
    if (mode === "scheduled") {
      index.daily[label.day] = sealed.backupId;
      index.weekly[label.week] ??= sealed.backupId;
      index.daily = keepLatest(index.daily, 7);
      index.weekly = keepLatest(index.weekly, 4);
    }
    const required = new Set([
      ...Object.values(index.daily),
      ...Object.values(index.weekly),
      ...Object.values(index.entries)
        .filter((e) => e.mode === "critical")
        .map((e) => e.id),
    ]);
    for (const [id, entry] of Object.entries(index.entries))
      if (!required.has(id)) {
        index.pendingPrune.push({ id, manifestSha256: entry.manifestSha256 });
        delete index.entries[id];
      }
    index.lastCompletedAt = now.toISOString();
    await save(root, key, index);
    let retentionComplete = true;
    try {
      await prune(root, key, index);
    } catch {
      retentionComplete = false;
    }
    let captureRetained = keepCapture;
    if (!keepCapture)
      try {
        await removeOperatorBackupTree(root, "captures", attempt);
      } catch {
        captureRetained = true;
      }
    const receipt = {
      state: "verified",
      ...verified,
      mode,
      at: now.toISOString(),
      retentionComplete,
      captureCleanupComplete: keepCapture || !captureRetained,
      dailySlots: Object.keys(index.daily).length,
      weeklySlots: Object.keys(index.weekly).length,
      missedDailyWindow: Boolean(
        mode === "scheduled" &&
        previousDay &&
        (Date.parse(label.day) - Date.parse(previousDay)) / 86_400_000 > 1,
      ),
      archivePath,
      capturePath: captureRetained ? capturePath : null,
      operationalExternalBackupActive: false,
      recoveryD6Proved: false,
    };
    await writeFile(
      join(root, "runs", attempt + ".json"),
      JSON.stringify(receipt, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    return receipt;
  } catch (error) {
    await writeFile(
      join(root, "runs", attempt + ".json"),
      JSON.stringify({
        state: "not_confirmed",
        at: now.toISOString(),
        code: "BACKUP_NOT_CONFIRMED",
      }) + "\n",
      { flag: "wx", mode: 0o600 },
    ).catch(() => {});
    throw error;
  } finally {
    await lock.close();
    if ((await readFile(lockPath, "utf8").catch(() => "")) === attempt)
      await unlink(lockPath);
  }
}
export async function backupStoreStatus({ root, key }) {
  return load(await externalOperatorPath(root), key);
}
