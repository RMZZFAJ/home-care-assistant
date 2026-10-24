import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const posix = (value) => value.split(path.sep).join("/");
async function walk(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(name) : [name];
  }));
  return files.flat().filter((name) => name.endsWith(".tsx")).sort();
}
const files = [...await walk("src/app"), ...await walk("src/components")];
const records = await Promise.all(files.map(async (file) => {
  const source = await readFile(path.join(root, file), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = [];
  const exports = [];
  const headings = [];
  let stateHooks = 0;
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      imports.push(specifier.startsWith("@/") ? `src/${specifier.slice(2)}` :
        specifier.startsWith(".") ? posix(path.normalize(path.join(path.dirname(file), specifier))) : specifier);
    }
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      exports.push(node.name?.text ?? "default");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "useState") stateHooks++;
    if (ts.isJsxElement(node) && /^h[1-6]$/.test(node.openingElement.tagName.getText(tree))) {
      const text = node.children.filter(ts.isJsxText).map((child) => child.text.trim()).join(" ");
      if (text) headings.push(text.replaceAll(/\s+/g, " "));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { file: posix(file), lines: source.split(/\r?\n/).length, imports, exports, headings, stateHooks,
    kind: path.basename(file) === "page.tsx" ? "page" : path.basename(file) === "layout.tsx" ? "layout" : "component" };
}));
const report = { base: "d467f92", records };
await writeFile(path.join(root, "docs/ui-ux/inventory.json"), JSON.stringify(report, null, 2) + "\n");
const lines = ["# Inventário de interface", "", "Gerado por scripts/inventory-ui.mjs. O JSON adjacente registra dependências,", "exports e pontos de estado, incluindo componentes renderizados indiretamente."];
for (const [title, selected] of [
  ["Páginas e layouts", records.filter((row) => row.kind !== "component")],
  ["Componentes", records.filter((row) => row.file.startsWith("src/components/"))],
]) {
  lines.push("", `## ${title}`);
  for (const row of selected) {
    lines.push("", `### ${row.file}`, "", `Linhas: ${row.lines}. Estados locais: ${row.stateHooks}.`);
    const internal = row.imports.filter((value) => value.startsWith("src/"));
    if (internal.length) lines.push("", "Dependências internas:", "", ...internal.map((value) => `- ${value}`));
  }
}
lines.push("", "## Cobertura de estados", "", "Cada área deve ser verificada em carregamento, vazio, erro, bloqueio por", "capacidade, conflito, processamento e resultado real. A matriz de homologação", "registrará variações por contexto, paciente, documento e largura de tela.", "");
await writeFile(path.join(root, "docs/ui-ux/INVENTORY.md"), lines.join("\n"));
console.log(`Inventário: ${records.filter((row) => row.kind === "page").length} páginas, ${records.filter((row) => row.file.startsWith("src/components/")).length} arquivos de componentes.`);
