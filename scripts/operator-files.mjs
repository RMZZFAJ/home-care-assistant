import { lstat, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("..", import.meta.url));
export const inside = (parent, child) => {
  const part = relative(resolve(parent), resolve(child));
  return (
    !part ||
    (!isAbsolute(part) && part !== ".." && !part.startsWith(".." + sep))
  );
};
export async function noOperatorLinks(path) {
  for (let current = resolve(path); ;) {
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error("Operator paths cannot traverse links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
export async function externalOperatorPath(path) {
  if (
    !isAbsolute(path) ||
    inside(repository, path) ||
    resolve(path) === dirname(resolve(path))
  )
    throw new Error("An explicit operator path outside Git is required.");
  await noOperatorLinks(path);
  return resolve(path);
}
/** Only creates a NEW directory; never changes an existing operator ACL. */
export async function createOperatorDirectory(path) {
  const target = await externalOperatorPath(path);
  await mkdir(target, { mode: 0o700 });
  if (process.platform === "win32") {
    const system = join(process.env.SystemRoot, "System32");
    const who = spawnSync(join(system, "whoami.exe"), [], { encoding: "utf8" });
    if (who.status !== 0 || !who.stdout.trim())
      throw new Error("Operator identity unavailable.");
    const acl = spawnSync(
      join(system, "icacls.exe"),
      [target, "/inheritance:r", "/grant:r", who.stdout.trim() + ":(OI)(CI)F"],
      { encoding: "utf8" },
    );
    if (acl.status !== 0)
      throw new Error("Operator directory protection failed.");
  }
  return target;
}
export const backupUuid = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    value,
  );
/** Checked absolute target, fixed collection and UUID; never follows a tree link. */
export async function removeOperatorBackupTree(root, collection, id) {
  if (!["archives", "captures"].includes(collection) || !backupUuid(id))
    throw new Error("Unsafe backup removal target.");
  const parent = join(await externalOperatorPath(root), collection),
    target = resolve(parent, id);
  if (dirname(target) !== resolve(parent) || !inside(root, target))
    throw new Error("Backup removal escaped its root.");
  await noOperatorLinks(target);
  async function check(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.isSymbolicLink())
        throw new Error("Backup removal refuses linked members.");
      if (item.isDirectory()) await check(join(directory, item.name));
      else if (!item.isFile()) throw new Error("Unexpected backup member.");
    }
  }
  await check(target);
  await rm(target, { recursive: true });
}
