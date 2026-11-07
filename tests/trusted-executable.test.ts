import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { trustedExecutable } from "../scripts/trusted-executable.mjs";

function removeOwned(path: string) {
  if (dirname(resolve(path)) !== resolve(tmpdir()) || !basename(path).startsWith("hca-executable-sentinel-")) throw new Error("Unsafe cleanup.");
  rmSync(path, { recursive: true, force: true });
}

it("does not execute a Git candidate injected into PATH", () => {
  const path = mkdtempSync(join(tmpdir(), "hca-executable-sentinel-"));
  try {
    writeFileSync(join(path, process.platform === "win32" ? "git.exe" : "git"), "untrusted synthetic executable", { mode: 0o700 });
    const moduleUrl = pathToFileURL(resolve("scripts/trusted-executable.mjs")).href;
    const code = `import {execFileSync} from 'node:child_process'; import {trustedExecutable} from ${JSON.stringify(moduleUrl)}; console.log(execFileSync(trustedExecutable('git'),['--version'],{encoding:'utf8'}).trim());`;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", env: { ...process.env, PATH: path } });
    expect(output).toMatch(/^git version /);
    expect(isAbsolute(trustedExecutable("git"))).toBe(true);
    expect(() => trustedExecutable("unreviewed-command")).toThrow("Unsupported");
  } finally {
    removeOwned(path);
  }
});
