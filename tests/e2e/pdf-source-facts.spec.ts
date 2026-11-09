import { selectDocumentSection } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import {
  sourceFactsFixture,
  historicalSourceFixture,
} from "../integration/pdf-source-facts-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import {
  pdfIssuanceSchema,
  type PdfIssuance,
} from "../../src/lib/documents/pdf-issuance";
test.setTimeout(180000);
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
test("PDF atual assina fatos de rascunho e origens físicas conhecida e desconhecida; intenção V5 permanece recuperável", async ({
  page,
}, info) => {
  const privateSource = await sourceFactsFixture(),
    unknown = await historicalSourceFixture(),
    known = await historicalSourceFixture({ knownDate: true }),
    corpus = [];
  await login(page, privateSource.patient);
  for (const [label, f] of [
    ["private-draft", privateSource],
    ["historical-null", unknown],
    ["historical-known", known],
  ] as const) {
    await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "files");
    await selectContext(page, f.patient);
    const files = page.getByRole("region", {
      name: "Arquivos gerados",
      exact: true,
    });
    const originalName =
      label === "private-draft"
        ? sql(
            `select full_name from public.profiles where id=${sqlLiteral(fixtures.family.id)};`,
          )
        : null;
    let row: PdfIssuance;
    try {
      if (originalName !== null)
        sql(
          `update public.profiles set full_name='Solicitante atual fictício após o ato' where id=${sqlLiteral(fixtures.family.id)};`,
        );
      const generated = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/documents/${f.doc.id}/issuances` &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Gerar PDF", exact: true })
        .click();
      const result = await generated;
      expect(result.status(), await result.text()).toBe(200);
      row = pdfIssuanceSchema.parse(await result.json());
      await expect(
        files.locator(
          `a[download][href="/api/documents/${f.doc.id}/pdf?issuance=${row.id}"]`,
        ),
      ).toBeVisible();
      if (originalName !== null)
        expect(row.requestedName).toBe("Solicitante atual fictício após o ato");
    } finally {
      if (originalName !== null)
        sql(
          `update public.profiles set full_name=${sqlLiteral(originalName)} where id=${sqlLiteral(fixtures.family.id)};`,
        );
    }
    expect(row).toMatchObject({
      state: "ready",
      rendererRevision: 10,
      validation: { accepted: true, profile: "PAdES-B-T", wholeFile: true },
    });
    await rpc(f.owner, "select_active_context", { p_patient: f.patient });
    const frozen = await rpc(f.owner, "pdf_issuance", { p_id: row.id }),
      facts = frozen.snapshot.sourceFacts;
    expect(facts.historical).toBe(label !== "private-draft");
    if (label === "historical-null") {
      expect(facts.sourceCreatedAt).toBeNull();
      expect(facts.issuedAt).toBeNull();
    }
    if (label === "historical-known")
      expect(facts.sourceCreatedAt).toContain("2020-03-01");
    if (label === "private-draft")
      expect(facts.draftCreatedAt).toContain("2026-11-01");
    if (originalName !== null) {
      expect(facts.issuerName).toBe(originalName);
      expect(facts.issuerId).toBe(fixtures.family.id);
    }
    const response = await page.request.get(
      `/api/documents/${f.doc.id}/pdf?issuance=${row.id}`,
    );
    expect(response.status()).toBe(200);
    const bytes = await response.body();
    expect(hash(bytes)).toBe(row.sha256);
    expect(
      (
        await (
          await page.request.get(
            `/api/documents/${f.doc.id}/pdf?issuance=${row.id}`,
          )
        ).body()
      ).equals(bytes),
    ).toBe(true);
    expect(
      sql(
        `select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${row.version};`,
      ),
    ).toBe(frozen.sourceHash);
    if (info.project.name === "chromium") {
      mkdirSync("output/pdf/phase-d/facts", { recursive: true });
      const file = `output/pdf/phase-d/facts/${label}-${row.id}.pdf`;
      writeFileSync(file, bytes, { flag: "wx" });
      corpus.push({
        label,
        file,
        sha256: row.sha256,
        requestedAt: row.requestedAt,
        requestedName: row.requestedName,
        sourceHash: frozen.sourceHash,
        sourceFacts: facts,
      });
    }
    if (label === "private-draft") {
      // Controlled legacy reservation only, never a fake signed/ready artifact.
      const oldId = randomUUID(),
        oldKey = randomUUID();
      sql(
        `insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,idempotency_key,request_hash,verification_code,renderer_revision,representation,source_hash,snapshot,object_path) select ${sqlLiteral(oldId)},document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,${sqlLiteral(oldKey)},encode(extensions.digest(jsonb_build_array('pdf-issuance',document_id,version)::text,'sha256'),'hex'),upper(encode(extensions.gen_random_bytes(16),'hex')),5,representation,source_hash,snapshot-'sourceFacts'-'documentFacts','issuances/'||document_id||'/'||${sqlLiteral(oldId)}||'.pdf' from private.pdf_issuances where id=${sqlLiteral(row.id)};`,
      );
      const recovered = await page.request.post(
        `/api/documents/${f.doc.id}/issuances`,
        { data: { idempotencyKey: oldKey, version: row.version } },
      );
      expect(recovered.status(), await recovered.text()).toBe(200);
      expect(await recovered.json()).toMatchObject({
        id: oldId,
        rendererRevision: 5,
        state: "ready",
        validation: { accepted: true },
      });
      const original = await page.request.get(
        `/api/documents/${f.doc.id}/pdf?issuance=${oldId}`,
      );
      expect(original.status()).toBe(200);
      expect(hash(await original.body())).toBe((await recovered.json()).sha256);
    }
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      await audit(page, "V6 generated files " + label + " " + width);
    }
  }
  if (info.project.name === "chromium") {
    const policyFile = process.env.HCA_PDF_TRUST_POLICY_FILE;
    if (!policyFile)
      throw new Error(
        "The guarded runner must supply its public trust fixture",
      );
    const policy = JSON.parse(readFileSync(policyFile, "utf8"));
    writeFileSync(
      "output/pdf/phase-d/facts/public-root.crt",
      policy.roots[0].pem,
    );
    writeFileSync(
      "output/pdf/phase-d/facts/CORPUS.json",
      JSON.stringify(corpus, null, 2) + "\n",
    );
  }
});
test("PDF atual recusa caractere sem representação antes de assinar ou persistir arquivo", async ({
  page,
}) => {
  const f = await sourceFactsFixture({
    notes: "Nota original contém caractere não representável 漢",
  });
  await login(page, f.patient);
  await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "files");
  const files = page.getByRole("region", {
      name: "Arquivos gerados",
      exact: true,
    }),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    before = sql(
      `select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=1;`,
    );
  const sent = page.waitForResponse(
    (r) => r.url().endsWith(endpoint) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  const response = await sent;
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({
    code: "CONTENT_INVALID",
    retryable: false,
  });
  await expect(files.getByRole("alert")).toContainText(
    "caracteres ainda não suportados",
  );
  await expect(
    files.getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(0);
  const rows = (
    await (await page.request.get(`/api/documents/${f.doc.id}/archive`)).json()
  ).data;
  expect(rows).toHaveLength(1);
  expect(rows[0].issuance).toMatchObject({
    state: "uncertain",
    step: "uncertain",
    lastError: "CONTENT_INVALID",
    sha256: null,
    rendererRevision: 10,
  });
  expect(
    sql(
      `select count(*) from storage.objects where bucket_id='document-receipts' and name like ${sqlLiteral("issuances/" + f.doc.id + "/%")};`,
    ),
  ).toBe("0");
  expect(
    sql(
      `select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=1;`,
    ),
  ).toBe(before);
});
