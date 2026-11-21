import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyStorageCapture } from "../scripts/verify-storage-capture.mjs";

const owned: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "hca-storage-backup-sentinel-")); owned.push(root);
  const directory = join(root, "storage", "document-receipts", "document-receipts", "document"); mkdirSync(directory, { recursive: true });
  const bytes = Buffer.from("synthetic-official-pdf"), file = join(directory, "v1.pdf"); writeFileSync(file, bytes);
  const inventory = { rows: [{ bucket_id: "document-receipts", name: "document/v1.pdf", metadata: { size: bytes.length, eTag: createHash("md5").update(bytes).digest("hex") } }] };
  writeFileSync(join(root, "storage-inventory.json"), JSON.stringify(inventory));
  return { root, file, inventory, bytes };
}
afterEach(() => { for (const path of owned.splice(0)) { if (dirname(resolve(path)) !== resolve(tmpdir()) || !basename(path).startsWith("hca-storage-backup-sentinel-")) throw new Error("Unsafe cleanup."); rmSync(path, { recursive: true, force: true }); } });
describe("database and Storage backup coherence", () => {
  it("maps the CLI layout and rejects changed, missing or uninventoried bytes", () => {
    const f = fixture(), result = verifyStorageCapture(f.root);
    expect(result.sizesVerified).toBe(1); expect(result.transportEtagsVerified).toBe(1);
    expect(result.objects[0].sha256).toBe(createHash("sha256").update(f.bytes).digest("hex"));
    const changed = readFileSync(f.file); changed[0] ^= 1; writeFileSync(f.file, changed);
    expect(() => verifyStorageCapture(f.root)).toThrow("ETag mismatch");
    writeFileSync(f.file, f.bytes); writeFileSync(join(f.root, "storage", "extra.bin"), "extra");
    expect(() => verifyStorageCapture(f.root)).toThrow("Uninventoried");
    rmSync(join(f.root, "storage", "extra.bin")); rmSync(f.file);
    expect(() => verifyStorageCapture(f.root)).toThrow("missing");
  });
  it("refuses traversal, duplicate mappings and inconsistent size metadata", () => {
    const f = fixture();
    f.inventory.rows[0].name = "../outside.pdf";
    writeFileSync(join(f.root, "storage-inventory.json"), JSON.stringify(f.inventory));
    expect(() => verifyStorageCapture(f.root)).toThrow("Unsafe");
    f.inventory.rows[0].name = "document/v1.pdf"; f.inventory.rows[0].metadata.size++;
    writeFileSync(join(f.root, "storage-inventory.json"), JSON.stringify(f.inventory));
    expect(() => verifyStorageCapture(f.root)).toThrow("size mismatch");
    f.inventory.rows[0].metadata.size--; f.inventory.rows.push(f.inventory.rows[0]);
    writeFileSync(join(f.root, "storage-inventory.json"), JSON.stringify(f.inventory));
    expect(() => verifyStorageCapture(f.root)).toThrow("missing, duplicated or ambiguous");
  });
});
