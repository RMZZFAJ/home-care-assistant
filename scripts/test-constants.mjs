import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Per-workspace credentials stay in ignored local state, never in source or logs.
const directory = join(process.cwd(), "supabase", ".temp");
const credentials = join(directory, "hca-test-credentials.json");
mkdirSync(directory, { recursive: true });
if (!existsSync(credentials))
  writeFileSync(
    credentials,
    JSON.stringify({ password: "Hca1!" + randomBytes(32).toString("hex") }),
    { flag: "wx", mode: 0o600 },
  );
export const fixturePassword = JSON.parse(
  readFileSync(credentials, "utf8"),
).password;
export const patientA = "20000000-0000-4000-8000-000000000001";
export const patientB = "20000000-0000-4000-8000-000000000002";
export const legacyRequisition = "30000000-0000-4000-8000-000000000001";
