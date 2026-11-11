import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  deferralFixture,
  deferralState,
} from "../integration/bal-deferral-fixtures.mjs";
import { shiftCommand } from "../integration/shift-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/balancos");
}
const form = (page: Page) =>
  page.getByRole("dialog", {
    name: /^(Aprovar adiamento|Rejeitar adiamento)$/,
  });
const review = (page: Page) =>
  page.getByRole("dialog", { name: "Revisar decisão do balanço", exact: true });
test("BAL encerra recusa do adiamento obsoleto com destino em leitura, autoria própria e recuperação sem mudar prazo", async ({
  page,
}, info) => {
  const f = await deferralFixture(),
    before = deferralState(f.patient);
  await login(page, f.patient);
  await expect(
    page.getByRole("button", { name: "Aprovar adiamento", exact: true }),
  ).toBeDisabled();
  const denied = await page.request.post("/api/balances", {
    data: {
      careRecipientId: f.patient,
      command: {
        action: "decide_deferral",
        body: {
          id: f.proposal.id,
          approve: true,
          reason: "Aprovação proibida da versão antiga",
        },
      },
      idempotencyKey: randomUUID(),
      expectedVersion: null,
    },
  });
  expect(denied.status()).toBe(409);
  expect((await denied.json()).code).toBe("VERSION_CONFLICT");
  expect(deferralState(f.patient)).toEqual(before);
  await page
    .getByRole("button", { name: "Rejeitar adiamento", exact: true })
    .click();
  await expect(form(page).getByRole("combobox")).toHaveCount(0);
  await expect(form(page).getByRole("textbox")).toHaveCount(1);
  const reason = form(page).getByRole("textbox", {
    name: "Justificativa",
    exact: true,
  });
  await expect(reason).toHaveValue("");
  await expect(reason).toHaveAttribute("maxlength", "1000");
  const ownReason =
    "Recusa familiar do plantão cancelado. O prazo original e o vigente permanecem preservados.";
  await reason.fill(ownReason);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await reason.focus();
    await audit(page, "bal-obsolete-deferral-" + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/bal-deferral-${f.proposal.id}-${info.project.name}.png`,
    animations: "disabled",
  });
  await form(page)
    .getByRole("button", { name: "Revisar decisão", exact: true })
    .click();
  await expect(
    review(page)
      .getByRole("region", { name: "Conferência da decisão", exact: true })
      .getByText(ownReason, { exact: true }),
  ).toBeVisible();
  await expect(review(page).getByRole("textbox")).toHaveCount(0);
  await review(page)
    .getByRole("button", { name: "Confirmar decisão", exact: true })
    .focus();
  await audit(page, "bal-deferral-readonly-review");
  await expect(review(page).getByRole("combobox")).toHaveCount(0);
  await expect(
    review(page)
      .getByRole("region", { name: "Conferência da decisão", exact: true })
      .locator(".hca-definition-grid > div").filter({ has: page.getByText("Versão proposta", { exact: true }) }).locator("dd"),
  ).toHaveText("1");
  const attempts: unknown[] = [];
  await page.route("**/api/balances/preparations/commit", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.defer.approve',false);`,
      );
      await route.abort("failed");
    } else await route.continue();
  });
  await review(page)
    .getByRole("button", { name: "Confirmar decisão", exact: true })
    .click();
  await expect(
    review(page).getByRole("button", {
      name: "Recuperar confirmação",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    review(page).getByRole("button", { name: "Voltar", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(review(page)).toBeVisible();
  await review(page)
    .getByRole("button", { name: "Recuperar confirmação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  await expect(form(page)).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await expect(
    page.getByRole("heading", { name: "Programação do balanço", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Solicitação rejeitada", { exact: true }),
  ).toBeVisible();
  const after = deferralState(f.patient);
  expect(after.assignments).toEqual(before.assignments);
  expect(after.obligations).toEqual(before.obligations);
  expect(after.ledger).toEqual(before.ledger);
  expect(after.requests[0].decision_reason).toBe(ownReason);
  expect(after.requests[0].decision_snapshot.actor.id).toBe(fixtures.family.id);
  expect(
    after.events.filter(
      (e: { action: string }) => e.action === "bal.cycle.deferral_rejected",
    ),
  ).toHaveLength(1);
  mkdirSync("output/phase-d-work", { recursive: true });
  writeFileSync(
    `output/phase-d-work/bal-deferral-${f.proposal.id}-browser.json`,
    JSON.stringify({ before, after }, null, 2),
  );
});
test("mudança do alvo durante a aprovação conserva a justificativa e o destino congelado, sem aprovar outra versão", async ({
  page,
}) => {
  const f = await deferralFixture(false);
  await login(page, f.patient);
  await page
    .getByRole("button", { name: "Aprovar adiamento", exact: true })
    .click();
  const reason = form(page).getByRole("textbox", {
      name: "Justificativa",
      exact: true,
    }),
    ownReason =
      "Minha justificativa é preservada ao detectar a mudança do plantão.";
  await reason.fill(ownReason);
  // A failed read leaves the client on its explicitly retained reference;
  // the real command must still reject the changed database source.
  await page.route("**/api/balances?**", async (route) => {
    if (route.request().method() === "GET") await route.abort("failed");
    else await route.continue();
  });
  await form(page)
    .getByRole("button", { name: "Revisar decisão", exact: true })
    .click();
  await expect(
    review(page).getByRole("heading", {
      name: "Confira a decisão do balanço",
      exact: true,
    }),
  ).toBeFocused();
  await shiftCommand(
    f.admin,
    f.patient,
    "cancel",
    {
      id: f.target.id,
      reason: "Cancelamento legítimo após abrir a decisão familiar",
    },
    f.target.version,
  );
  await review(page)
    .getByRole("button", { name: "Confirmar decisão", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  await expect(form(page)).toBeVisible();
  await expect(reason).toHaveValue(ownReason);
  await expect(form(page).getByRole("combobox")).toHaveCount(0);
  await expect(reason).toBeFocused();
  await page.unroute("**/api/balances?**");
  await form(page)
    .getByRole("button", {
      name: "Consultar situação atual do pedido",
      exact: true,
    })
    .click();
  await expect(
    form(page).getByRole("button", { name: "Revisar decisão", exact: true }),
  ).toBeDisabled();
  await expect(reason).toHaveValue(ownReason);
  await expect(
    form(page).locator(".hca-definition-grid > div").filter({ has: page.getByText("Versão proposta", { exact: true }) }).locator("dd"),
  ).toHaveText("1");
  const after = deferralState(f.patient);
  expect(after.requests[0].status).toBe("pending");
  expect(after.requests[0].target_shift_version).toBe(1);
  expect(
    after.events.filter(
      (e: { action: string }) => e.action === "bal.cycle.deferred",
    ),
  ).toHaveLength(0);
  await expect(
    page.getByRole("button", {
      name: "Aprovar adiamento",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  await form(page)
    .getByRole("button", { name: "Fechar edição", exact: true })
    .click();
  await expect(
    page.getByText("Há alterações ainda não salvas.", { exact: true }),
  ).toHaveCount(0);
  await page
    .locator("summary")
    .filter({
      hasText: "Meus preenchimentos privados de programação e plantões",
    })
    .click();
  await page
    .getByRole("button", { name: "Retomar meu preenchimento", exact: true })
    .click();
  await form(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(
    form(page).getByRole("textbox", { name: "Justificativa", exact: true }),
  ).toHaveValue(ownReason);
  await form(page)
    .getByRole("button", { name: "Fechar edição", exact: true })
    .click();
  await expect(form(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Retomar meu preenchimento",
      exact: true,
    }),
  ).toBeFocused();
});
