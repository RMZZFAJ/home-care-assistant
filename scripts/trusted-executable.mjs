import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";

function supabaseCandidates() {
  const filename = process.platform === "win32" ? "supabase.exe" : "supabase";
  const candidates = [join(homedir(), "tools", "bin", filename)];
  if (process.platform !== "win32") candidates.push("/usr/local/bin/supabase", "/usr/bin/supabase");
  const runner = process.env.RUNNER_TEMP;
  // The pinned setup-cli action installs into its own npm prefix, not /usr/bin.
  const suffixes = {
    darwin: { arm64: ["darwin-arm64"], x64: ["darwin-x64"] },
    linux: { arm64: ["linux-arm64", "linux-arm64-musl"], x64: ["linux-x64", "linux-x64-musl"] },
    win32: { arm64: ["windows-arm64"], x64: ["windows-x64"] },
  }[process.platform]?.[process.arch] ?? [];
  const installations = [];
  if (process.env.GITHUB_ACTIONS === "true" && runner && isAbsolute(runner) && existsSync(runner)) {
    for (const entry of readdirSync(runner, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("setup-cli-")) continue;
      const installation = realpathSync(join(runner, entry.name));
      // supabase@2.121.0 delegates to a platform package; bypass its PATH-based shim.
      for (const suffix of suffixes) {
        const candidate = join(installation, "node_modules", "@supabase", "cli-" + suffix, "bin", filename);
        if (!existsSync(candidate) || !statSync(candidate).isFile()) continue;
        const child = relative(installation, realpathSync(candidate));
        if (!isAbsolute(child) && child !== ".." && !child.startsWith(".." + sep)) installations.push(candidate);
      }
    }
  }
  return [...installations, ...candidates];
}

/** Administrative tools never select executables from the inherited PATH. */
export function trustedExecutable(name) {
  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  const systemDirectory = isAbsolute(systemRoot) ? join(systemRoot, "System32") : null;
  const windows = {
    git: ["C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files\\Git\\bin\\git.exe"],
    docker: ["C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"],
    whoami: systemDirectory ? [join(systemDirectory, "whoami.exe")] : [],
    icacls: systemDirectory ? [join(systemDirectory, "icacls.exe")] : [],
  };
  const unix = { git: ["/usr/bin/git", "/bin/git"], docker: ["/usr/bin/docker", "/usr/local/bin/docker"] };
  const candidates = name === "supabase" ? supabaseCandidates() : (process.platform === "win32" ? windows : unix)[name];
  if (!candidates) throw new Error("Unsupported administrative executable.");
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return realpathSync(candidate);
  }
  throw new Error(`Install ${name} in its supported operator or system location; PATH fallback is disabled.`);
}
