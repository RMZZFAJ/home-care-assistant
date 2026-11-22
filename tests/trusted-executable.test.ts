import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it, vi } from "vitest";
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

it.runIf(process.platform === "win32")("resolves custody tools from the configured Windows installation, without PATH", () => {
  const folder = mkdtempSync(join(tmpdir(), "hca-executable-sentinel-"));
  const root = join(folder, "OtherWindows"), system = join(root, "System32");
  try {
    mkdirSync(system, { recursive: true });
    for (const name of ["whoami", "icacls"]) copyFileSync(trustedExecutable(name), join(system, name + ".exe"));
    vi.stubEnv("SystemRoot", root);
    for (const name of ["whoami", "icacls"]) expect(trustedExecutable(name)).toBe(realpathSync(join(system, name + ".exe")));
    vi.stubEnv("SystemRoot", "relative-Windows");
    expect(() => trustedExecutable("whoami")).toThrow("PATH fallback is disabled");
  } finally {
    vi.unstubAllEnvs();
    removeOwned(folder);
  }
});

it("recognizes the pinned setup-cli npm installation without selecting a PATH candidate", () => {
  const folder = mkdtempSync(join(tmpdir(), "hca-executable-sentinel-"));
  const install = join(folder, "setup-cli-fixture"), filename = process.platform === "win32" ? "supabase.exe" : "supabase";
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const candidate = join(install, "node_modules", "@supabase", "cli-" + platform + "-" + process.arch, "bin", filename);
  try {
    mkdirSync(dirname(candidate), { recursive: true });
    writeFileSync(candidate, "installation fixture; never executed");
    writeFileSync(join(folder, filename), "untrusted PATH candidate; never executed");
    vi.stubEnv("GITHUB_ACTIONS", "true");vi.stubEnv("RUNNER_TEMP", folder);vi.stubEnv("PATH", folder);
    expect(trustedExecutable("supabase")).toBe(realpathSync(candidate));
    if (process.platform !== "win32") {
      unlinkSync(candidate);
      const outside = join(folder, "outside-installation");writeFileSync(outside, "untrusted symlink target; never executed");
      symlinkSync(outside, candidate);
      try { expect(trustedExecutable("supabase")).not.toBe(realpathSync(outside)); }
      catch (error) { expect(error).toBeInstanceOf(Error);expect((error as Error).message).toContain("PATH fallback is disabled"); }
    }
  } finally {
    vi.unstubAllEnvs();
    removeOwned(folder);
  }
});
