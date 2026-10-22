import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const historical = JSON.parse(readFileSync("scripts/historical-migrations.json", "utf8"));
const problems = [];
for (const [file, digest] of Object.entries(historical)) {
  try {
    if (createHash("sha256").update(readFileSync(file, "utf8").replaceAll("\r\n", "\n")).digest("hex") !== digest) problems.push(`Historical migration changed: ${file}`);
  } catch { problems.push(`Historical migration missing: ${file}`); }
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
for (const file of [...files("src"), ...files("supabase/migrations").filter((name) => !Object.hasOwn(historical, name.replaceAll("\\", "/")))]) {
  if (!/\.(?:tsx?|sql)$/.test(file)) continue;
  if (/\b(?:requestedQuantity|requested_quantity)\b/.test(readFileSync(file, "utf8"))) problems.push(`Removed requisition field in active source: ${relative(process.cwd(), file)}`);
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`Contract guard passed; ${Object.keys(historical).length} historical migrations unchanged.`);
