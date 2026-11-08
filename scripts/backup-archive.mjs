import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep, join, dirname } from "node:path";
import { Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const format = "hca-backup-aes256gcm-v1";
const workspace = fileURLToPath(new URL("..", import.meta.url));
const maxManifestBytes = 16 * 1024 * 1024;
function inside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}
async function noLinks(path) {
  let current = resolve(path);
  for (;;) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error("Backup paths cannot traverse symbolic links."); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
async function external(path, root = workspace) {
  if (!isAbsolute(path) || inside(resolve(root), resolve(path))) throw new Error("Backup destinations must be absolute and outside the repository.");
  await noLinks(path);
  return resolve(path);
}
function keyBytes(key) {
  if (!(key instanceof Uint8Array) || key.length !== 32) throw new Error("A separate 256-bit backup key is required.");
  return key;
}
function logicalPath(path) {
  if (typeof path !== "string" || path.length === 0 || path.includes("\\") || path.includes(":") || path.includes("\0") || path.split("/").some((p) => !p || p === "." || p === "..")) throw new Error("Unsafe backup member path.");
  return path;
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const aad = (id, path) => Buffer.from(`${format}\0${id}\0${path}`, "utf8");
async function members(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = logicalPath(prefix ? `${prefix}/${entry.name}` : entry.name);
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Backup sources cannot contain symbolic links.");
    if (entry.isDirectory()) result.push(...await members(path, name));
    else if (entry.isFile()) result.push({ name, path });
    else throw new Error("Backup sources must be regular files.");
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, "en"));
}
async function encryptFile(source, destination, key, associatedData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData);
  const hash = createHash("sha256");
  let bytes = 0;
  const measure = new Transform({ transform(chunk, encoding, done) { hash.update(chunk); bytes += chunk.length; done(null, chunk); } });
  await pipeline(createReadStream(source), measure, cipher, createWriteStream(destination, { flags: "wx", mode: 0o600 }));
  return { bytes, sha256: hash.digest("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}
function encryptManifest(bytes, key, associatedData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return { encrypted, iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}

/** This adapter only archives captured files. It never contacts or restores a database. */
export async function sealBackup({ source, destination, key, metadata = {}, repository = workspace }) {
  keyBytes(key);
  const input = await external(source, repository);
  const output = await external(destination, repository);
  if (inside(input, output) || inside(output, input)) throw new Error("Capture and archive directories must be separate.");
  const files = await members(input);
  if (!files.length) throw new Error("Cannot seal an empty backup.");
  await mkdir(output, { mode: 0o700 }); // Existing destinations are never overwritten.
  const backupId = randomUUID();
  const entries = [];
  for (const [index, file] of files.entries()) {
    const object = `${String(index).padStart(6, "0")}.gcm`;
    const integrity = await encryptFile(file.path, join(output, object), key, aad(backupId, file.name));
    entries.push({ path: file.name, object, ...integrity });
  }
  const manifest = Buffer.from(JSON.stringify({ format, backupId, createdAt: new Date().toISOString(), metadata, entries }));
  if (manifest.length > maxManifestBytes) throw new Error("Backup manifest exceeds the supported limit.");
  const encrypted = encryptManifest(manifest, key, aad(backupId, "manifest"));
  await writeFile(join(output, "manifest.gcm"), encrypted.encrypted, { flag: "wx", mode: 0o600 });
  const envelope = { format, backupId, manifestSha256: digest(manifest), manifestIv: encrypted.iv, manifestTag: encrypted.tag };
  // Published last. An interrupted capture cannot appear complete.
  await writeFile(join(output, "envelope.json"), JSON.stringify(envelope, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { backupId, files: entries.length, bytes: entries.reduce((sum, e) => sum + e.bytes, 0), manifestSha256: envelope.manifestSha256 };
}
async function boundedFile(path, limit) {
  await noLinks(path);
  const info = await stat(path);
  if (!info.isFile() || info.size > limit) throw new Error("Invalid backup metadata file.");
  return readFile(path);
}
function decryptor(key, iv, tag, associatedData) {
  if (!/^[0-9a-f]{24}$/.test(iv) || !/^[0-9a-f]{32}$/.test(tag)) throw new Error("Invalid backup encryption metadata.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  decipher.setAAD(associatedData);
  return decipher;
}
async function openManifest(directory, key, repository) {
  keyBytes(key);
  const input = await external(directory, repository);
  const envelope = JSON.parse((await boundedFile(join(input, "envelope.json"), 4096)).toString("utf8"));
  if (envelope.format !== format || !/^[0-9a-f-]{36}$/.test(envelope.backupId)) throw new Error("Unsupported backup envelope.");
  const bytes = await boundedFile(join(input, "manifest.gcm"), maxManifestBytes);
  const cipher = decryptor(key, envelope.manifestIv, envelope.manifestTag, aad(envelope.backupId, "manifest"));
  const plain = Buffer.concat([cipher.update(bytes), cipher.final()]);
  if (digest(plain) !== envelope.manifestSha256) throw new Error("Backup manifest hash mismatch.");
  const manifest = JSON.parse(plain.toString("utf8"));
  if (manifest.format !== format || manifest.backupId !== envelope.backupId || !Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error("Invalid backup manifest.");
  const seen = new Set();
  const objects = new Set();
  for (const e of manifest.entries) {
    logicalPath(e.path);
    // Case-insensitive uniqueness also prevents collisions on Windows restores.
    const name = e.path.toLowerCase();
    if (seen.has(name) || objects.has(e.object) || !/^\d{6}\.gcm$/.test(e.object) || !Number.isSafeInteger(e.bytes) || e.bytes < 0 || !/^[a-f0-9]{64}$/.test(e.sha256)) throw new Error("Invalid or duplicate backup member.");
    seen.add(name); objects.add(e.object);
  }
  return { input, manifest, manifestSha256: envelope.manifestSha256 };
}
async function decryptMember(input, entry, manifest, key, output) {
  const source = join(input, entry.object);
  await noLinks(source);
  if (!(await stat(source)).isFile()) throw new Error("Backup object is not a regular file.");
  const hash = createHash("sha256");
  let bytes = 0;
  const measure = new Transform({ transform(chunk, encoding, done) { hash.update(chunk); bytes += chunk.length; done(null, chunk); } });
  const sink = output ? createWriteStream(output, { flags: "wx", mode: 0o600 }) : new Writable({ write(chunk, encoding, done) { done(); } });
  await pipeline(createReadStream(source), decryptor(key, entry.iv, entry.tag, aad(manifest.backupId, entry.path)), measure, sink);
  if (bytes !== entry.bytes || hash.digest("hex") !== entry.sha256) throw new Error("Backup member integrity mismatch.");
}
export async function verifyBackup({ directory, key, repository = workspace, includeMetadata = false }) {
  const { input, manifest, manifestSha256 } = await openManifest(directory, key, repository);
  for (const entry of manifest.entries) await decryptMember(input, entry, manifest, key);
  return { backupId: manifest.backupId, files: manifest.entries.length, bytes: manifest.entries.reduce((sum, e) => sum + e.bytes, 0), manifestSha256, verified: true, ...(includeMetadata ? { metadata: manifest.metadata } : {}) };
}
export async function extractBackup({ directory, destination, key, repository = workspace }) {
  // Authenticate every object before exposing any restored plaintext.
  const verified = await verifyBackup({ directory, key, repository });
  const { input, manifest } = await openManifest(directory, key, repository);
  const output = await external(destination, repository);
  if (inside(input, output) || inside(output, input)) throw new Error("Restore and archive directories must be separate.");
  await mkdir(output, { mode: 0o700 });
  for (const entry of manifest.entries) {
    const target = join(output, ...entry.path.split("/"));
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await noLinks(target);
    await decryptMember(input, entry, manifest, key, target);
  }
  await writeFile(join(output, "RESTORE_VERIFIED.json"), JSON.stringify(verified, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return verified;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const option = (name) => { const index = args.indexOf(name); if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Required option: ${name}`); return args[index + 1]; };
    const keyFile = await external(option("--key-file"));
    if (await realpath(keyFile) !== resolve(keyFile)) throw new Error("Backup key cannot be a symbolic link.");
    const key = await readFile(keyFile);
    let result;
    if (command === "seal") result = await sealBackup({ source: option("--source"), destination: option("--destination"), key });
    else if (command === "verify") result = await verifyBackup({ directory: option("--directory"), key });
    else if (command === "extract") result = await extractBackup({ directory: option("--directory"), destination: option("--destination"), key });
    else throw new Error("Expected seal, verify or extract.");
    console.log(JSON.stringify(result));
  } catch { console.error("Backup operation failed; no completed backup or restore should be assumed. Inspect the protected inputs and configuration."); process.exitCode = 1; }
}
