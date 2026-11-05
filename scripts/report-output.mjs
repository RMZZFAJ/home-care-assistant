import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

function inside(parent, target) {
  const child = relative(parent, target);
  return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`));
}

/** Explicit destinations and exclusive writes keep reruns from replacing evidence. */
export function prepareReportOutput(args = process.argv.slice(2), workspace = process.cwd()) {
  const index = args.indexOf("--output-dir");
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error("An explicit --output-dir <new directory> is required; historical reports are never the default destination.");
  const output = resolve(workspace, args[index + 1]);
  // Resolve existing ancestors too: a symlink must not redirect a new directory.
  let ancestor = output;
  while (!existsSync(ancestor) && dirname(ancestor) !== ancestor) ancestor = dirname(ancestor);
  if (realpathSync(ancestor).toLowerCase() !== resolve(ancestor).toLowerCase())
    throw new Error("Report output cannot traverse a symbolic link.");
  if (inside(workspace, output) &&
      !inside(join(workspace, "output"), output) &&
      !inside(join(workspace, "docs/audits/D"), output))
    throw new Error("Report output inside the repository must use output/ or docs/audits/D/; historical inputs are protected.");
  const overwrite = args.includes("--overwrite");
  if (existsSync(output) && (!lstatSync(output).isDirectory() || lstatSync(output).isSymbolicLink()))
    throw new Error("Report destination must be a real directory.");
  const write = (name, content) => {
    if (basename(name) !== name || [".", ".."].includes(name)) throw new Error("Report filenames cannot escape their directory.");
    const target = join(output, name);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error("Cannot replace a symbolic report file.");
    writeFileSync(target, content, { flag: overwrite ? "w" : "wx", mode: 0o600 });
  };
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();
  const sourceTreeDirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: workspace, encoding: "utf8" }).trim().length > 0;
  const metadata = { sourceSha, sourceTreeDirty, generatedAt: new Date().toISOString(), tool: basename(process.argv[1] ?? "report"), evidence: "CURRENT_RUN_NOT_HISTORICAL_ACCEPTANCE" };
  mkdirSync(output, { recursive: true });
  write("RUN_METADATA.json", `${JSON.stringify(metadata, null, 2)}\n`);
  return { directory: output, metadata, write };
}
