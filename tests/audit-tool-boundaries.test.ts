import { it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { checkedCliPath } from "../docs/audits/B/B5/2026-10-30-phase-b5-integrations/evidence/cli-file-path.mjs";

// Import only inert helper modules. No archived capture is replayed.
const { capturePath } = createRequire(import.meta.url)("../docs/audits/B/B1/2026-10-28-phase-b1-interface/evidence/make-sheets.cjs");
function clean(directory: string) {
  const resolved = fs.realpathSync(directory);
  expect(path.dirname(resolved)).toBe(fs.realpathSync(tmpdir()));
  expect(path.basename(resolved)).toMatch(/^hca-(capture|cli)-boundary-/);
  rmSync(resolved, { recursive: true, force: true });
}

it("contact sheets accept a capture basename and refuse directory traversal and absolute input before image processing", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "hca-capture-boundary-"));
  try {
    writeFileSync(path.join(directory, "foto ficticia.png"), "synthetic capture");
    const checked = (value: unknown) => capturePath(value, directory);
    expect(checked("foto ficticia.png")).toBe(fs.realpathSync(path.join(directory, "foto ficticia.png")));
    for (const input of ["../outside.png", "..\\outside.png", path.join(directory, "foto ficticia.png"), "C:\\private\\outside.png", "nested/foto.png", "bad\0.png", "capture.pdf", null])
      expect(() => checked(input)).toThrow();
  } finally { clean(directory); }
});

for (const name of ["b58-capture.mjs", "b58-switch-capture.mjs"]) it(name + " passes Node an existing absolute CLI script rather than an interpreter option", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "hca-cli-boundary-"));
  try {
    const cli = path.join(directory, "playwright-cli.js"); writeFileSync(cli, "// synthetic path control; never executed");
    expect(readFileSync("docs/audits/B/B5/2026-10-30-phase-b5-integrations/evidence/" + name, "utf8")).toContain("const cli=checkedCliPath(process.argv[2]);");
    const checked = checkedCliPath;
    expect(checked(path.relative(process.cwd(), cli))).toBe(fs.realpathSync(cli));
    for (const input of ["--import=" + cli, "--eval=./playwright-cli.js", "-r./playwright-cli.js", path.join(directory, "missing-playwright-cli.js"), directory, undefined])
      expect(() => checked(input)).toThrow();
  } finally { clean(directory); }
});
