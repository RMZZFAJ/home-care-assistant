import { existsSync, realpathSync, statSync } from "node:fs";

/** Administrative tools never select executables from the inherited PATH. */
export function trustedExecutable(name) {
  const windows = {
    git: ["C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files\\Git\\bin\\git.exe"],
    docker: ["C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"],
    whoami: ["C:\\Windows\\System32\\whoami.exe"],
    icacls: ["C:\\Windows\\System32\\icacls.exe"],
  };
  const unix = { git: ["/usr/bin/git", "/bin/git"], docker: ["/usr/bin/docker", "/usr/local/bin/docker"] };
  const candidates = (process.platform === "win32" ? windows : unix)[name];
  if (!candidates) throw new Error("Unsupported administrative executable.");
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return realpathSync(candidate);
  }
  throw new Error(`Install ${name} in its supported system location; PATH fallback is disabled.`);
}
