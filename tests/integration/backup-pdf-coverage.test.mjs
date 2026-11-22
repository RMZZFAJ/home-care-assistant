import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { getTestEnvironment, testContainer } from "../../scripts/test-environment.mjs";
import { trustedExecutable } from "../../scripts/trusted-executable.mjs";
import { assertProbeDatabase, verifyRegisteredPdfCapture } from "../../scripts/restore-backup-probe.mjs";

test("isolated restore coverage accepts pre-D-B schemas and requires every ready signed PDF", () => {
  getTestEnvironment();
  const database = assertProbeDatabase("hca_restore_probe_" + randomBytes(6).toString("hex"));
  const docker = trustedExecutable("docker");
  const run = (args, input) => execFileSync(docker, args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = (input) => run(["exec", "-i", testContainer, "psql", "-X", "-U", "supabase_admin", "-d", assertProbeDatabase(database), "-v", "ON_ERROR_STOP=1", "-At"], input);
  const bytes = readFileSync("docs/audits/D/D-B/d4-source-facts-proof/private-draft.pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  run(["exec", testContainer, "createdb", "-U", "supabase_admin", "--template=template0", database]);
  try {
    sql(`revoke connect on database ${database} from public,anon,authenticated,service_role;
      create schema private;
      create table public.document_pdfs(object_path text,sha256 text);
      create table public.document_pdf_renders(object_path text,sha256 text);
      insert into public.document_pdfs values('original.pdf','${digest}');
      insert into public.document_pdf_renders values('v4.pdf','${digest}');`);
    const storage = { objects: ["original.pdf", "v4.pdf"].map(name => ({ bucket: "document-receipts", name, sha256: digest })) };
    assert.deepEqual(verifyRegisteredPdfCapture(sql, storage), { pdfDigestsVerified: 2, signedIssuanceDigestsVerified: 0 });
    sql(`create table private.pdf_issuances(object_path text,sha256 text,state text);
      insert into private.pdf_issuances values('signed.pdf','${digest}','ready'),('not-yet-uploaded.pdf',null,'uncertain');`);
    assert.throws(() => verifyRegisteredPdfCapture(sql, storage), /must exist/);
    storage.objects.push({ bucket: "document-receipts", name: "signed.pdf", sha256: digest });
    assert.deepEqual(verifyRegisteredPdfCapture(sql, storage), { pdfDigestsVerified: 3, signedIssuanceDigestsVerified: 1 });
    storage.objects[2].sha256 = createHash("sha256").update(Buffer.concat([bytes, Buffer.from("modified")])).digest("hex");
    assert.throws(() => verifyRegisteredPdfCapture(sql, storage), /digest must match/);
    assert.equal(sql("select count(*) from pg_extension where extname in ('pg_cron','pg_net');").trim(), "0");
  } finally {
    run(["exec", testContainer, "dropdb", "-U", "supabase_admin", "--if-exists", assertProbeDatabase(database)]);
  }
});
