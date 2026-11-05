import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// Read-only source inventory. No fixture, database, server or network writes.
const root = process.cwd();
const out = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const inventoryRef = "294382b56e10c7c7c38a4d94bc91bacffb01ee3f";
const files = git("ls-tree", "-r", "--name-only", "-z", inventoryRef).split("\0").filter(Boolean);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
const baselineFile = path.join(out, "baseline.json");
const protectedFiles = files.filter((f) => !f.startsWith("docs/") && !["README.md", "AGENTS.md"].includes(f));
if (!fs.existsSync(baselineFile)) {
  const inspection = JSON.parse(execFileSync("docker", ["inspect", "supabase_db_home-care-assistant"], { encoding: "utf8" }))[0];
  const labels = inspection.Config.Labels;
  if (labels["com.supabase.cli.project"] !== "home-care-assistant") throw new Error("Unexpected local project");
  write("baseline.json", {
    observedAt: new Date().toISOString(), branch: git("branch", "--show-current"),
    head: git("rev-parse", "HEAD"), master: git("rev-parse", "master"), node: process.version,
    localBackend: { container: inspection.Name, project: labels["com.supabase.cli.project"],
      workdir: labels["com.supabase.cli.workdir"],
      status: inspection.State.Status, ports: inspection.NetworkSettings.Ports },
    protected: protectedFiles.map((file) => ({ file, sha256: hash(fs.readFileSync(file)) })),
    remote: git("ls-remote", "--heads", "origin", "audit/phase-b", "master").split("\n"),
    permittedHistoricalEdit: "docs/audits/2026-10-30-phase-b4-backend/14_FINDINGS_MASTER.md (three lines, code formatting only)",
  });
}
const sourceFiles = files.filter((f) => /\.(?:[cm]?[jt]sx?)$/.test(f) && !f.startsWith("docs/"));
const imports = [];
const testInventory = [];
const moduleInventory = [];
for (const file of sourceFiles) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const testSites = [], assertions = [], mockSites = [];
  const line = (node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ from: file, line: line(node), specifier: node.moduleSpecifier.text,
        kind: ts.isExportDeclaration(node) ? "re-export" : "static-import" });
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(ast);
      const first = node.arguments[0];
      if (first && ts.isStringLiteral(first) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || callee === "require")) {
        imports.push({ from: file, line: line(node), specifier: first.text, kind: "dynamic-import" });
      }
      if (/^(?:test|it)(?:\.(?:skip|only|todo|each|fails))?$/.test(callee) && first) {
        testSites.push({ line: line(node), title: ts.isStringLiteralLike(first) ? first.text : first.getText(ast), callee });
      }
      if (/^(?:expect\b|assert\b)/.test(callee)) assertions.push({ line: line(node), callee });
      if (/^(?:vi|jest)\.(?:mock|spyOn|stub|fn)/.test(callee)) mockSites.push({ line: line(node), callee });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const entrypoint = /(?:^|\/)(?:page|layout|route|loading|error|not-found|proxy|instrumentation)\.[jt]sx?$/.test(file);
  moduleInventory.push({ file, lines: source.split(/\r?\n/).length, bytes: Buffer.byteLength(source), entrypoint });
  if (file.startsWith("tests/")) testInventory.push({ file,
    layer: file.startsWith("tests/integration/") ? "HTTP_AUTH_RPC" : file.startsWith("tests/e2e/") ? "BROWSER" : "VITEST_NODE",
    sites: testSites, assertions, mocks: mockSites,
    writes: /(?:writeFile|mkdir|sql\(|\.post\(|\.insert\(|\.update\(|\.delete\()/g.test(source),
    sha256_lf: hash(source.replace(/\r\n/g, "\n")),
  });
}
for (const row of imports) {
  const base = row.specifier.startsWith("@/") ? "src/" + row.specifier.slice(2)
    : row.specifier.startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(row.from), row.specifier)) : null;
  if (base) row.resolved = [base, ...[".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"].map((ext) => base + ext)].find((candidate) => files.includes(candidate)) ?? null;
}
const sqlFiles = files.filter((f) => f.startsWith("tests/database/") && f.endsWith(".sql"));
const sqlInventory = sqlFiles.map((file) => { const source = read(file); return {
  file, lines: source.split(/\r?\n/).length, rollback: /\brollback\s*;/i.test(source),
  begin: /\bbegin\s*;/i.test(source), raiseSites: [...source.matchAll(/raise exception/gi)].length,
  authenticatedContext: /assume-context|auth\.uid|request\.jwt|set\s+(?:local\s+)?role/i.test(source),
}; });
const directories = {};
for (const file of files) { const category = file.startsWith("docs/audits/") ? "historical_audits" : file.split("/")[0];
  const row = directories[category] ??= { files: 0, bytes: 0 }; row.files++; row.bytes += fs.statSync(file).size; }
write("inventory.json", { observedAt: new Date().toISOString(), inventoryRef, scope: "baseline Git tree; B8 artifacts excluded; static sites are not executed test counts",
  trackedFiles: files.length, directories, moduleCount: moduleInventory.length,
  largestModules: moduleInventory.filter((r) => r.file.startsWith("src/")).sort((a, b) => b.lines - a.lines).slice(0, 25),
  tests: testInventory, sql: sqlInventory, imports,
  zeroIncomingSourceModules: moduleInventory.filter((r) => r.file.startsWith("src/") && !r.entrypoint && !imports.some((i) => i.resolved === r.file)),
});
if (process.argv.includes("--final")) {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  const changed = baseline.protected.filter((r) => !fs.existsSync(r.file) || hash(fs.readFileSync(r.file)) !== r.sha256);
  write("preservation.json", { observedAt: new Date().toISOString(), protectedCount: baseline.protected.length,
    changed, branch: git("branch", "--show-current"), master: git("rev-parse", "master"),
    functionalDiff: git("diff", "--name-only", "37cb7f85e96e551d6419871f94dd950712e2565b", "--", "src", "supabase/migrations", "tests", "scripts", "package.json", "package-lock.json"),
    preexistingAuditToolingDiff: git("diff", "--name-only", "37cb7f85e96e551d6419871f94dd950712e2565b", inventoryRef, "--", "requirements-audit.txt"),
    auditRequirementsUnchangedSinceBaseline: baseline.protected.find((r) => r.file === "requirements-audit.txt").sha256 === hash(fs.readFileSync("requirements-audit.txt")),
    dataOperations: "Only four constant VALUES/SELECT cases in READ ONLY transaction; no business-row query, DML, fixture, reset, restore, external message or mutable remote API executed by B8 instruments.",
  });
}
console.log(JSON.stringify({ tests: testInventory.length, sqlFiles: sqlInventory.length,
  protectedFiles: protectedFiles.length, sourceModules: moduleInventory.length, imports: imports.length }));
