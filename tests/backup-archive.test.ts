import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { extractBackup, sealBackup, verifyBackup } from "../scripts/backup-archive.mjs";

const owned: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "hca-backup-sentinel-")); owned.push(root);
  const source = join(root, "capture"); await mkdir(join(source, "storage"), { recursive: true });
  await writeFile(join(source, "db.sql"), "synthetic-private-row\n");
  await writeFile(join(source, "storage", "original.pdf"), Buffer.from([0, 1, 255, 10]));
  return { root, source, destination: join(root, "encrypted"), key: randomBytes(32) };
}
afterEach(async () => {
  for (const root of owned.splice(0)) {
    const path = resolve(root);
    if (dirname(path) !== resolve(tmpdir()) || !basename(path).startsWith("hca-backup-sentinel-")) throw new Error("Unsafe test cleanup.");
    await rm(path, { recursive: true, force: true });
  }
});
describe("operator encrypted backup archive", () => {
  it("authenticates the manifest and every byte before restoring DB and Storage together", async () => {
    const f = await fixture();
    const sealed = await sealBackup(f);
    expect(sealed.files).toBe(2);
    for (const name of await readdir(f.destination)) {
      expect((await readFile(join(f.destination, name))).includes(Buffer.from("synthetic-private-row"))).toBe(false);
    }
    const verified = await verifyBackup({ directory: f.destination, key: f.key });
    expect(verified.manifestSha256).toBe(sealed.manifestSha256);
    const restored = join(f.root, "restored");
    await extractBackup({ directory: f.destination, destination: restored, key: f.key });
    expect(await readFile(join(restored, "db.sql"))).toEqual(await readFile(join(f.source, "db.sql")));
    expect(await readFile(join(restored, "storage", "original.pdf"))).toEqual(await readFile(join(f.source, "storage", "original.pdf")));
    expect(JSON.parse(await readFile(join(restored, "RESTORE_VERIFIED.json"), "utf8")).verified).toBe(true);
    await expect(sealBackup(f)).rejects.toThrow();
    await expect(extractBackup({ directory: f.destination, destination: restored, key: f.key })).rejects.toThrow();
  });
  it("refuses wrong keys, modified ciphertext and missing objects before plaintext extraction", async () => {
    const f = await fixture(); await sealBackup(f);
    await expect(verifyBackup({ directory: f.destination, key: randomBytes(32) })).rejects.toThrow();
    const object = join(f.destination, "000000.gcm");
    const bytes = await readFile(object); bytes[0] ^= 1; await writeFile(object, bytes);
    const restored = join(f.root, "bad-restore");
    await expect(extractBackup({ directory: f.destination, destination: restored, key: f.key })).rejects.toThrow();
    await expect(readdir(restored)).rejects.toThrow();
    await rm(object);
    await expect(verifyBackup({ directory: f.destination, key: f.key })).rejects.toThrow();
  });
  it("binds objects to this backup and logical path, including identical contents", async () => {
    const f = await fixture(); await writeFile(join(f.source, "second.sql"), "synthetic-private-row\n");
    await sealBackup(f);
    const a = join(f.destination, "000000.gcm"), b = join(f.destination, "000001.gcm");
    const first = await readFile(a), second = await readFile(b);
    await writeFile(a, second); await writeFile(b, first);
    await expect(verifyBackup({ directory: f.destination, key: f.key })).rejects.toThrow();
  });
  it("does not accept repository destinations, nesting, empty captures or weak keys", async () => {
    const f = await fixture();
    await expect(sealBackup({ ...f, destination: join(process.cwd(), "output", "private-backup") })).rejects.toThrow("outside the repository");
    await expect(sealBackup({ ...f, destination: join(f.source, "nested") })).rejects.toThrow("separate");
    await expect(sealBackup({ ...f, key: randomBytes(16) })).rejects.toThrow("256-bit");
    const empty = join(f.root, "empty"); await mkdir(empty);
    await expect(sealBackup({ ...f, source: empty })).rejects.toThrow("empty");
  });
  it("rejects links and incomplete backups", async () => {
    const f = await fixture();
    await symlink(f.source, join(f.root, "redirect"), "junction");
    await expect(sealBackup({ ...f, source: join(f.root, "redirect") })).rejects.toThrow("symbolic");
    await expect(verifyBackup({ directory: f.destination, key: f.key })).rejects.toThrow();
  });
});
