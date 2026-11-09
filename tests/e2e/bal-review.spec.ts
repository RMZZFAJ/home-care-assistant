import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  legacyBalance,
  receiveBalanceMaterials,
  rpc,
} from "../integration/bal-review-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(150_000);
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
const ledger = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
const drawer = (page: Page) =>
  page.getByRole("dialog", {
    name: "Revisar contagem do balanço",
    exact: true,
  });
const commentField = (page: Page) =>
  drawer(page).getByRole("textbox", { name: /^Seu parecer sobre a contagem/ });
const button = (page: Page, name: string) =>
  drawer(page).getByRole("button", { name, exact: true });

test("BAL facultativo preserva autoria e observações, recupera parecer próprio após revogação e não reaplica estoque", async ({
  page,
  browser,
}, info) => {
  const f = await legacyBalance({ policy: "optional", quantity: "1" }),
    before = ledger(f.patient);
  await login(page, fixtures.adminA.email, f.patient);
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  await expect(
    page.getByRole("heading", { name: "Contagem e revisão", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisão da família", exact: true }),
  ).toHaveCount(0);
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const reviewer = await context.newPage();
    await login(reviewer, fixtures.family.email, f.patient);
    await reviewer.goto("/fichas/" + f.document.id);
  await selectDocumentSection(reviewer, "workflow");
    await reviewer
      .getByRole("button", { name: "Revisão da família", exact: true })
      .click();
    await expect(commentField(reviewer)).toHaveValue("");
    await expect(
      drawer(reviewer).getByText(f.payload.notes, { exact: true }),
    ).toBeVisible();
    await expect(drawer(reviewer).getByRole("textbox")).toHaveCount(1);
    const marker = "FIM DO PARECER INDEPENDENTE";
    const comment =
      "Parecer da família sobre a contagem original. "
        .repeat(60)
        .slice(0, 2000 - marker.length) + marker;
    await commentField(reviewer).fill(comment);
    await expect(commentField(reviewer)).toHaveAttribute("maxlength", "2000");
    for (const width of [1440, 768, 390, 320]) {
      await reviewer.setViewportSize({ width, height: 940 });
      await commentField(reviewer).focus();
      await audit(reviewer, "bal-own-review-" + width);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await reviewer.screenshot({
      path: `output/playwright/phase-d/bal-review-${f.document.id}-${info.project.name}.png`,
      animations: "disabled",
    });
    const attempts: unknown[] = [];
    await reviewer.route("**/api/documents/" + f.document.id, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) {
        const response = await route.fetch();
        expect(response.ok(), await response.text()).toBe(true);
        sql(
          `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',false);`,
        );
        await route.abort("failed");
      } else await route.continue();
    });
    await button(reviewer, "Revisar parecer").click();
    await button(reviewer, "Confirmar revisão").click();
    await expect(button(reviewer, "Recuperar revisão")).toBeVisible();
    await expect(button(reviewer, "Fechar edição")).toBeDisabled();
    await expect(button(reviewer, "Voltar ao parecer")).toBeDisabled();
    await button(reviewer, "Recuperar revisão").click();
    await expect(drawer(reviewer)).toHaveCount(0);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
    await expect(
      reviewer.getByRole("heading", {
        name: "Contagem e revisão",
        exact: true,
      }),
    ).toBeFocused();
    await expect(reviewer.getByText(comment, { exact: true })).toBeVisible();
    expect(ledger(f.patient)).toBe(before);
    const response = await reviewer.request.get(
      "/api/documents/" + f.document.id,
    );
    expect(response.ok()).toBe(true);
    const document = (await response.json()).data as SupplyDocument;
    expect(document.payload.notes).toBe(f.payload.notes);
    expect(document.balanceReview?.counter.id).toBe(fixtures.adminA.id);
    expect(document.balanceReview?.reviews).toHaveLength(1);
    expect(document.balanceReview?.reviews[0]).toMatchObject({
      reviewer_id: fixtures.family.id,
      counter_id: fixtures.adminA.id,
      comment,
    });
    const pdf = await generatedPdf(
      reviewer,
      `/api/documents/${document.id}/pdf`,
    );
    expect(pdf.status()).toBe(200);
    const bytes = await pdf.body();
    mkdirSync("output/pdf/phase-d", { recursive: true });
    const base = `output/pdf/phase-d/bal-review-${document.id}-v${document.version}`;
    writeFileSync(base + ".pdf", bytes);
    writeFileSync(
      base + "-source.json",
      JSON.stringify(
        {
          document,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          beforeLedger: JSON.parse(before),
          afterLedger: JSON.parse(ledger(f.patient)),
        },
        null,
        2,
      ),
    );
    writeFileSync(
      base + "-database.json",
      sql(
        `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(document.id)}),'reviews',(select jsonb_agg(to_jsonb(r)) from public.balance_reviews r where document_id=${sqlLiteral(document.id)}),'renders',(select jsonb_agg(to_jsonb(r)) from private.pdf_issuances r where state='ready' and document_id=${sqlLiteral(document.id)}));`,
      ),
    );
  } finally {
    await context.close();
  }
});

test("BAL com referência alterada conserva o parecer e exige reconto, consulta e adoção explícita antes de revisar", async ({
  page,
}) => {
  const f = await legacyBalance(),
    ownComment = "Meu parecer permanece durante a comparação e o reconto.";
  await login(page, fixtures.family.email, f.patient);
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: "Revisão da família", exact: true })
    .click();
  await commentField(page).fill(ownComment);
  await receiveBalanceMaterials(f);
  await button(page, "Revisar parecer").click();
  await button(page, "Confirmar revisão").click();
  await expect(commentField(page)).toHaveValue(ownComment);
  await expect(commentField(page)).toBeFocused();
  const comparison = drawer(page).getByRole("region", {
    name: "Comparação da contagem atual",
    exact: true,
  });
  await expect(comparison).toBeVisible();
  await expect(
    button(page, "Adotar referência atual e manter meu parecer"),
  ).toBeDisabled();
  await expect(button(page, "Revisar parecer")).toBeDisabled();
  const old = await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  });
  const recounted = await rpc(f.admin, "revise_supply_document", {
    p_id: old.id,
    p_payload: {
      lines: f.products.map((productId: string, i: number) => ({
        productId,
        quantity: i ? "0" : "1",
      })),
      notes: "Observações próprias do reconto autorizado.",
    },
    p_key: randomUUID(),
    p_version: old.version,
    p_recount: true,
  });
  await expect(
    drawer(page).getByText(f.payload.notes, { exact: true }).first(),
  ).toBeVisible();
  await expect(commentField(page)).toHaveValue(ownComment);
  await button(page, "Consultar referência atual").click();
  await expect(
    comparison.getByText(recounted.payload.notes, { exact: true }),
  ).toBeVisible();
  await expect(button(page, "Consultar referência atual")).toBeFocused();
  await expect(commentField(page)).toHaveValue(ownComment);
  await expect(
    button(page, "Adotar referência atual e manter meu parecer"),
  ).toBeEnabled();
  await button(page, "Adotar referência atual e manter meu parecer").click();
  await expect(comparison).toHaveCount(0);
  await expect(commentField(page)).toHaveValue(ownComment);
  await expect(
    drawer(page).getByText(recounted.payload.notes, { exact: true }),
  ).toBeVisible();
  const before = ledger(f.patient);
  await button(page, "Revisar parecer").click();
  await button(page, "Confirmar revisão").click();
  await expect(drawer(page)).toHaveCount(0);
  const document = (
    await (await page.request.get("/api/documents/" + old.id)).json()
  ).data as SupplyDocument;
  expect(document.status).toBe("approved");
  expect(document.balanceReview?.countVersion).toBe(2);
  expect(document.balanceReview?.reviews[0].comment).toBe(ownComment);
  expect(document.balanceReview?.reviews[0].reviewed_snapshot.notes).toBe(
    recounted.payload.notes,
  );
  const firstSnapshot = sql(
    `select body#>>'{payload,notes}' from public.document_events where document_id=${sqlLiteral(document.id)} and action='bal.issued' and version=1;`,
  );
  expect(firstSnapshot).toBe(f.payload.notes);
  expect(ledger(f.patient)).toBe(before);
});
