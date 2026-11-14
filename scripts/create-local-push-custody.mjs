import { mkdir, realpath, writeFile } from "node:fs/promises";
import { createHash, createECDH } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { generateVAPIDKeys } from "web-push";

// Local provisioning only: no registration, provider request or environment upload.
const [directory, version, subject] = process.argv.slice(2);
const external = (path) => {
  const child = relative(process.cwd(), path);
  return isAbsolute(child) || child === ".." || child.startsWith(".." + sep);
};
try {
  if (
    !directory ||
    !isAbsolute(directory) ||
    !external(resolve(directory)) ||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(version ?? "")
  )
    throw new Error("Invalid target or version");
  const contact = new URL(subject);
  if (
    !["https:", "mailto:"].includes(contact.protocol) ||
    /[\r\n]/.test(subject)
  )
    throw new Error("A contact URI is required");
  const folder = join(await realpath(dirname(directory)), basename(directory));
  const normalize = (value) =>
    process.platform === "win32" ? value.toLowerCase() : value;
  if (normalize(folder) !== normalize(resolve(directory)) || !external(folder))
    throw new Error("Custody may not traverse a link");
  await mkdir(folder, { mode: 0o700 }); // Exclusive: a previous version is never overwritten.
  if (process.platform === "win32") {
    const system = join(process.env.SystemRoot ?? "C:/Windows", "System32");
    const user = spawnSync(join(system, "whoami.exe"), [], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (user.status !== 0 || !user.stdout.trim())
      throw new Error("Operator identity unavailable");
    const acl = spawnSync(
      join(system, "icacls.exe"),
      [folder, "/inheritance:r", "/grant:r", `${user.stdout.trim()}:(OI)(CI)F`],
      { windowsHide: true },
    );
    if (acl.status !== 0) throw new Error("Operator ACL unavailable");
  }
  const pair = generateVAPIDKeys();
  const ec = createECDH("prime256v1");
  ec.setPrivateKey(Buffer.from(pair.privateKey, "base64url"));
  if (ec.getPublicKey().toString("base64url") !== pair.publicKey)
    throw new Error("Generated key mismatch");
  const secret = {
    environment: "local",
    keyVersion: version,
    subject,
    ...pair,
  };
  const publicInfo = {
    environment: "local",
    keyVersion: version,
    subject,
    publicKey: pair.publicKey,
    publicKeySha256: createHash("sha256")
      .update(Buffer.from(pair.publicKey, "base64url"))
      .digest("hex"),
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    join(folder, "runtime-secret.json"),
    JSON.stringify(secret) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    join(folder, "public-info.json"),
    JSON.stringify(publicInfo, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      keyVersion: version,
      publicKeySha256: publicInfo.publicKeySha256,
      externalSendEnabled: false,
    }),
  );
} catch {
  console.error(
    "Local Push custody could not be completed. Use a new absolute external directory, a version and a contact URI; preserve any protected partial output.",
  );
  process.exitCode = 1;
}
