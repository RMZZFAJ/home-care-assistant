import { test, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { mkdirSync } from "node:fs";
import { selectDocumentSection } from "./document-sections";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);

async function waitForVerificationUploads(required: number) {
  // Browser projects in the local runner share the self-hosted rate-limit bucket.
  await expect.poll(() => Number(sql(`select least(
    4 - coalesce(max(uploads) filter (where subject <> 'global'), 0),
    12 - coalesce(max(uploads) filter (where subject = 'global'), 0)
  ) from private.pdf_verification_windows where bucket = floor(extract(epoch from clock_timestamp()) / 60);`)), {
    timeout: 65_000, intervals: [2_500],
  }).toBeGreaterThanOrEqual(required);
}

async function prepare(page: Page) {
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
  const emit = async () => {
    const response = await page.request.post(
      `/api/documents/${doc.id}/issuances`,
      { timeout: 60_000, data: { idempotencyKey: randomUUID() } },
    );
    expect(response.status(), await response.text()).toBe(200);
    const row = await response.json(),
      download = await page.request.get(
        `/api/documents/${doc.id}/pdf?issuance=${row.id}`,
      );
    expect(download.status()).toBe(200);
    return { row, bytes: await download.body() };
  };
  const a = await emit(),
    b = await emit();
  await page.context().clearCookies();
  expect((await page.request.get("/api/context")).status()).toBe(401);
  return { ...f, doc, a, b };
}

test("L1 verification keeps login in context, separates private authorship and removes details on real revocation", async({page})=>{
  const f=await prepare(page), code=f.a.row.verificationCode, origin="/balancos?view=history";
  const destination="/verificar?" + new URLSearchParams({ code, returnTo: origin });
  expect((await page.request.get("/api/verification/details?code="+code)).status()).toBe(401);
  await page.goto(destination);
  const details=page.getByRole("region",{name:"Detalhes autorizados da emissão",exact:true});
  await expect(details).toBeVisible();
  await expect(page.getByText("Quem registrou a ficha",{exact:true})).toHaveCount(0);
  await details.getByRole("button",{name:/Detalhes da ficha/}).click();
  await page.getByRole("link",{name:"Entrar e continuar esta verificação",exact:true}).click();
  await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);
  await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/verificar"
    && url.searchParams.get("code") === code && url.searchParams.get("returnTo") === origin);
  const sheet=page.getByRole("dialog",{name:"Ficha e responsáveis",exact:true});
  await details.getByRole("button",{name:/Detalhes da ficha|Ficha e responsáveis/}).click();
  const access=page.getByRole("button",{name:"Usar o contexto autorizado desta emissão",exact:true});
  const authorized=page.getByRole("button",{name:"Consultar detalhes",exact:true});
  await expect(sheet.or(access).or(authorized)).toBeVisible();
  if(await access.isVisible()) await access.click();
  else if(await authorized.isVisible()) await authorized.click();
  await expect(sheet.getByText("Quem registrou a ficha",{exact:true})).toBeVisible();
  await expect(sheet.getByText("Quem gerou este exemplar",{exact:true})).toBeVisible();
  await expect(sheet.getByText("Chave da assinatura técnica",{exact:true})).toBeVisible();
  mkdirSync("output/playwright/l1",{recursive:true});
  for(const width of [1440,360,412]){
    await page.setViewportSize({width,height:940});await audit(page,"L1 verification private "+width);
    await page.screenshot({path:`output/playwright/l1/verificacao-${width}.png`,fullPage:true});
  }
  await sheet.getByRole("link",{name:"Consultar ficha autorizada",exact:true}).click();
  // Public authorized reading does not silently choose an operational role.
  // Enter the document through the existing explicit context gate.
  await selectContext(page,f.patient);
  for(const section of ["materials","communications","files","attachments"] as const){
    await selectDocumentSection(page,section);
    await page.screenshot({path:`output/playwright/l1/com-${section}-412.png`,fullPage:true});
  }
  await page.goto("/historico?careRecipientId="+f.patient);
  await expect(page.getByText(f.doc.code,{exact:true}).first()).toBeVisible();
  await page.screenshot({path:"output/playwright/l1/historico-412.png",fullPage:true});
  await page.goto(destination);
  await details.getByRole("button",{name:/Ficha e responsáveis/}).click();
  await expect(sheet.getByText("Quem registrou a ficha",{exact:true})).toBeVisible();
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.family.id)}`);
  await page.evaluate(()=>window.dispatchEvent(new Event("hca:profile-updated")));
  expect((await page.request.get("/api/verification/details?code="+code)).status()).toBe(403);
  await expect(sheet.getByText("Quem registrou a ficha",{exact:true})).toHaveCount(0);
  await sheet.getByRole("button",{name:"Voltar à consulta",exact:true}).click();
  await expect(page.getByRole("region",{name:"Resultado da verificação",exact:true})).toBeVisible();
});
test("C-FINAL023 verificação separa falha do serviço de código digitado inválido sem produzir emissão", async ({ page }) => {
  await page.goto("/verificar");
  await expect(page.getByLabel("Conexão e versão do aplicativo", { exact: true })).toHaveCount(0);
  mkdirSync("output/playwright/l3", { recursive: true });
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(page.getByRole("heading", { name: "Consulte o código", exact: true })).toBeVisible();
    await page.screenshot({ path: `output/playwright/l3/verificacao-inicio-${width}.png`, fullPage: true });
  }
  const help = page.getByRole("button", { name: "Ajuda", exact: true });
  await help.click();
  await expect(page.getByRole("dialog", { name: "Como verificar um documento" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const code = page.getByRole("textbox", { name: "Código do documento", exact: true });
  const submit = page.getByRole("button", { name: "Consultar código", exact: true });
  let reads = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/verification") reads++; });
  await code.fill("incompleto"); await submit.click();
  await expect(code).toHaveAttribute("aria-invalid", "true"); await expect(code).toBeFocused(); expect(reads).toBe(0);
  const value = randomUUID().replaceAll("-", "").toUpperCase(); await code.fill(value);
  await page.route("**/api/verification?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia do serviço indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
  await submit.click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Consulta fictícia do serviço indisponível");
  await expect(code).toHaveValue(value); await expect(code).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("region", { name: "Resultado da verificação", exact: true })).toHaveCount(0);
  await submit.click();
  await expect(page.getByRole("heading", { name: "Emissão não localizada", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Alterar", exact: true }).click();
  await expect(code).toBeFocused();
  await expect(code).toHaveValue(value); await expect(code).toHaveAttribute("aria-invalid", "false"); expect(reads).toBe(2);
  await page.getByRole("tab", { name: "Tenho o PDF", exact: true }).click();
  const file = page.getByLabel("Arquivo PDF para conferir", { exact: true }), check = page.getByRole("button", { name: "Verificar arquivo PDF", exact: true });
  const issued = sql("select count(*) from private.pdf_issuances;");
  await file.setInputFiles({ name: "pequeno.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(99) }); await check.click();
  await expect(file).toHaveAttribute("aria-invalid", "true"); await expect(file).toBeFocused(); expect(reads).toBe(2);
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  await file.setInputFiles({ name: "exemplar-escolhido.pdf", mimeType: "application/pdf", buffer: bytes });
  await page.route("**/api/verification**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Análise fictícia temporariamente indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
  await check.click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Análise fictícia temporariamente indisponível");
  await expect(file).toHaveAttribute("aria-invalid", "false");
  expect(await file.evaluate(element => (element as HTMLInputElement).files?.[0]?.name)).toBe("exemplar-escolhido.pdf");
  await expect(page.getByRole("region", { name: "Resultado da verificação", exact: true })).toHaveCount(0);
  await page.route("**/api/verification**", route => route.fulfill({ json: {
    reference: { found: false }, fileReference: { found: false },
    analysis: { status: "processing_limit", documentSignature: "not_assessed", timestamp: "not_assessed", verification: null, limit: "time" },
    fileSha256: null, policyStatus: null, referenceOnly: false,
  } }), { times: 1 });
  await check.click();
  const result = page.getByRole("region", { name: "Resultado da verificação", exact: true });
  await expect(result.getByRole("heading", { name: "A análise não foi concluída", exact: true })).toBeFocused();
  await expect(result).toContainText("Sem exemplar para comparação");
  await waitForVerificationUploads(1);
  const retry = page.waitForResponse(response => new URL(response.url()).pathname === "/api/verification" && response.request().method() === "POST");
  await result.getByRole("button", { name: "Tentar análise novamente", exact: true }).click();
  const retried = await retry;
  expect(retried.status()).toBe(200);
  expect((await retried.json()).fileSha256).toBe(createHash("sha256").update(bytes).digest("hex"));
  await expect(result).toContainText("Sem assinatura incorporada");
  expect(reads).toBe(5); expect(sql("select count(*) from private.pdf_issuances;")).toBe(issued);
  expect((await page.request.get("/api/context")).status()).toBe(401);
  for (const width of [320, 360, 412, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "immutable verification read " + width); }
});

test("verificação pública resolve QR e código sem conta e discrimina bytes de outra emissão", async ({
  page,
}, info) => {
  const f = await prepare(page),
    url = `/verificar/emissao/${f.a.row.verificationCode}`;
  await page.goto(url);
  const result = page.getByRole("region", {
    name: "Resultado da verificação",
    exact: true,
  });
  await expect(
    result.getByRole("heading", { name: "Emissão localizada", exact: true }),
  ).toBeVisible();
  await expect(result).toContainText(
    "Envie o arquivo para verificar seus bytes",
  );
  if (info.project.name === "chromium") {
    await page.setViewportSize({ width: 360, height: 940 });
    await result.screenshot({ path: "output/playwright/l3/app-e09-06-codigo-localizado-360.png", animations: "disabled" });
  }
  expect(
    (
      await page.request.get(
        `/api/documents/${f.doc.id}/pdf?issuance=${f.a.row.id}`,
      )
    ).status(),
  ).toBe(401);
  const edit = page.getByRole("button", { name: "Alterar", exact: true });
  await edit.click();
  const code = page.getByLabel("Código do documento", { exact: true });
  await code.fill("F".repeat(32));
  await page
    .getByRole("button", { name: "Consultar código", exact: true })
    .click();
  await expect(
    result.getByRole("heading", {
      name: "Emissão não localizada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(result).toContainText("não comprova falsificação");
  // The result deliberately schedules heading focus. Finish that transition
  // before starting the next edit, then verify the complete formatted value.
  await expect(result.getByRole("heading", { name: "Emissão não localizada", exact: true })).toBeFocused();
  await edit.click();
  const formattedCode = `HCA-${f.a.row.verificationCode.toLowerCase().match(/.{4}/g)!.join("-")}`;
  await expect(code).toHaveJSProperty("maxLength", 64);
  await code.fill(formattedCode);
  await expect(code).toHaveValue(formattedCode);
  await page.route("**/api/verification?code=*", async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({
        status: 200,
        json: { reference: { found: false } },
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Consultar código", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Não foi possível confirmar a resposta",
  );
  await expect(result).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await page
    .getByRole("button", { name: "Consultar código", exact: true })
    .click();
  await expect(
    result.getByRole("heading", { name: "Emissão localizada", exact: true }),
  ).toBeVisible();
  await result.getByRole("button", { name: "Verificar o PDF recebido", exact: true }).click();
  const file = page.getByLabel("Arquivo PDF para conferir", { exact: true });
  await file.setInputFiles({
    name: "outro-exemplar.pdf",
    mimeType: "application/pdf",
    buffer: f.b.bytes,
  });
  await waitForVerificationUploads(info.project.name === "chromium" ? 3 : 1);
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/verification") &&
      response.request().method() === "POST",
  );
  const checkFile = page.getByRole("button", { name: "Verificar arquivo PDF", exact: true });
  await checkFile.click();
  const response = await uploaded;
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body.reference).toMatchObject({
    found: true,
    bytesMatch: false,
    verificationCode: f.a.row.verificationCode,
  });
  expect(body.fileReference).toMatchObject({
    found: true,
    verificationCode: f.b.row.verificationCode,
  });
  expect(body.analysis).toMatchObject({
    status: "verified",
    verification: { accepted: true, wholeFile: true },
  });
  const serialized = JSON.stringify(body);
  for (const forbidden of [
    f.patient,
    f.a.row.id,
    f.b.row.id,
    "issuanceId",
    "trustRevision",
    fixtures.family.email,
    "careRecipientId",
    "requestedName",
    "objectPath",
    "snapshot",
    "workerToken",
  ])
    expect(serialized.includes(forbidden)).toBe(false);
  await expect(result).toContainText("Exemplar de outra emissão");
  await expect(result).toContainText("corresponde a outra emissão registrada");
  await expect(result).toContainText("Confirme com o remetente qual emissão deveria ser utilizada.");
  await expect(result.getByText("Integridade conferida",{exact:true})).toHaveCount(2);
  await result.getByRole("button",{name:"Ver detalhes da conferência",exact:true}).click();
  const technical=page.getByRole("dialog",{name:"Detalhes da conferência",exact:true});
  await expect(technical).toContainText("Token RFC3161 criptograficamente íntegro");
  await technical.getByRole("button",{name:"Fechar",exact:true}).click();
  if (info.project.name === "chromium") {
    await result.getByRole("button",{name:"Verificar outro PDF",exact:true}).click();
    await file.setInputFiles({
      name: "exemplar-correto.pdf",
      mimeType: "application/pdf",
      buffer: f.a.bytes,
    });
    await checkFile.click();
    await expect(result).toContainText(
      "Os bytes coincidem com o exemplar registrado",
    );
    await result.getByRole("button", { name: "Verificar outro PDF", exact: true }).click();
    const optional = page.getByLabel("Código do documento · opcional", { exact: true });
    if (!(await optional.isVisible()))
      await page.getByText("Também tenho um código", { exact: true }).click();
    await optional.fill("F".repeat(32));
    await file.setInputFiles({ name: "exemplar-com-codigo-desconhecido.pdf", mimeType: "application/pdf", buffer: f.a.bytes });
    await checkFile.click();
    await expect(result).toContainText("Código informado sem registro");
    await expect(result).toContainText("Correspondência exata");
    await expect(result.getByRole("heading", { name: "Emissão identificada pelo arquivo" })).toBeFocused();
  }
  await result.getByRole("button",{name:"Verificar outro PDF",exact:true}).click();
  await file.setInputFiles({
    name: "excesso.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
  });
  await checkFile.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "entre 100 bytes e 4 MB",
  );
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
  await audit(page, "public-verification");
  const hash = sql(
    `select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=1;`,
  );
  await page.goto(`/verificar/${f.doc.id}?version=1&hash=${hash}`);
  // L1 closes legacy hash-only public RPCs; this historical URL leads to
  // the current verifier without inventing a check of an unsubmitted file.
  await expect(page).toHaveURL(/\/verificar$/);
  await expect(
    page.getByRole("heading", {
      name: "Confira a origem do documento recebido.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Código do documento", { exact: true }),
  ).toHaveValue("");
});
