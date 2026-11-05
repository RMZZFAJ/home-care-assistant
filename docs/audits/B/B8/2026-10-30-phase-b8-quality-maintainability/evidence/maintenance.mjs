import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const out = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const tracked = execFileSync("git", ["ls-tree", "-r", "--name-only", "-z", "294382b56e10c7c7c38a4d94bc91bacffb01ee3f"], { encoding: "utf8" }).split("\0").filter(Boolean);
const text = (file) => fs.readFileSync(file, "utf8");
const write = (name, rows) => fs.writeFileSync(path.join(out, name), JSON.stringify(rows, null, 2) + "\n");
const candidates = ["src/components/requisitions/requisition-history.tsx", "src/components/stock/inventory-console.tsx",
  "src/components/requisitions/print-button.tsx", "src/components/app-shell.tsx", "src/types/operations.ts",
  ...tracked.filter((f) => /^public\/[^/]+\.svg$/.test(f)), "src/app/inventarios/page.tsx"];
const code = tracked.filter((f) => /\.(?:[cm]?[jt]sx?|css|json|md)$/.test(f));
write("consumer-review.json", candidates.map((file) => {
  const body = text(file);
  const names = [...body.matchAll(/export\s+(?:async\s+)?(?:function|(?:type|interface)\s*)\s*(\w+)/g)].map((m) => m[1]);
  const stem = path.basename(file).replace(/\.[^.]+$/, "");
  const tokens = file.endsWith("page.tsx") ? ["/inventarios"] : file.endsWith(".svg") ? [path.basename(file)] : [...names, stem];
  const references = [];
  for (const other of code.filter((f) => f !== file)) {
    const lines = text(other).split(/\r?\n/);
    lines.forEach((line, index) => { if (tokens.some((token) => line.includes(token))) references.push({ file: other, line: index + 1 }); });
  }
  return { file, names, references, caveat: "Tracked lexical references and AST import graph; no access-log or external-bookmark census" };
}));
const scriptFiles = tracked.filter((f) => /^(?:scripts\/|docs\/audits\/)/.test(f) && /\.(?:mjs|cjs|js|py|sh)$/.test(f));
write("tool-review.json", scriptFiles.map((file) => {
  const lines = text(file).split(/\r?\n/);
  const anchors = [];
  lines.forEach((line, index) => {
    const kinds = [
      ["write", /writeFile|write_text|write_bytes|open\(.+["']w|\.save\(/],
      ["process", /execFile|spawnSync|subprocess|os\.system/],
      ["remote_candidate", /--linked|db push|graph\.facebook|supabase\.co|qwfrqychokvhdzakibid/],
      ["historical_output", /(?:root|out|destination|output|write|save|base).{0,80}docs\/audits\/2026-/i],
      ["guard", /begin read only|--local|assertLocalReplay|getTestEnvironment|--dry-run|--apply/],
    ].filter(([, pattern]) => pattern.test(line)).map(([kind]) => kind);
    if (kinds.length) anchors.push({ line: index + 1, kinds });
  });
  return { file, lines: lines.length, anchors, interpretation: "Discovery flags require source review; not proof that a script is unsafe or was executed" };
}));
const docs = ["README.md", "AGENTS.md", ...["ARCHITECTURE", "DATABASE", "API", "SECURITY", "TESTING", "OPERATIONS", "DEPLOYMENT", "PROJECT_STATUS"].map((name) => `docs/${name}.md`)];
const links = [];
for (const file of docs) {
  const body = text(file);
  for (const match of body.matchAll(/\]\((<?[^)]+>?)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split(/\s+"/)[0];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const resolved = path.normalize(path.join(path.dirname(file), decodeURIComponent(target.split("#")[0])));
    links.push({ file, target, resolved: resolved.replaceAll("\\", "/"), exists: fs.existsSync(resolved) });
  }
}
write("documentation-links.json", { scope: docs, method: "Inline local file links only; external URLs, reference definitions and heading anchors reviewed separately", links });
const pkg = JSON.parse(text("package.json"));
const active = tracked.filter((f) => !f.startsWith("docs/") && !["package.json", "package-lock.json"].includes(f) && /\.(?:[cm]?[jt]sx?|css|json)$/.test(f));
write("dependency-consumers.json", Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).map(([name, version]) => ({
  name, version, kind: Object.hasOwn(pkg.dependencies, name) ? "runtime" : "development",
  references: active.filter((file) => text(file).includes(name)),
  caveat: "Negative lexical matches do not prove lack of implicit TypeScript, compiler, script-bin or peer consumption",
})));
const discoveryFile = path.join(out, "browser-discovery.json");
const report = fs.existsSync(discoveryFile) && !process.argv.includes("--discover") ? null
  : JSON.parse(execFileSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--list", "--reporter=json"], { encoding: "utf8" }));
const discovered = report ? [] : JSON.parse(text(discoveryFile)).cases;
function visit(suites) { for (const suite of suites ?? []) { for (const spec of suite.specs ?? []) {
  for (const test of spec.tests) discovered.push({ file: spec.file, line: spec.line, title: spec.title, project: test.projectName });
} visit(suite.suites); } }
if (report) {
  visit(report.suites);
  write("browser-discovery.json", { command: "Playwright test --list --reporter=json; no server/globalSetup/test execution", cases: discovered });
}
console.log(JSON.stringify({ candidates: candidates.length, scripts: scriptFiles.length, docLinks: links.length, brokenInlineLinks: links.filter((r) => !r.exists).length,
  dependencies: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length, browserCases: discovered.length }));
