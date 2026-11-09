import { selectDocumentSection } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import {
  setup,
  actor,
  rpc,
  fixtures,
  env,
  issue,
  delivery,
} from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { createClient } from "@supabase/supabase-js";
import { legacyPdfFixture } from "../support/legacy-pdf-fixtures.mjs";
test.setTimeout(180000);
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
async function fixture(page: Page) {
  const f = await setup(),
    owner = await actor("family", f.patient),
    doc = await rpc(owner, "create_supply_document", {
      p_patient: f.patient,
      p_type: "COM",
      p_payload: {
        origin: "purchase",
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/historico/${doc.id}`);
  await selectDocumentSection(page, "files");
  return { ...f, doc, owner };
}
test("PDF recupera intenção após resposta inválida, mantém bytes e permite nova emissão explícita", async ({
  page,
}, info) => {
  const f = await fixture(page),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    files = page.getByRole("region", { name: "Arquivos gerados", exact: true });
  await expect(
    files.getByText("Nenhum arquivo registrado nesta consulta.", {
      exact: false,
    }),
  ).toBeVisible();
  const keys: string[] = [];
  let lost = true;
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().idempotencyKey);
    const response = await route.fetch();
    expect(response.status(), await response.text()).toBe(200);
    if (lost) {
      lost = false;
      await route.fulfill({ status: 200, json: { state: "ready" } });
    } else await route.fulfill({ response });
  });
  await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(
    files.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    files.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await files
    .getByRole("button", { name: "Recuperar emissão", exact: true })
    .click();
  await expect(
    files.getByRole("button", { name: "Gerar PDF", exact: true }),
  ).toBeEnabled();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  let rows = (await (await page.request.get(endpoint)).json()).data;
  expect(rows).toHaveLength(1);
  const first = rows[0];
  expect(first.validation).toMatchObject({
    accepted: true,
    profile: "PAdES-B-T",
    signerTrust: "internal",
    timestampTrust: "internal",
    externalTimeIndependence: false,
  });
  const download = async (id: string) => {
    const r = await page.request.get(
      `/api/documents/${f.doc.id}/pdf?issuance=${id}`,
    );
    expect(r.status(), r.status() === 200 ? "" : await r.text()).toBe(200);
    return r.body();
  };
  const a = await download(first.id),
    b = await download(first.id);
  expect(hash(a)).toBe(first.sha256);
  expect(a.equals(b)).toBe(true);
  await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(
    files.getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(2);
  rows = (await (await page.request.get(endpoint)).json()).data;
  expect(rows).toHaveLength(2);
  expect(rows[0].id).not.toBe(first.id);
  expect(rows[0].version).toBe(first.version);
  expect(hash(await download(rows[0].id))).not.toBe(first.sha256);
  const publicResponse = await page.request.get(
    `/api/verification?code=${first.verificationCode}`,
  );
  expect(publicResponse.status()).toBe(200);
  const publicResult = (await publicResponse.json()).reference;
  expect(publicResult).toMatchObject({
    found: true,
    bytesMatch: null,
    sha256: first.sha256,
  });
  expect(
    Object.keys(publicResult).some((k) =>
      /patient|careRecipient|requestedName|snapshot|objectPath|documentId/i.test(
        k,
      ),
    ),
  ).toBe(false);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await audit(page, "generated-files");
  if (info.project.name === "chromium") {
    mkdirSync("output/pdf/d4-pipeline", { recursive: true });
    writeFileSync("output/pdf/d4-pipeline/com-signed.pdf", a);
    writeFileSync(
      "output/pdf/d4-pipeline/receipt.json",
      JSON.stringify(first, null, 2),
    );
    const trust = JSON.parse(
      readFileSync(process.env.HCA_PDF_TRUST_POLICY_FILE!, "utf8"),
    );
    writeFileSync("output/pdf/d4-pipeline/root-public.crt", trust.roots[0].pem);
  }
});
test("PDF recupera o objeto após falha no registro ready e recusa cache adulterado", async ({
  page,
}) => {
  const f = await fixture(page),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    key = randomUUID(),
    trigger = "phase_d4_ready_" + f.doc.id.replaceAll("-", "");
  sql(
    `create function private.${trigger}() returns trigger language plpgsql set search_path='' as $$begin if new.document_id=${sqlLiteral(f.doc.id)} and new.state='ready' then raise exception 'controlled PDF ready fault' using errcode='P0001';end if;return new;end;$$; create trigger ${trigger} before update on private.pdf_issuances for each row execute function private.${trigger}();`,
  );
  try {
    const failed = await page.request.post(endpoint, {
      data: { idempotencyKey: key },
    });
    expect(failed.ok()).toBe(false);
  } finally {
    sql(
      `drop trigger ${trigger} on private.pdf_issuances;drop function private.${trigger}();`,
    );
  }
  const r = (await (await page.request.get(endpoint)).json()).data[0];
  expect(r.state).toBe("uncertain");
  const stored = JSON.parse(
    sql(
      `select jsonb_build_object('path',r.object_path,'size',(o.metadata->>'size')::int) from private.pdf_issuances r join storage.objects o on o.bucket_id='document-receipts' and o.name=r.object_path where r.id=${sqlLiteral(r.id)};`,
    ),
  );
  expect(stored.size).toBeGreaterThan(1000);
  const service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    bucket = service.storage.from("document-receipts"),
    prior = await bucket.download(stored.path);
  expect(prior.error).toBeNull();
  const bytes = Buffer.from(await prior.data!.arrayBuffer());
  const retried = await page.request.post(endpoint, {
    data: { idempotencyKey: key },
  });
  expect(retried.status(), await retried.text()).toBe(200);
  const recovered = await retried.json();
  expect(recovered.id).toBe(r.id);
  expect(recovered.sha256).toBe(hash(bytes));
  expect(
    sql(
      `select attempts from private.pdf_issuances where id=${sqlLiteral(r.id)};`,
    ),
  ).toBe("2");
  const changed = Buffer.from(bytes);
  changed[8] ^= 1;
  expect(
    (
      await bucket.update(stored.path, changed, {
        contentType: "application/pdf",
      })
    ).error,
  ).toBeNull();
  try {
    const denied = await page.request.get(
      `/api/documents/${f.doc.id}/pdf?issuance=${r.id}`,
    );
    expect(denied.status()).toBe(503);
    expect(await denied.json()).toMatchObject({ code: "PDF_BYTES_DIVERGE" });
  } finally {
    expect(
      (
        await bucket.update(stored.path, bytes, {
          contentType: "application/pdf",
        })
      ).error,
    ).toBeNull();
  }
  const repeated = await page.request.get(
    `/api/documents/${f.doc.id}/pdf?issuance=${r.id}`,
  );
  expect(repeated.status()).toBe(200);
  expect(hash(await repeated.body())).toBe(recovered.sha256);
  expect(
    sql(`select count(*) from pg_trigger where tgname=${sqlLiteral(trigger)};`),
  ).toBe("0");
});
test("PDF em REQ, ENT e BAL conserva fonte e estoque e exige leitura privada atual", async ({
  page,
}, info) => {
  const f = await fixture(page),
    req = await issue(f.patient, f.products),
    ent = await delivery(f.patient, req, f.products),
    bal = await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient,
      p_type: "BAL",
      p_payload: {
        lines: f.products.map((productId: string) => ({
          productId,
          quantity: "1",
        })),
        notes: "Observação original da contagem fictícia",
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  const source = (id: string) =>
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
    );
  for (const [type, doc] of [
    ["REQ", req],
    ["ENT", ent],
    ["BAL", bal],
  ] as const) {
    await page.goto(`/historico/${doc.id}`);
  await selectDocumentSection(page, "files");
    const files = page.getByRole("region", {
      name: "Arquivos gerados",
      exact: true,
    });
    await expect(
      files.getByRole("button", { name: "Gerar PDF", exact: true }),
    ).toBeEnabled();
    const before = source(doc.id);
    await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
    await expect(
      files.getByRole("link", { name: "Baixar PDF", exact: true }),
    ).toHaveCount(1);
    expect(source(doc.id)).toBe(before);
    const row = (
        await (
          await page.request.get(`/api/documents/${doc.id}/issuances`)
        ).json()
      ).data[0],
      url = `/api/documents/${doc.id}/pdf?issuance=${row.id}`,
      response = await page.request.get(url);
    expect(response.status()).toBe(200);
    if (info.project.name === "chromium") {
      mkdirSync("output/pdf/d4-pipeline", { recursive: true });
      writeFileSync(
        `output/pdf/d4-pipeline/${type.toLowerCase()}-signed.pdf`,
        await response.body(),
      );
      writeFileSync(
        `output/pdf/d4-pipeline/${type.toLowerCase()}-receipt.json`,
        JSON.stringify(row, null, 2),
      );
    }
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},${sqlLiteral(type.toLowerCase() + ".read")},false);`,
    );
    try {
      expect((await page.request.get(url)).status()).toBe(403);
      expect(
        (await page.request.get(`/api/documents/${doc.id}/issuances`)).status(),
      ).toBe(403);
    } finally {
      sql(
        `delete from public.capability_overrides where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability=${sqlLiteral(type.toLowerCase() + ".read")};`,
      );
    }
  }
});

test("Acervo preserva originais e V4, recusa bytes divergentes e emite versão histórica explicitamente", async ({
  page,
}, info) => {
  const f = await fixture(page),
    url = `/api/documents/${f.doc.id}`,
    business = () =>
      sql(
        `select jsonb_build_object('doc',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.doc.id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.doc.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'files',(select count(*) from storage.objects where bucket_id='document-receipts' and name like ${sqlLiteral("%" + f.doc.id + "%")}),'issuances',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)}));`,
      );
  const before = business();
  const absent = await page.request.get(`${url}/pdf?version=1`);
  expect(absent.status()).toBe(404);
  expect(await absent.json()).toMatchObject({ code: "PDF_NOT_GENERATED" });
  expect(business()).toBe(before);
  expect(
    (await (await page.request.get(`${url}/archive`)).json()).data,
  ).toEqual([]);
  const legacy = await legacyPdfFixture(f.owner, f.doc.id),
    metadata = () =>
      sql(
        `select jsonb_build_object('original',(select to_jsonb(p) from public.document_pdfs p where document_id=${sqlLiteral(f.doc.id)}),'render',(select to_jsonb(p) from public.document_pdf_renders p where document_id=${sqlLiteral(f.doc.id)}));`,
      ),
    frozen = metadata();
  const read = async (renderer: string) => {
    const r = await page.request.get(
      `${url}/pdf?version=1&renderer=${renderer}`,
    );
    expect(r.status(), await r.text().then((t) => t.slice(0, 80))).toBe(200);
    return r.body();
  };
  expect(hash(await read("legacy"))).toBe(legacy.hash);
  expect(hash(await read("4"))).toBe(legacy.hash);
  const unsigned = await page.request.post("/api/verification", {
    headers: { "content-type": "application/pdf" },
    data: legacy.bytes,
  });
  expect(unsigned.status(), await unsigned.text()).toBe(200);
  expect(await unsigned.json()).toMatchObject({
    reference: { found: false },
    legacy: { found: true, sha256: legacy.hash },
    analysis: { status: "unsigned", documentSignature: "absent" },
  });
  const changed = Buffer.from(legacy.bytes);
  changed[8] ^= 1;
  const bucket = legacy.service.storage.from("document-receipts"),
    path = `${f.doc.id}/1.pdf`;
  expect(
    (await bucket.update(path, changed, { contentType: "application/pdf" }))
      .error,
  ).toBeNull();
  try {
    const denied = await page.request.get(
      `${url}/pdf?version=1&renderer=legacy`,
    );
    expect(denied.status()).toBe(503);
    expect(await denied.json()).toMatchObject({ code: "PDF_BYTES_DIVERGE" });
  } finally {
    expect(
      (
        await bucket.update(path, legacy.bytes, {
          contentType: "application/pdf",
        })
      ).error,
    ).toBeNull();
  }
  expect(hash(await read("legacy"))).toBe(legacy.hash);
  expect(metadata()).toBe(frozen);
  const current = await rpc(f.admin, "supply_document_command", {
    p_id: f.doc.id,
    p_action: "approve",
    p_body: { lines: [{ lineId: f.doc.lines[0].id, quantity: "1" }] },
    p_key: randomUUID(),
    p_version: f.doc.version,
  });
  expect(current.version).toBeGreaterThan(1);
  await page.goto(`/documentos/${f.doc.id}/arquivos?version=1`);
  const files = page.getByRole("region", {
    name: "Arquivos gerados",
    exact: true,
  });
  await expect(
    files.getByText("Arquivo original registrado", { exact: false }),
  ).toBeVisible();
  await expect(
    files.getByText("Representação legada V4", { exact: false }),
  ).toBeVisible();
  await expect(
    files.getByText("assinatura incorporada não comprovada", { exact: false }),
  ).toHaveCount(2);
  await expect(
    files.getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(0);
  await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(
    files.getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(1);
  await expect(
    files.getByText("Nova representação de uma versão histórica", {
      exact: false,
    }),
  ).toBeVisible();
  const archive = (
    await (await page.request.get(`${url}/archive?version=1`)).json()
  ).data;
  expect(archive).toHaveLength(3);
  const signed = archive.find(
    (r: { kind: string }) => r.kind === "issuance",
  ).issuance;
  expect(signed).toMatchObject({
    version: 1,
    representation: "derived",
    validation: { accepted: true, profile: "PAdES-B-T" },
  });
  expect(new Date(signed.readyAt).getTime()).toBeGreaterThan(
    new Date(current.events.at(-1).createdAt).getTime(),
  );
  expect(metadata()).toBe(frozen);
  expect(hash(await read("4"))).toBe(legacy.hash);
  let fail = true;
  await page.route(`**${url}/archive?**`, async (route) => {
    if (fail)
      await route.fulfill({
        status: 500,
        json: {
          code: "INTERNAL_ERROR",
          error: "Consulta temporariamente indisponível.",
          retryable: true,
        },
      });
    else await route.continue();
  });
  await files
    .getByRole("button", { name: "Atualizar arquivos", exact: true })
    .click();
  await expect(files.getByRole("alert")).toContainText(
    "Consulta temporariamente indisponível",
  );
  fail = false;
  await files
    .getByRole("button", { name: "Atualizar arquivos", exact: true })
    .click();
  await expect(files.getByRole("alert")).toHaveCount(0);
  await page.unroute(`**${url}/archive?**`);
  await page
    .getByRole("link", {
      name: "Ver arquivos de todas as versões",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: /Todas as versões/ }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, "mixed PDF archive " + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/pdf-archive-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)};`,
  );
  expect([401, 403]).toContain(
    (await page.request.get(`${url}/archive`)).status(),
  );
  expect([401, 403]).toContain(
    (await page.request.get(`${url}/pdf?version=1&renderer=legacy`)).status(),
  );
  expect([401, 403]).toContain(
    (await page.request.get(`${url}/pdf?issuance=${signed.id}`)).status(),
  );
  // Live authority invalidation may already have unmounted the archive.
  // Require the whole private surface to disappear after real revocation.
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await expect(files).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Mudar perfil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Baixar arquivo legado", exact: true }),
  ).toHaveCount(0);
});
