import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { createClient } from "@supabase/supabase-js";
import { testDataRoot } from "../../scripts/test-environment.mjs";
import { testSigningIdentity } from "../support/test-signing-identity.mjs";
import { env, rpc } from "./v4-fixtures.mjs";

export function archiveIntention(review, reason, key = randomUUID()) {
  return {
    p_document: review.documentId, p_key: key, p_version: review.version,
    p_reference: review.referenceHash, p_mode: "other", p_reason: reason,
  };
}

export async function sealSignedArchive(client, intent) {
  const attempt = await rpc(client, "prepare_document_archive", intent);
  const worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
  const identity = await testSigningIdentity();
  const variables = {
    NEXT_PUBLIC_SUPABASE_URL: env.url, SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
    HCA_PDF_TRUST_POLICY: "", HCA_PDF_SIGNING_SECRET: "",
    HCA_PDF_TRUST_POLICY_FILE: identity.trustFile, HCA_PDF_SIGNING_SECRET_FILE: identity.secretFile,
  };
  const previous = Object.fromEntries(Object.keys(variables).map(key => [key, process.env[key]]));
  const bundle = join(testDataRoot, "signed-archive-" + randomUUID() + ".cjs");
  try {
    mkdirSync(testDataRoot, { recursive: true });
    await build({
      stdin: { contents: 'export { issueSystemDocumentPdf } from "@/lib/server/pdf-issuance";', resolveDir: process.cwd(), loader: "ts" },
      bundle: true, packages: "external", platform: "node", format: "cjs", outfile: bundle, logLevel: "silent",
    });
    Object.assign(process.env, variables);
    const { issueSystemDocumentPdf } = createRequire(import.meta.url)(bundle);
    const issued = await issueSystemDocumentPdf(worker, attempt.id, "http://127.0.0.1:3100");
    assert.equal(issued.state, "ready");
    const result = await rpc(client, "commit_document_archive", { p_document: intent.p_document, p_request: attempt.id });
    assert.equal(result.issuanceId, issued.id);
    return result;
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    try { rmSync(bundle, { force: true }); }
    finally { await identity.dispose(); }
  }
}
