import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareReportOutput } from "../scripts/report-output.mjs";

const owned: string[] = [];
function temporary() { const dir = mkdtempSync(join(tmpdir(), "hca-d0-sentinel-")); owned.push(dir); return dir; }
afterEach(() => { for (const dir of owned.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("D0 tool boundaries", () => {
  it.each(["audit-catalogue", "build-traceability", "inventory-ui", "reconcile-database"])("%s refuses default historical writes before contacting any service", (name) => {
    const run = spawnSync(process.execPath, [`scripts/${name}.mjs`], { encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("explicit --output-dir");
  });
  it("does not turn a provider credential into authorization", () => {
    const run = spawnSync(process.execPath, ["scripts/meta-templates.mjs"], { encoding: "utf8", env: { ...process.env, META_WHATSAPP_ACCESS_TOKEN: "synthetic-no-network" } });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("META_TOOL_DISABLED_UNTIL_D7");
    expect(run.stderr).not.toContain("synthetic-no-network");
  });
  it("requires replay consent before the legacy verifier can seed", () => {
    const run = spawnSync(process.execPath, ["scripts/verify-evolution-database.mjs"], { encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("requires explicit --replay-local --backup");
  });
  it("preserves existing reports and records the current source/time in new outputs", () => {
    const dir = temporary();
    const output = prepareReportOutput(["--output-dir", dir]);
    output.write("sentinel.json", "original");
    expect(() => output.write("sentinel.json", "replacement")).toThrow();
    expect(readFileSync(join(dir, "sentinel.json"), "utf8")).toBe("original");
    expect(output.metadata.sourceSha).toMatch(/^[a-f0-9]{40}$/);
    expect(Number.isFinite(Date.parse(output.metadata.generatedAt))).toBe(true);
    expect(() => output.write("../escape", "no")).toThrow("cannot escape");
    expect(() => prepareReportOutput(["--output-dir", "docs/audits/C/unsafe", "--overwrite"])).toThrow("historical inputs are protected");
    prepareReportOutput(["--output-dir", dir, "--overwrite"]).write("sentinel.json", "explicit replacement");
    expect(readFileSync(join(dir, "sentinel.json"), "utf8")).toBe("explicit replacement");
  });
  it("exports code/assets while excluding private and environment sentinels", () => {
    const dir = temporary();
    const fixture = join(dir, "source");
    const files = ["src/app/page.tsx", "public/logo.svg", ".private/secret.txt", ".venv/library.txt", ".env.local", "nested/.private/secret.txt", "nested/.env.backup", "db.dump"];
    for (const file of files) { mkdirSync(join(fixture, file, ".."), { recursive: true }); writeFileSync(join(fixture, file), "synthetic"); }
    const archive = join(dir, "export.tar");
    execFileSync("tar", ["-C", fixture, "-X", resolve("scripts/verification-export.exclude"), "-cf", archive, "."]);
    const members = execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).replaceAll("\\", "/");
    expect(members).toContain("src/app/page.tsx");
    expect(members).toContain("public/logo.svg");
    expect(members).not.toMatch(/\.private|\.venv|\.env|db\.dump/);
  });
});
