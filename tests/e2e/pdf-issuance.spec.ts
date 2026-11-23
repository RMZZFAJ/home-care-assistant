import { selectDocumentSection } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { finishGeneratedPdf, generateStandardPdf } from "./generated-pdf";
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
import type { PdfIssuance } from "@/lib/documents/pdf-issuance";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
test.setTimeout(180000);
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
async function fixture(page: Page, isolatedViewer = false) {
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
  const viewer = isolatedViewer ? await shiftWorker(f.patient, "family") : fixtures.family;
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(viewer.email);
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
  const f = await fixture(page, true),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    files = page.getByRole("region", { name: "Arquivos gerados", exact: true });
  const manualExemplars = async () => {
    const response = await page.request.get(endpoint);
    expect(response.ok(), await response.text()).toBe(true);
    const { data } = await response.json() as { data: PdfIssuance[] };
    return data.filter(row => row.requestedBy !== null);
  };
  await expect(files.getByText("PDF inicial", { exact: true })).toBeVisible();
  expect(await manualExemplars()).toHaveLength(0);
  const keys: string[] = [];
  let resumeRecovery!: () => void;
  const recoveryGate = new Promise<void>(resolve => { resumeRecovery = resolve; });
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().idempotencyKey);
    const attempt = keys.length;
    if (attempt === 2 || attempt === 3) {
      return route.fulfill({ status: 503, json: { code: "ISSUANCE_UNAVAILABLE", error: "Emissão temporariamente indisponível." } });
    }
    if (attempt === 4) await recoveryGate;
    const response = await route.fetch({ timeout: 65_000 });
    expect(response.status(), await response.text()).toBe(200);
    if (attempt === 1) {
      await route.fulfill({ status: 200, json: { state: "ready" } });
    } else await route.fulfill({ response });
  });
  await selectDocumentSection(page, "overview");
  await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  const options = page.getByRole("dialog", { name: "Gerar PDF", exact: true });
  await expect(options).toBeVisible();
  await options.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(keys).toEqual([]);
  await generateStandardPdf(page, false);
  const uncertain = page.getByRole("dialog", { name: "Emissão ainda não confirmada", exact: true });
  await expect(uncertain).toBeVisible({ timeout: 75_000 });
  await expect(uncertain).toContainText("A solicitação está preservada");
  await expect(page.getByRole("dialog", { name: "Exemplar disponível", exact: true })).toHaveCount(0);
  if (info.project.name === "chromium") {
    await page.emulateMedia({ reducedMotion: "reduce" });
    mkdirSync("output/playwright/l3", { recursive: true });
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(uncertain).toBeInViewport();
      if (width === 360) await audit(page, "emissão incerta em 360 px");
      await page.screenshot({ path: `output/playwright/l3/produto-e09-03-emissao-incerta-${width}.png`, animations: "disabled" });
    }
  }
  const checkResult = uncertain.getByRole("button", { name: "Conferir resultado", exact: true });
  await checkResult.click();
  await expect.poll(() => keys.length).toBe(2);
  await checkResult.click();
  const exhausted = page.getByRole("dialog", { name: "Não foi possível concluir a emissão", exact: true });
  await expect(exhausted.getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await expect(exhausted.getByRole("button", { name: "Conferir resultado", exact: true })).toHaveCount(0);
  await exhausted.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("tab", {name:"Arquivos",exact:true})).toHaveAttribute("aria-selected","true");
  await expect(
    page.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Recuperar emissão", exact: true })).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Recuperar emissão", exact: true })
    .click();
  try {
    const activity = page.locator(".hca-activity-overlay");
    await expect(activity).toContainText("Recuperando o exemplar");
    await expect(activity).toContainText("Consultando a solicitação");
  } finally {
    resumeRecovery();
  }
  const recovered = page.getByRole("dialog", { name: "Exemplar recuperado", exact: true });
  await expect(recovered).toContainText(f.doc.code);
  await expect(recovered).toContainText("Revisão 1");
  if (info.project.name === "chromium") {
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(recovered).toBeInViewport();
      if (width === 360) await audit(page, "emissão recuperada em 360 px");
      await page.screenshot({ path: `output/playwright/l3/produto-e09-03-emissao-recuperada-${width}.png`, animations: "disabled" });
    }
  }
  await finishGeneratedPdf(page, true);
  await expect(
    page.getByRole("button", { name: "Gerar PDF", exact: true }),
  ).toBeEnabled();
  expect(keys).toHaveLength(4);
  expect(new Set(keys).size).toBe(1);
  let rows = await manualExemplars();
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
  await generateStandardPdf(page);
  expect(keys).toHaveLength(5);
  expect(keys[4]).not.toBe(keys[0]);
  await expect.poll(async () => (await manualExemplars()).map(row => row.state)).toEqual(["ready", "ready"]);
  rows = await manualExemplars();
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    await expect(files.locator(`[data-file-id="${row.id}"]`).getByRole("link", { name: "Baixar PDF", exact: true })).toBeVisible();
  }
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
    const failed = await page.request.post(endpoint, { timeout: 60_000,
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
  const retried = await page.request.post(endpoint, { timeout: 60_000,
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
      page.getByRole("button", { name: "Gerar PDF", exact: true }),
    ).toBeEnabled();
    const before = source(doc.id);
    await generateStandardPdf(page);
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

test("Acervo consolidado recusa seletores experimentais e preserva exemplares atuais",async({page})=>{
 const f=await fixture(page),url=`/api/documents/${f.doc.id}`;
 const before=sql(`select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)}`);
 for(const selector of ["?version=1","?version=1&renderer=4","?version=1&renderer=legacy"])expect((await page.request.get(url+"/pdf"+selector)).status()).toBe(400);
 expect(sql(`select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)}`)).toBe(before);
 const artifact=await legacyPdfFixture(f.owner,f.doc.id);
 expect((await(await page.request.get(url+"/archive")).json()).data).toEqual([]);
 const inspected=await page.request.post("/api/verification",{headers:{"content-type":"application/pdf"},data:artifact.bytes});
 expect(inspected.status()).toBe(200);expect(await inspected.json()).toMatchObject({reference:{found:false},analysis:{status:"unsigned",documentSignature:"absent"}});
 await page.goto(`/documentos/${f.doc.id}`);await selectDocumentSection(page,"files");
 const archive=page.getByRole("region",{name:"Arquivos gerados",exact:true});
 const refresh=archive.getByRole("button",{name:"Atualizar arquivos",exact:true});
 await page.route("**"+url+"/archive",route=>route.fulfill({
  status:503,json:{error:{code:"DATABASE_UNAVAILABLE",message:"Consulta temporariamente indisponível."}},
 }),{times:1});
 await refresh.click();
 const unavailable=page.getByRole("dialog",{name:"Não foi possível consultar os arquivos",exact:true});
 await expect(unavailable).toContainText("Consulta temporariamente indisponível.");
 await unavailable.getByRole("button",{name:"Voltar aos arquivos",exact:true}).click();
 await expect(refresh).toBeFocused();
 await expect(archive.getByRole("alert")).toContainText("Consulta temporariamente indisponível.");
 await refresh.click();
 await expect(archive.getByRole("alert")).toHaveCount(0);
 await selectDocumentSection(page,"attachments");
 await page.reload();
 await expect(page.getByRole("tab",{name:"Arquivos",exact:true})).toHaveAttribute("aria-selected","true");
 await expect(page.getByRole("button",{name:"Anexos",exact:true})).toHaveAttribute("aria-pressed","true");
 await selectDocumentSection(page,"files");
 await generateStandardPdf(page);
 const files=page.getByRole("region",{name:"Arquivos gerados",exact:true});await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 const filters=files.getByRole("navigation",{name:"Filtrar exemplares",exact:true});
 await filters.getByRole("button",{name:"Anteriores",exact:true}).click();
 await expect(files.getByText("Nenhum exemplar neste filtro.",{exact:true})).toBeVisible();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(0);
 await filters.getByRole("button",{name:"Atuais",exact:true}).click();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 await filters.getByRole("button",{name:"Todos",exact:true}).click();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 const rows=(await(await page.request.get(url+"/archive")).json()).data;expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({kind:"issuance",issuance:{rendererRevision:16,state:"ready"}});
 const first=await page.request.get(url+"/pdf?issuance="+rows[0].issuance.id);expect(first.ok()).toBe(true);const digest=hash(await first.body());
 expect(hash(await(await page.request.get(url+"/pdf?issuance="+rows[0].issuance.id)).body())).toBe(digest);
 await filters.getByRole("button",{name:"Atuais",exact:true}).click();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 const approved = await rpc(f.admin, "supply_document_command", {
   p_id: f.doc.id, p_action: "approve", p_key: randomUUID(), p_version: f.doc.version,
   p_body: { lines: [{ lineId: f.doc.lines[0].id, quantity: "1" }] },
 });
 expect(approved.version).toBeGreaterThan(f.doc.version);
 await refresh.click();
 await expect(filters.getByRole("button",{name:"Atuais",exact:true})).toHaveAttribute("aria-pressed","true");
 await expect(files.getByText("Nenhum exemplar neste filtro.",{exact:true})).toBeVisible();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(0);
 await filters.getByRole("button",{name:"Anteriores",exact:true}).click();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 await filters.getByRole("button",{name:"Todos",exact:true}).click();
 await expect(files.getByRole("link",{name:"Baixar PDF",exact:true})).toHaveCount(1);
 await expect(files.getByText("Conteúdo anterior",{exact:true})).toBeVisible();
 sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)}`);
 expect([401,403]).toContain((await page.request.get(url+"/archive")).status());expect([401,403]).toContain((await page.request.get(url+"/pdf?issuance="+rows[0].issuance.id)).status());
});
