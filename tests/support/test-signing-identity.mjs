import { mkdtemp, writeFile, readFile, rm, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { randomBytes, createHash, createECDH, X509Certificate } from "node:crypto";
import { spawnSync } from "node:child_process";
import { P12Signer } from "@libpdf/core";
import { trustedExecutable } from "../../scripts/trusted-executable.mjs";

/** Real ephemeral PKI. Private material never enters tracked fixtures or logs. */
/** @param {{ keyVersion?: string, authority?: { certificateFile: string, keyFile: string, passwordFile: string } }} [options] */
export async function testSigningIdentity({ keyVersion = "ephemeral-test-v1", authority } = {}) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(keyVersion)) throw new Error("Invalid test key version");
  const folder = await mkdtemp(join(tmpdir(), "hca-signing-test-")),
    file = (name) => join(folder, name);
  const dispose = async () => {
    const target = await realpath(folder),
      parent = await realpath(tmpdir());
    if (
      dirname(target) !== parent ||
      !basename(target).startsWith("hca-signing-test-")
    )
      throw new Error("Refusing cleanup outside ephemeral PKI directory");
    await rm(target, { recursive: true, force: false });
  };
  try {
    const binary =
      process.platform === "win32" &&
      existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
        ? "C:/Program Files/Git/usr/bin/openssl.exe"
        : "openssl";
    const run = (args) => {
      const r = spawnSync(binary, args, {
        encoding: "utf8",
        windowsHide: true,
      });
      if (r.status !== 0)
        throw new Error("Test PKI OpenSSL step failed: " + args[0]);
    };
    if (process.platform === "win32") {
      const user = spawnSync(trustedExecutable("whoami"), [], {
        encoding: "utf8",
        windowsHide: true,
      });
      if (user.status !== 0)
        throw new Error("Cannot identify local custody owner");
      const acl = spawnSync(
        trustedExecutable("icacls"),
        [
          folder,
          "/inheritance:r",
          "/grant:r",
          user.stdout.trim() + ":(OI)(CI)F",
        ],
        { encoding: "utf8", windowsHide: true },
      );
      if (acl.status !== 0)
        throw new Error("Cannot protect ephemeral key custody");
    }
    const password = randomBytes(48).toString("base64url"),
      pass = "file:" + file("password"),
      exportPass = "file:" + file("export-password");
    await writeFile(file("password"), password, { mode: 0o600 });
    await writeFile(file("export-password"), password, { mode: 0o600 });
    if (authority) await writeFile(file("root.crt"), await readFile(authority.certificateFile));
    else run([
      "req",
      "-new",
      "-x509",
      "-newkey",
      "rsa:3072",
      "-passout",
      pass,
      "-keyout",
      file("root.key"),
      "-out",
      file("root.crt"),
      "-days",
      "14",
      "-sha256",
      "-subj",
      "/CN=HCA Ephemeral Test Root",
      "-addext",
      "basicConstraints=critical,CA:TRUE,pathlen:0",
      "-addext",
      "keyUsage=critical,keyCertSign,cRLSign",
    ]);
    for (const [name, eku] of [
      ["signer", "1.3.6.1.5.5.7.3.36"],
      ["tsa", "critical,timeStamping"],
    ]) {
      run([
        "req",
        "-new",
        "-newkey",
        "rsa:3072",
        "-passout",
        pass,
        "-keyout",
        file(name + ".key"),
        "-out",
        file(name + ".csr"),
        "-subj",
        "/CN=Home Care Assistant Ephemeral " + name,
      ]);
      await writeFile(
        file(name + ".ext"),
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
        authority?.keyFile ?? file("root.key"),
        "-passin",
        authority ? "file:" + authority.passwordFile : pass,
        "-CAcreateserial",
        "-out",
        file(name + ".crt"),
        "-days",
        "7",
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
        pass,
        "-certfile",
        file("root.crt"),
        "-out",
        file(name + ".p12"),
        "-passout",
        exportPass,
      ]);
    }
    const signer = await P12Signer.create(
        await readFile(file("signer.p12")),
        password,
      ),
      tsa = await P12Signer.create(await readFile(file("tsa.p12")), password),
      root = await readFile(file("root.crt"), "utf8");
    const fingerprint = (provider) =>
      createHash("sha256")
        .update(new X509Certificate(provider.certificate).raw)
        .digest("hex");
    await writeFile(
      file("runtime-secret.json"),
      JSON.stringify({
        environment: "local",
        keyVersion,
        signerP12: (await readFile(file("signer.p12"))).toString("base64"),
        signerPassword: password,
        timestampP12: (await readFile(file("tsa.p12"))).toString("base64"),
        timestampPassword: password,
      }),
      { mode: 0o600 },
    );
    await writeFile(
      file("trust.json"),
      JSON.stringify({
        environment: "local",
        revision: keyVersion,
        roots: [{ pem: root, trust: "internal" }],
        revokedFingerprints: [],
        issuers: [
          {
            keyVersion,
            signerFingerprint: fingerprint(signer),
            timestampFingerprint: fingerprint(tsa),
          },
        ],
      }),
      { mode: 0o600 },
    );
    const pushKey = createECDH("prime256v1");
    pushKey.generateKeys();
    await writeFile(file("web-push-secret.json"), JSON.stringify({
      environment: "local", keyVersion: "ephemeral-push-test-v1",
      subject: "https://home-care-assistant.invalid",
      publicKey: pushKey.getPublicKey().toString("base64url"),
      privateKey: Buffer.from(pushKey.getPrivateKey("hex").padStart(64, "0"), "hex").toString("base64url"),
    }), { mode: 0o600 });
    return {
      authority: { certificateFile: file("root.crt"), keyFile: authority?.keyFile ?? file("root.key"), passwordFile: authority?.passwordFile ?? file("password") },
      signer,
      tsa,
      root,
      dispose,
      trustFile: file("trust.json"),
      secretFile: file("runtime-secret.json"),
      pushFile: file("web-push-secret.json"),
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}
