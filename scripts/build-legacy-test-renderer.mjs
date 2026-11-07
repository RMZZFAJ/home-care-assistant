import { build } from "esbuild";
import { getTestEnvironment } from "./test-environment.mjs";
getTestEnvironment();
await build({
  entryPoints: ["src/lib/server/operational-pdf.ts"],
  outfile: ".generated/legacy-test-renderer.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  logLevel: "warning",
});
