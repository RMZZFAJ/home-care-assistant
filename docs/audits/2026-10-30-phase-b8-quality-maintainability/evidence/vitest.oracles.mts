import path from "node:path";
import { writeFileSync } from "node:fs";
import ts from "typescript";
import { defineConfig } from "vitest/config";

const mode = process.env.HCA_B8_MUTANT ?? "baseline";
if (!["baseline", "blank-text", "wrong-title"].includes(mode)) {
  throw new Error("Unknown isolated B8 counterfactual");
}
const scratch = `.private/b8-quality/${mode}`;
export default defineConfig({
  cacheDir: path.join(process.cwd(), ".private/b8-quality/vite-cache", mode),
  plugins: [{
    name: "b8-memory-only-counterfactual",
    enforce: "pre",
    transform(code, id) {
      const file = id.replaceAll("\\", "/").split("?")[0];
      if (file.endsWith("/tests/document-pdf.test.ts")) {
        // Redirect only artifact destinations; leave the assertions unchanged.
        return code.replaceAll('".private/v4/pdf"', JSON.stringify(scratch))
          .replaceAll("`.private/v4/pdf/", "`" + scratch + "/")
          .replaceAll('"output/pdf"', JSON.stringify(scratch))
          .replaceAll('"output/pdf/bal-plantao-semanas.pdf"', JSON.stringify(scratch + "/bal-plantao-semanas.pdf"));
      }
      if (!file.endsWith("/src/lib/server/operational-pdf.ts") || mode === "baseline") return;
      const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
      let replacements = 0;
      const transformed = ts.transform(source, [(context) => {
        function visit(node: ts.Node): ts.VisitResult<ts.Node> {
          if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const method = node.expression.name.text;
            if ((mode === "blank-text" && method === "drawText") || (mode === "wrong-title" && method === "setTitle")) {
              replacements++;
              return ts.factory.updateCallExpression(node, node.expression, node.typeArguments,
                [ts.factory.createStringLiteral(mode === "blank-text" ? "" : "MUTANT_WRONG_TITLE"), ...node.arguments.slice(1)]);
            }
          }
          return ts.visitEachChild(node, visit, context);
        }
        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
      }]);
      if (replacements !== (mode === "blank-text" ? 4 : 1)) throw new Error("Counterfactual anchor changed");
      writeFileSync(path.join(import.meta.dirname, `mutation-${mode}.json`), JSON.stringify({ mode, replacements, file, sourceFilesEdited: false }, null, 2) + "\n");
      const result = ts.createPrinter().printFile(transformed.transformed[0]);
      transformed.dispose();
      return result;
    },
  }],
  resolve: { alias: { "@": path.join(process.cwd(), "src") } },
  test: {
    fsModuleCache: false,
    fsModuleCachePath: path.join(process.cwd(), ".private/b8-quality/module-cache", mode),
    environment: "node",
    include: ["tests/document-pdf.test.ts", "tests/operational-contracts.test.ts"],
    setupFiles: [path.join(import.meta.dirname, "no-network.ts")],
    testTimeout: 45000,
  },
});
