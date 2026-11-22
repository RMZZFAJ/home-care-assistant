import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, isAbsolute, sep } from "node:path";

function files(root) {
  if (lstatSync(root).isSymbolicLink()) throw new Error("Storage capture cannot traverse links.");
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error("Storage capture cannot contain links.");
    const path = join(root, entry.name);
    if (entry.isDirectory()) return files(path);
    if (!entry.isFile()) throw new Error("Storage objects must be regular files.");
    return [path];
  });
}
export function verifyStorageCapture(directory) {
  const root = resolve(directory, "storage");
  const inventory = JSON.parse(readFileSync(join(directory, "storage-inventory.json"), "utf8")).rows;
  if (!Array.isArray(inventory)) throw new Error("A captured Storage inventory is required.");
  const available = new Set(files(root));
  const checked = [];
  let etags = 0;
  for (const object of inventory) {
    if (typeof object.name !== "string" || typeof object.bucket_id !== "string" || !/^[a-z0-9-]+$/.test(object.bucket_id) || object.name.split("/").some((part) => !part || part === "." || part === ".." || /[:\\\0]/.test(part))) throw new Error("Unsafe Storage object path.");
    // CLI recursive copies add the bucket directory when copying into an
    // existing destination; a single-object bucket may use the direct layout.
    const candidates = [join(root, object.bucket_id, ...object.name.split("/")), join(root, object.bucket_id, object.bucket_id, ...object.name.split("/"))].filter((path) => available.has(path));
    if (candidates.length !== 1) throw new Error("Storage object is missing, duplicated or ambiguous.");
    const path = candidates[0];
    const child = relative(root, path);
    if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) throw new Error("Storage object escaped the capture.");
    available.delete(path);
    const bytes = readFileSync(path);
    if (!Number.isSafeInteger(object.metadata?.size) || object.metadata.size !== bytes.length) throw new Error("Storage object size mismatch.");
    const etag = (object.metadata.eTag ?? "").replaceAll('"', "");
    if (/^[a-f0-9]{32}$/.test(etag)) {
      if (createHash("md5").update(bytes).digest("hex") !== etag) throw new Error("Storage transport ETag mismatch.");
      etags++;
    }
    checked.push({ bucket: object.bucket_id, name: object.name, capturedPath: relative(directory, path).replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  if (available.size) throw new Error("Uninventoried Storage bytes exist in the capture.");
  return { objects: checked, sizesVerified: checked.length, transportEtagsVerified: etags };
}
