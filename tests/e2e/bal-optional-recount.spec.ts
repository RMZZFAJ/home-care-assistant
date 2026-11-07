import { generatedPdf } from "./generated-pdf";
import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { optionalLegacyRecount } from "../integration/bal-optional-recount-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { recountState } from "../integration/bal-recount-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import type { SupplyDocument } from "../../src/types/documents";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(180_000);
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
test("BAL legado facultativo permite designar Sheila, preservar o efeito anterior e recuperar a nova contagem sem criar semanas", async ({
  page,
  browser,
}, info) => {
  const f = await optionalLegacyRecount(),
    before = JSON.parse(recountState(f));
  await login(page, fixtures.family.email, f.patient);
  await page.goto("/fichas/" + f.document.id);
  const versions = page.getByRole("region", {
    name: "Versões das contagens físicas",
    exact: true,
  });
  await expect(
    versions.getByRole("link", {
      name: "Consultar PDF da contagem na versão 1",
      exact: true,
    }),
  ).toHaveAttribute("href", `/documentos/${f.document.id}/arquivos?version=1`);
  await page
    .getByRole("link", { name: "Designar reconto", exact: true })
    .click();
  const assignment = page.getByRole("dialog", {
    name: /^(Designar reconto|Revisar designação do reconto|Reconto designado)$/,
  });
  const field = assignment.getByRole("combobox", {
    name: /^Plantão para o reconto/,
  });
  await field.click();
  await field.fill("Sheila fictícia");
  await field.press("ArrowDown");
  await page
    .getByRole("option", { name: /Sheila fictícia, reconto legado/ })
    .click();
  await assignment
    .getByRole("textbox", { name: /^Sua justificativa para o reconto/ })
    .fill(
      "Novo reconto facultativo, com responsabilidade formal e sem reescrever o ajuste anterior.",
    );
  await assignment
    .getByRole("button", { name: "Revisar designação", exact: true })
    .click();
  await assignment
    .getByRole("button", { name: "Confirmar designação", exact: true })
    .click();
  await expect(
    assignment.getByRole("heading", {
      name: "Designação confirmada",
      exact: true,
    }),
  ).toBeVisible();
  expect(JSON.parse(recountState(f)).ledger).toEqual(before.ledger);
  await assignment
    .getByRole("button", {
      name: "Consultar acompanhamento atual",
      exact: true,
    })
    .click();
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const counter = await context.newPage();
    await login(counter, f.pro.email, f.patient);
    await counter.goto("/balancos");
    await counter
      .getByRole("main")
      .getByRole("link", { name: "Fazer balanço", exact: true })
      .click();
    await expect(
      counter.getByRole("heading", { name: "Balanço de estoque", exact: true }),
    ).toBeVisible();
    const catalogue = (
      await (
        await counter.request.get("/api/catalog?careRecipientId=" + f.patient)
      ).json()
    ).data;
    for (const product of catalogue) {
      const input = counter.getByLabel(`${product.name} · ${product.unit}`, {
        exact: true,
      });
      await expect(input).toHaveValue("");
      await input.fill("1");
    }
    const notes = counter.getByLabel("Observações da contagem", {
      exact: true,
    });
    await expect(notes).toHaveValue("");
    await notes.fill(
      "Contagem física própria de Sheila após a conciliação legada.",
    );
    for (const width of info.project.name === "chromium"
      ? [1440, 768, 390, 320]
      : [390]) {
      await counter.setViewportSize({ width, height: 940 });
      await notes.focus();
      await audit(counter, "bal-legacy-recount-" + width);
    }
    await counter.getByRole("button", { name: "Revisar", exact: true }).click();
    await expect(
      counter.getByText(
        /Ao confirmar, as diferenças desta nova contagem serão conciliadas/,
      ),
    ).toBeVisible();
    await expect(
      counter.getByText("Referência: 2 unidade", { exact: true }),
    ).toHaveCount(2);
    const attempts: unknown[] = [];
    await counter.route(
      `**/api/documents/${f.document.id}/revise`,
      async (route) => {
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) {
          const response = await route.fetch();
          expect(response.ok(), await response.text()).toBe(true);
          sql(
            `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',false);`,
          );
          await route.abort("failed");
        } else await route.continue();
      },
    );
    await counter
      .getByRole("button", { name: "Confirmar reconto", exact: true })
      .click();
    await expect(
      counter.getByRole("button", {
        name: "Recuperar esta tentativa",
        exact: true,
      }),
    ).toBeVisible();
    await counter
      .getByRole("button", { name: "Recuperar esta tentativa", exact: true })
      .click();
    await expect(
      counter.getByRole("link", { name: "Abrir ficha BAL", exact: true }),
    ).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
  } finally {
    await context.close();
  }
  await page.goto("/fichas/" + f.document.id);
  const document = (
    await (await page.request.get("/api/documents/" + f.document.id)).json()
  ).data as SupplyDocument;
  expect(document.status).toBe("approved");
  expect(document.balanceReview?.reviewRequired).toBe(false);
  expect(document.balanceReview?.reviews).toHaveLength(0);
  expect(document.balanceReview?.counter.id).toBe(f.pro.id);
  expect(document.created_by).toBe(f.document.created_by);
  await expect(
    versions.getByRole("link", {
      name: "Consultar PDF da contagem na versão 1",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    versions.getByRole("link", {
      name: "Consultar PDF da contagem na versão 2",
      exact: true,
    }),
  ).toBeVisible();
  const after = JSON.parse(recountState(f));
  expect(after.obligations).toBeNull();
  expect(
    sql(
      `select count(*) from public.bal_obligations where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe("0");
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  const adjustments = after.ledger.filter(
    (m: { reference_type: string; reference_id: string }) =>
      m.reference_type === "bal" && m.reference_id === f.document.id,
  );
  expect(adjustments).toHaveLength(4);
  expect(
    adjustments.filter((m: { quantity: string }) => Number(m.quantity) === 2),
  ).toHaveLength(2);
  expect(
    adjustments.filter((m: { quantity: string }) => Number(m.quantity) === 1),
  ).toHaveLength(2);
  const workspace = (
    await (
      await page.request.get("/api/balances?careRecipientId=" + f.patient)
    ).json()
  ).data;
  expect(workspace.regime).toBeNull();
  expect(workspace.obligations).toEqual([]);
  mkdirSync("output/pdf/phase-d", { recursive: true });
  for (const version of [1, 2]) {
    const response = await generatedPdf(
      page,
      `/api/documents/${f.document.id}/pdf?version=${version}`,
    );
    expect(response.ok()).toBe(true);
    const bytes = await response.body(),
      base = `output/pdf/phase-d/bal-optional-recount-${f.document.id}-v${version}`;
    writeFileSync(base + ".pdf", bytes);
    writeFileSync(
      base + "-source.json",
      JSON.stringify(
        {
          document,
          before,
          after,
          version,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
        null,
        2,
      ),
    );
  }
  const pdfBase = `output/pdf/phase-d/bal-optional-recount-${f.document.id}`;
  writeFileSync(
    pdfBase + "-database.json",
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'renders',(select jsonb_agg(to_jsonb(r)) from private.pdf_issuances r where state='ready' and document_id=${sqlLiteral(f.document.id)}));`,
    ),
  );
});
