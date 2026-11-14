import {
  expect,
  test,
  type Page,
  type Browser,
  type TestInfo,
} from "@playwright/test";
import {
  transferDecisionFixture,
  decisionReason,
  decisionFacts,
} from "../integration/transfer-decision-draft-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import {
  transferActionLabels,
  type TransferAction,
} from "../../src/lib/forms/transfer-decision-draft";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { audit } from "./accessibility-audit";
test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof transferDecisionFixture>>;
async function login(page: Page, f: Fixture) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.writer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
}
async function peerContext(browser: Browser, page: Page, info: TestInfo) {
  const use = info.project.use;
  return browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: use.viewport,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    deviceScaleFactor: use.deviceScaleFactor,
    userAgent: use.userAgent,
  });
}
const dialog = (page: Page) => page.getByRole("dialog");
async function open(page: Page, f: Fixture, action: TransferAction) {
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: transferActionLabels[action], exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
}
async function recovery(page: Page, action: TransferAction) {
  await page
    .getByText("Meus preenchimentos da transferência", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Consultar preenchimento: " + transferActionLabels[action],
      exact: true,
    })
    .click();
}
for (const action of ["agree", "decline", "withdraw", "dispatch"] as const) {
  test(
    "transferência " +
      action +
      " retoma entre sessões,exige referência atual e recupera resultado sem repetir efeitos",
    async ({ page, browser }, info) => {
      const f = await transferDecisionFixture(action);
      await login(page, f);
      await open(page, f, action);
      const before = decisionFacts(f);
      if (action !== "dispatch")
        await dialog(page)
          .getByRole("textbox", {
            name: "Sua justificativa para este ato",
            exact: true,
          })
          .fill(decisionReason);
      const save = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/drafts" &&
          r.request().method() === "POST",
      );
      await dialog(page)
        .getByRole("button", {
          name: "Salvar preenchimento privado",
          exact: true,
        })
        .click();
      expect((await save).ok()).toBe(true);
      expect(decisionFacts(f)).toBe(before);
      const peer = await peerContext(browser, page, info),
        other = await peer.newPage();
      try {
        await login(other, f);
        await open(other, f, action);
        await dialog(other)
          .getByRole("button", { name: "Continuar rascunho", exact: true })
          .click();
        await expect(
          dialog(other).getByRole("button", {
            name: "Revisar meu ato",
            exact: true,
          }),
        ).toBeDisabled();
        if (action !== "dispatch")
          await expect(
            dialog(other).getByRole("textbox", {
              name: "Sua justificativa para este ato",
              exact: true,
            }),
          ).toHaveValue(decisionReason);
        let fault: "live" | "forbidden" | "invalid" = "live";
        if (action === "agree") {
          await other.route("**/api/documents/" + f.document.id, (route) =>
            route.request().method() !== "GET" || fault === "live"
              ? route.continue()
              : route.fulfill({
                  status: fault === "forbidden" ? 403 : 200,
                  json:
                    fault === "forbidden"
                      ? {
                          error: "Referência recusada fictícia",
                          code: "FORBIDDEN",
                        }
                      : { data: { id: f.document.id } },
                }),
          );
          for (const mode of ["forbidden", "invalid"] as const) {
            fault = mode;
            await dialog(other)
              .getByRole("button", {
                name: "Consultar e comparar transferência atual",
                exact: true,
              })
              .click();
            await expect(
              dialog(other)
                .getByRole("alert")
                .filter({
                  hasText:
                    mode === "forbidden"
                      ? "Referência recusada fictícia"
                      : "não pôde ser conferida",
                }),
            ).toBeVisible();
            await expect(
              dialog(other).getByRole("button", {
                name: "Adotar estado atual e revisar minha decisão",
                exact: true,
              }),
            ).toHaveCount(0);
            await expect(
              dialog(other).getByText("Justificativa original:", {
                exact: false,
              }),
            ).toHaveCount(0);
            if (mode === "forbidden")
              await dialog(other)
                .getByRole("button", {
                  name: "Continuar rascunho",
                  exact: true,
                })
                .click();
          }
          fault = "live";
        }
        await dialog(other)
          .getByRole("button", {
            name: "Consultar e comparar transferência atual",
            exact: true,
          })
          .click();
        await dialog(other)
          .getByRole("button", {
            name: "Adotar estado atual e revisar minha decisão",
            exact: true,
          })
          .click();
        if (action !== "dispatch")
          await expect(
            dialog(other).getByRole("textbox", {
              name: "Sua justificativa para este ato",
              exact: true,
            }),
          ).toHaveValue(decisionReason);
        await audit(other, "transfer private " + action);
        if (action === "agree")
          await info.attach("transferencia-rascunho", {
            body: await other.screenshot({ animations: "disabled" }),
            contentType: "image/png",
          });
        const packets: unknown[] = [];
        await other.route(
          "**/api/documents/" + f.document.id + "/transfer",
          async (route) => {
            packets.push(route.request().postDataJSON());
            const response = await route.fetch();
            expect(response.ok()).toBe(true);
            if (action === "dispatch" && packets.length === 1)
              await route.abort("failed");
            else await route.fulfill({ response });
          },
        );
        await dialog(other)
          .getByRole("button", { name: "Revisar meu ato", exact: true })
          .click();
        await expect(
          dialog(other).getByRole("heading", {
            name: "Conferir ato antes de confirmar",
            exact: true,
          }),
        ).toBeFocused();
        expect(decisionFacts(f)).toBe(before);
        await dialog(other)
          .getByRole("button", {
            name:
              action === "dispatch"
                ? "Confirmar expedição"
                : "Confirmar decisão",
            exact: true,
          })
          .click();
        if (action === "dispatch") {
          await dialog(other)
            .getByRole("button", { name: "Recuperar mesmo ato", exact: true })
            .click();
          expect(packets[1]).toEqual(packets[0]);
        }
        await expect(dialog(other)).toHaveCount(0);
        const after = decisionFacts(f);
        if (action !== "dispatch")
          expect(JSON.parse(after).ledger).toEqual(JSON.parse(before).ledger);
        else {
          expect(JSON.parse(after).ledger.length).toBe(
            JSON.parse(before).ledger.length + 1,
          );
          expect(
            JSON.parse(after).transfers.find(
              (t: { document_id: string }) => t.document_id === f.document.id,
            ).state,
          ).toBe("dispatched");
        }
        const count = packets.length;
        await other.reload();
        await selectDocumentSection(other, "workflow");
        await recovery(other, action);
        await expect(
          dialog(other).getByRole("button", {
            name: /^Confirmar (decisão|expedição)$/,
          }),
        ).toHaveCount(0);
        await dialog(other)
          .getByRole("button", {
            name: "Reconhecer resultado aplicado",
            exact: true,
          })
          .click();
        expect(packets.length).toBe(count);
        expect(decisionFacts(f)).toBe(after);
      } finally {
        await peer.close();
      }
    },
  );
}
test("transferência conserva consulta privada após perda de escrita sem oferecer formulário oficial", async ({
  page,
}) => {
  const f = await transferDecisionFixture("agree");
  await login(page, f);
  await open(page, f, "agree");
  await dialog(page)
    .getByRole("textbox", {
      name: "Sua justificativa para este ato",
      exact: true,
    })
    .fill("Texto pessoal a consultar após perder escrita");
  const saved = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await dialog(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  expect((await saved).ok()).toBe(true);
  sql(
    "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) +
      "," +
      q(f.writer.id) +
      ",'ent.receive',false);",
  );
  await page.reload();
  await selectDocumentSection(page, "workflow");
  await expect(
    page.getByRole("button", { name: transferActionLabels.agree, exact: true }),
  ).toHaveCount(0);
  await recovery(page, "agree");
  await dialog(page)
    .getByRole("button", { name: "Consultar preenchimento salvo", exact: true })
    .click();
  await expect(
    dialog(page).getByText("Texto pessoal a consultar após perder escrita", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog(page).getByRole("textbox")).toHaveCount(0);
  await expect(
    dialog(page).getByRole("button", { name: "Revisar meu ato", exact: true }),
  ).toHaveCount(0);
});
