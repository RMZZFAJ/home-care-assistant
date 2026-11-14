import { test, expect, devices, type Page } from "@playwright/test";
import {
  preparationPurposes,
  preparationFixture,
  preparationFacts,
} from "../integration/balance-preparation-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { chooseBalanceTarget } from "./balance-preparation-steps";
import { audit } from "./accessibility-audit";
import {
  balancePreparationTitles,
  type BalancePreparationPurpose,
} from "../../src/lib/forms/balance-preparation-purposes";
test.setTimeout(180_000);
const dialog = (page: Page) => page.getByRole("dialog");
const action = (page: Page, name: string) =>
  dialog(page).getByRole("button", { name, exact: true });
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/balancos");
}
async function openOwn(page: Page, result = false) {
  const summary = page.locator("summary").filter({
    hasText: "Meus preenchimentos privados de programação e plantões",
  });
  if ((await summary.locator("..").getAttribute("open")) === null)
    await summary.click();
  await page
    .getByRole("button", {
      name: result ? "Consultar meu resultado" : "Retomar meu preenchimento",
      exact: true,
    })
    .click();
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/balances/preparations" &&
      r.request().method() === "POST",
  );
  await action(page, "Salvar preenchimento privado").click();
  expect((await response).status()).toBe(200);
  await expect(
    dialog(page).getByText(
      "Salvo no servidor. Este preenchimento ainda não registrou uma decisão.",
      { exact: true },
    ),
  ).toBeVisible();
}

for (const purposeName of preparationPurposes) {
  const purpose = purposeName as BalancePreparationPurpose;
  test(`BAL por plantão ${purpose}:cópia entre sessões,decisão única e recuperação após perda de resposta e escrita`, async ({
    page,
    browser,
  }, info) => {
    const f = await preparationFixture(purpose),
      before = preparationFacts(f),
      peerContext = await browser.newContext({
        ...devices[info.project.name === "ios" ? "iPhone 13" : "Pixel 7"],
      }),
      peer = await peerContext.newPage();
    try {
      await login(page, f.identity.email, f.patient);
      const open =
        purpose === "configure"
          ? "Configurar dia e plantão"
          : purpose === "assign"
            ? "Resolver atribuição"
            : balancePreparationTitles[purpose];
      await page.getByRole("button", { name: open, exact: true }).click();
      await expect(dialog(page)).toHaveAccessibleName(
        balancePreparationTitles[purpose],
      );
      const reason = dialog(page).getByRole("textbox", {
        name: "Justificativa",
        exact: true,
      });
      await reason.fill(f.content.values.reason);
      if (purpose === "configure")
        await dialog(page)
          .getByRole("checkbox", {
            name: "Processamento automático neste paciente",
            exact: true,
          })
          .uncheck();
      if (["assign", "defer", "request_deferral"].includes(purpose)) {
        const target = f.source.workspace.targets.find(
          (t: { id: string }) => t.id === f.content.values.targetShiftId,
        );
        expect(target).toBeTruthy();
        await chooseBalanceTarget(
          page,
          dialog(page),
          target,
          f.source.workspace.regime?.timezone,
        );
      }
      await expect(action(page, "Revisar decisão")).toBeEnabled();
      if (purpose === "configure") {
        const packets: unknown[] = [];
        await page.route("**/api/balances/preparations", async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          packets.push(route.request().postDataJSON());
          if (packets.length === 1) {
            const response = await route.fetch();
            expect(response.ok()).toBe(true);
            await route.abort("failed");
          } else await route.continue();
        });
        await action(page, "Salvar preenchimento privado").click();
        await expect(
          action(page, "Recuperar salvamento ou descarte"),
        ).toBeVisible();
        await expect(reason).toBeDisabled();
        expect(preparationFacts(f)).toEqual(before);
        await action(page, "Recuperar salvamento ou descarte").click();
        await expect(
          dialog(page).getByText(
            "Salvo no servidor. Este preenchimento ainda não registrou uma decisão.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(reason).toBeEnabled();
        expect(packets).toHaveLength(2);
        expect(packets[0]).toEqual(packets[1]);
        await page.unroute("**/api/balances/preparations");
      } else await save(page);
      expect(preparationFacts(f)).toEqual(before);
      await action(page, "Fechar edição").click();
      await expect(dialog(page)).toHaveCount(0);
      await expect(
        page.getByText("Há alterações ainda não salvas.", { exact: true }),
      ).toHaveCount(0);
      await login(peer, f.identity.email, f.patient);
      await openOwn(peer);
      await action(peer, "Continuar rascunho").click();
      await expect(
        dialog(peer).getByRole("textbox", {
          name: "Justificativa",
          exact: true,
        }),
      ).toHaveValue(f.content.values.reason);
      await expect(action(peer, "Revisar decisão")).toBeEnabled();
      if (purpose === "configure") {
        await page.getByRole("button", { name: open, exact: true }).click();
        await action(page, "Continuar rascunho").click();
        await dialog(page)
          .getByRole("textbox", { name: "Justificativa", exact: true })
          .fill("Primeira edição de outra sessão Auth real");
        await save(page);
        const own = "Minha edição concorrente permanece 🩺";
        await dialog(peer)
          .getByRole("textbox", { name: "Justificativa", exact: true })
          .fill(own);
        const response = peer.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/balances/preparations" &&
            r.request().method() === "POST",
        );
        await action(peer, "Salvar preenchimento privado").click();
        expect((await response).status()).toBe(409);
        await action(
          peer,
          "Manter minha edição para salvar nova revisão",
        ).click();
        await expect(
          dialog(peer).getByRole("textbox", {
            name: "Justificativa",
            exact: true,
          }),
        ).toHaveValue(own);
        await save(peer);
        let mode: "denied" | "invalid" | "valid" = "denied";
        await peer.route(
          "**/api/balances/preparations/reference?**",
          (route) =>
            mode === "denied"
              ? route.fulfill({
                  status: 403,
                  json: {
                    error: "Referência de teste recusada",
                    code: "FORBIDDEN",
                  },
                })
              : mode === "invalid"
                ? route.fulfill({ status: 200, json: { data: {} } })
                : route.continue(),
        );
        await action(peer, "Consultar situação atual do pedido").click();
        await expect(
          dialog(peer).getByRole("textbox", {
            name: "Justificativa",
            exact: true,
          }),
        ).toHaveCount(0);
        mode = "invalid";
        await action(peer, "Revalidar acesso ao preenchimento").click();
        await expect(
          dialog(peer).getByRole("textbox", {
            name: "Justificativa",
            exact: true,
          }),
        ).toHaveValue(own);
        await expect(action(peer, "Revisar decisão")).toBeDisabled();
        mode = "valid";
        await action(peer, "Consultar situação atual do pedido").click();
        await action(
          peer,
          "Adotar referência atual preservando meu preenchimento",
        ).click();
        await expect(
          dialog(peer).getByRole("textbox", {
            name: "Justificativa",
            exact: true,
          }),
        ).toHaveValue(own);
      }
      const widths =
        purpose === "configure" || purpose === "assign"
          ? [1440, 768, 390, 320]
          : [320];
      for (const width of widths) {
        await peer.setViewportSize({ width, height: 940 });
        await dialog(peer)
          .getByRole("textbox", { name: "Justificativa", exact: true })
          .focus();
        await audit(peer, `bal-workspace-${purpose}-${width}`);
      }
      await info.attach(`bal-workspace-${purpose}-${info.project.name}`, {
        body: await peer.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
      const attempts: Array<Record<string, unknown>> = [];
      let after = before;
      let completeLoss!: () => void;
      const responseLost = new Promise<void>((resolve) => {
        completeLoss = resolve;
      });
      await peer.route("**/api/balances/preparations/commit", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) {
          const response = await route.fetch();
          expect(response.ok(), await response.text()).toBe(true);
          after = preparationFacts(f);
          const cap =
            purpose === "configure" || purpose === "assign"
              ? "bal.schedule.manage"
              : purpose === "request_deferral"
                ? "bal.defer.request"
                : "bal.defer.approve";
          sql(
            `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);`,
          );
          await route.abort("failed");
          completeLoss();
        } else await route.continue();
      });
      await action(peer, "Revisar decisão").click();
      await expect(dialog(peer)).toHaveAccessibleName(
        "Revisar decisão do balanço",
      );
      await expect(dialog(peer).getByRole("textbox")).toHaveCount(0);
      await action(peer, "Confirmar decisão").click();
      // Assert recovery after the real commit, revocation and injected loss.
      await responseLost;
      await expect(action(peer, "Recuperar a mesma tentativa")).toBeVisible();
      await expect(action(peer, "Voltar")).toBeDisabled();
      await peer.keyboard.press("Escape");
      await expect(dialog(peer)).toBeVisible();
      const referenceReads: string[] = [];
      peer.on("request", (r) => {
        if (
          new URL(r.url()).pathname === "/api/balances/preparations/reference"
        )
          referenceReads.push(r.url());
      });
      await peer.reload();
      await openOwn(peer, true);
      // The temporary review disappears when the own consumed row arrives.
      // The persistent recovery action must survive that authorized read.
      await expect(
        dialog(peer).getByText(/Este preenchimento já registrou uma decisão/),
      ).toBeVisible();
      await expect(action(peer, "Recuperar a mesma tentativa")).toBeVisible();
      expect(referenceReads).toHaveLength(0);
      await action(peer, "Recuperar a mesma tentativa").click();
      await expect(dialog(peer)).toHaveCount(0);
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toEqual(attempts[1]);
      expect(preparationFacts(f)).toEqual(after);
      expect(after.ledger).toEqual(before.ledger);
      expect(after.documents).toEqual(before.documents);
      await openOwn(peer, true);
      await expect(
        dialog(peer).getByText(/Este preenchimento já registrou uma decisão/),
      ).toBeVisible();
      expect(referenceReads).toHaveLength(0);
      await action(
        peer,
        "Confirmar resultado e começar novo preenchimento",
      ).click();
      await expect(dialog(peer)).toHaveCount(0);
      expect(preparationFacts(f)).toEqual(after);
    } finally {
      await peerContext.close();
    }
  });
}
