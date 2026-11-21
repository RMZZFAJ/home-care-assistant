import { mkdir, writeFile, readFile, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes, X509Certificate, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { trustedExecutable } from "./trusted-executable.mjs";

// Local provisioning only. Never uploads secrets or activates an external service.
const [targetArg, version] = process.argv.slice(2);
if (
  !targetArg ||
  !path.isAbsolute(targetArg) ||
  !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(version ?? "")
)
  throw new Error(
    "Usage: node scripts/create-local-pdf-custody.mjs ABSOLUTE_NEW_DIRECTORY KEY_VERSION",
  );
const target = path.resolve(targetArg),
  workspace = await realpath(process.cwd());
const parent = await realpath(path.dirname(target)),
  relative = path.relative(workspace, parent);
if (
  (!relative.startsWith(".." + path.sep) &&
    relative !== ".." &&
    !path.isAbsolute(relative)) ||
  existsSync(target)
)
  throw new Error("Custody must be a new directory outside the workspace");
await mkdir(target, { mode: 0o700 });
if (process.platform === "win32") {
  const user = spawnSync(trustedExecutable("whoami"), [], { encoding: "utf8", windowsHide: true });
  if (user.status !== 0) throw new Error("Cannot identify custody owner");
  const acl = spawnSync(
    trustedExecutable("icacls"),
    [target, "/inheritance:r", "/grant:r", user.stdout.trim() + ":(OI)(CI)F"],
    { encoding: "utf8", windowsHide: true },
  );
  if (acl.status !== 0) throw new Error("Cannot restrict custody ACL");
}
const binary =
  process.platform === "win32" &&
  existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
    ? "C:/Program Files/Git/usr/bin/openssl.exe"
    : "openssl";
const file = (name) => path.join(target, name);
const run = (args) => {
  const r = spawnSync(binary, args, { encoding: "utf8", windowsHide: true });
  if (r.status !== 0)
    throw new Error("Local PKI provisioning failed at " + args[0]);
};
const save = (name, value) =>
  writeFile(file(name), value, { mode: 0o600, flag: "wx" });
const rootPassword = randomBytes(48).toString("base64url");
await save("root-password", rootPassword);
run([
  "req",
  "-new",
  "-x509",
  "-newkey",
  "rsa:3072",
  "-passout",
  "file:" + file("root-password"),
  "-keyout",
  file("root.key"),
  "-out",
  file("root.crt"),
  "-days",
  "3650",
  "-sha256",
  "-subj",
  "/CN=Home Care Assistant Local Technical Root",
  "-addext",
  "basicConstraints=critical,CA:TRUE,pathlen:0",
  "-addext",
  "keyUsage=critical,keyCertSign,cRLSign",
]);
const passwords = {};
for (const [name, eku] of [
  ["signer", "1.3.6.1.5.5.7.3.36"],
  ["timestamp", "critical,timeStamping"],
]) {
  const password = randomBytes(48).toString("base64url");
  passwords[name] = password;
  await save(name + "-password", password);
  await save(name + "-export-password", password);
  run([
    "req",
    "-new",
    "-newkey",
    "rsa:3072",
    "-passout",
    "file:" + file(name + "-password"),
    "-keyout",
    file(name + ".key"),
    "-out",
    file(name + ".csr"),
    "-subj",
    "/CN=Home Care Assistant Local Technical " + name,
  ]);
  await save(
    name + ".ext",
    `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,nonRepudiation\nextendedKeyUsage=${eku}\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n`,
  );
  run([
    "x509",
    "-req",
    "-in",
    file(name + ".csr"),
    "-CA",
    file("root.crt"),
    "-CAkey",
    file("root.key"),
    "-passin",
    "file:" + file("root-password"),
    "-CAcreateserial",
    "-out",
    file(name + ".crt"),
    "-days",
    "365",
    "-sha256",
    "-extfile",
    file(name + ".ext"),
  ]);
  run([
    "pkcs12",
    "-export",
    "-in",
    file(name + ".crt"),
    "-inkey",
    file(name + ".key"),
    "-passin",
    "file:" + file(name + "-password"),
    "-certfile",
    file("root.crt"),
    "-out",
    file(name + ".p12"),
    "-passout",
    "file:" + file(name + "-export-password"),
  ]);
}
const fingerprint = async (name) =>
  createHash("sha256")
    .update(new X509Certificate(await readFile(file(name + ".crt"))).raw)
    .digest("hex");
await save(
  "trust.json",
  JSON.stringify(
    {
      environment: "local",
      revision: version,
      roots: [
        { pem: await readFile(file("root.crt"), "utf8"), trust: "internal" },
      ],
      revokedFingerprints: [],
      issuers: [
        {
          keyVersion: version,
          signerFingerprint: await fingerprint("signer"),
          timestampFingerprint: await fingerprint("timestamp"),
        },
      ],
    },
    null,
    2,
  ),
);
await save(
  "runtime-secret.json",
  JSON.stringify({
    environment: "local",
    keyVersion: version,
    signerP12: (await readFile(file("signer.p12"))).toString("base64"),
    signerPassword: passwords.signer,
    timestampP12: (await readFile(file("timestamp.p12"))).toString("base64"),
    timestampPassword: passwords.timestamp,
  }),
);
console.log(
  JSON.stringify({
    environment: "local",
    keyVersion: version,
    custodyDirectory: target,
    trustFile: file("trust.json"),
    secretFile: file("runtime-secret.json"),
    rootPrivateKey: "offline custody only; never configure as runtime secret",
  }),
);
