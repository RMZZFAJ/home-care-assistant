import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const hash = createHash("sha256");
async function source(path) {
  for (const entry of (await readdir(path, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name, "en"),
  )) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await source(child);
    else if (entry.isFile()) {
      const bytes = await readFile(child);
      hash
        .update(child.replaceAll("\\", "/") + "\0")
        .update(
          /\.(tsx?|json|css|svg|mjs|js|html)$/.test(child)
            ? bytes.toString("utf8").replaceAll("\r\n", "\n")
            : bytes,
        );
    }
  }
}
await source("src");
await source("public/pwa");
for (const path of [
  "package-lock.json",
  "scripts/pwa-worker.js",
  "scripts/build-pwa.mjs",
  "public/offline.html",
])
  hash.update(path).update(await readFile(path));
const contract = JSON.parse(
  await readFile("src/lib/pwa/contract.json", "utf8"),
);
const build = { ...contract, revision: hash.digest("hex").slice(0, 24) };
const template = await readFile("scripts/pwa-worker.js", "utf8");
await writeFile(
  "public/service-worker.js",
  template.replace('"__HCA_PWA_BUILD__"', JSON.stringify(JSON.stringify(build))),
);
console.log("Public PWA worker built: " + build.revision);
