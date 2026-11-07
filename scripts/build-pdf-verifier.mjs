import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".generated", { recursive: true });
const result = await build({
  entryPoints: ["src/lib/server/pdf-signing/public-worker.ts"],
  outfile: ".generated/pdf-verifier.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  metafile: true,
  logLevel: "warning",
});
await writeFile(
  ".generated/pdf-verifier-meta.json",
  JSON.stringify(result.metafile),
);
