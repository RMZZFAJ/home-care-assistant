import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
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
      { data: { idempotencyKey: randomUUID() } },
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
  expect(
    (
      await page.request.get(
        `/api/documents/${f.doc.id}/pdf?issuance=${f.a.row.id}`,
      )
    ).status(),
  ).toBe(401);
  const code = page.getByLabel("Código de verificação", { exact: true });
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
  const file = page.getByLabel("Arquivo PDF para conferir", { exact: true });
  await file.setInputFiles({
    name: "outro-exemplar.pdf",
    mimeType: "application/pdf",
    buffer: f.b.bytes,
  });
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/verification") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Conferir PDF", exact: true }).click();
  const response = await uploaded;
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body.reference).toMatchObject({
    found: true,
    bytesMatch: false,
    issuanceId: f.a.row.id,
  });
  expect(body.fileReference).toMatchObject({
    found: true,
    issuanceId: f.b.row.id,
  });
  expect(body.analysis).toMatchObject({
    status: "verified",
    verification: { accepted: true, wholeFile: true },
  });
  const serialized = JSON.stringify(body);
  for (const forbidden of [
    f.patient,
    fixtures.family.email,
    "careRecipientId",
    "requestedName",
    "objectPath",
    "snapshot",
    "workerToken",
  ])
    expect(serialized.includes(forbidden)).toBe(false);
  await expect(result).toContainText("Os bytes divergem da emissão consultada");
  await expect(result).toContainText("corresponde a outra emissão registrada");
  await expect(result).toContainText(
    "Assinatura do documento: criptograficamente íntegra",
  );
  await expect(result).toContainText(
    "Token RFC3161 criptograficamente íntegro",
  );
  if (info.project.name === "chromium") {
    await file.setInputFiles({
      name: "exemplar-correto.pdf",
      mimeType: "application/pdf",
      buffer: f.a.bytes,
    });
    await page
      .getByRole("button", { name: "Conferir PDF", exact: true })
      .click();
    await expect(result).toContainText(
      "Os bytes coincidem com o exemplar registrado",
    );
  }
  await file.setInputFiles({
    name: "excesso.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
  });
  await page.getByRole("button", { name: "Conferir PDF", exact: true }).click();
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
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Hash e versão correspondem ao conteúdo registrado",
  );
  await page
    .getByRole("link", {
      name: "Conferir um arquivo PDF ou código de emissão",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Verificação de documentos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Código de verificação", { exact: true }),
  ).toHaveValue("");
});
