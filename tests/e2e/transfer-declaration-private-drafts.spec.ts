import {
  expect,
  test,
  type Page,
  type Browser,
  type TestInfo,
} from "@playwright/test";
import {
  declarationDraftFixture,
  declarationFacts,
} from "../integration/transfer-declaration-draft-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { Custody, SupplyDocument } from "../../src/types/documents";
import type { TransferPreparation } from "../../src/types/transfers";
test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof declarationDraftFixture>>;
const dialog = (page: Page) => page.getByRole("dialog");
const direction = (source: Custody) =>
  source === "FAMILY" ? "Família → Equipe" : "Equipe → Família";
async function login(page: Page, f: Fixture) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
}
async function open(page: Page, source: Custody) {
  await page.goto("/transferencias");
  await page
    .getByRole("combobox", { name: /^Custódia de origem/ })
    .selectOption(source);
  await page
    .getByRole("button", { name: "Preparar declaração", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("combobox", {
      name: /^Contraparte para concordância/,
    }),
  ).toBeVisible();
}
async function fill(page: Page, f: Fixture, amount = "0,") {
  await dialog(page)
    .getByRole("combobox", { name: /^Contraparte para concordância/ })
    .selectOption(f.counterpartyId);
  await dialog(page)
    .getByRole("combobox", { name: /^Recebedor físico designado/ })
    .selectOption(f.recipientId);
  const search = dialog(page).getByRole("combobox", {
    name: /^Adicionar material da origem/,
  });
  await search.click();
  await search.fill("Material fictício V4 0");
  await search.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await dialog(page)
    .getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ })
    .fill(amount);
  if (f.originId)
    await dialog(page)
      .getByRole("combobox", { name: /^ENT documental de origem/ })
      .selectOption(f.originId);
  await dialog(page)
    .getByRole("textbox", { name: /^Sua justificativa para a (entrega|devolução) de materiais/ })
    .fill("\uFEFF\n Declaração própria preservada entre sessões\u00A0");
}
async function save(page: Page) {
  const request = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await dialog(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  const response = await request;
  expect(response.ok()).toBe(true);
  return response.request().postDataJSON();
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
async function resume(page: Page) {
  await dialog(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
}
async function recover(page: Page, source: Custody) {
  await page
    .getByText("Minhas declarações em preparação", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Consultar preenchimento: " + direction(source),
      exact: true,
    })
    .click();
}
for (const source of ["FAMILY", "CARE_TEAM"] as const) {
  test(
    "declaração " +
      source +
      " retoma campos parciais entre sessões,nega403 e200 inválido e preserva pessoa inelegível até troca explícita",
    async ({ page, browser }, info) => {
      const f = await declarationDraftFixture(source);
      await login(page, f);
      await open(page, source);
      await fill(page, f);
      const search = dialog(page).getByRole("combobox", {
        name: /^Adicionar material da origem/,
      });
      await search.fill("Busca própria ainda sem seleção");
      await search.press("Escape");
      const before = declarationFacts(f),
        packet = await save(page);
      expect(packet.targetDocumentId).toBeNull();
      expect(packet.content.documentVersion).toBeNull();
      expect(packet.content.fields[f.products[0] + ":transferQuantity"]).toBe(
        "0,",
      );
      expect(JSON.stringify(packet.content)).not.toContain("available");
      expect(JSON.stringify(packet.content)).not.toContain("originTotal");
      expect(declarationFacts(f)).toBe(before);
      const context = await peerContext(browser, page, info),
        peer = await context.newPage();
      try {
        await login(peer, f);
        await open(peer, source);
        await resume(peer);
        await expect(
          dialog(peer).getByRole("textbox", {
            name: /^Quantidade de Material fictício V4 0/,
          }),
        ).toHaveValue("0,");
        await expect(
          dialog(peer).getByRole("button", {
            name: "Revisar declaração",
            exact: true,
          }),
        ).toBeDisabled();
        let fault: "live" | "forbidden" | "invalid" = "forbidden";
        await peer.route(/\/api\/transfers\/preparation\?/, (route) =>
          fault === "live"
            ? route.continue()
            : route.fulfill({
                status: fault === "forbidden" ? 403 : 200,
                json:
                  fault === "forbidden"
                    ? {
                        error: "Referência recusada fictícia",
                        code: "FORBIDDEN",
                      }
                    : { data: { patientId: f.patient } },
              }),
        );
        for (const mode of ["forbidden", "invalid"] as const) {
          fault = mode;
          await dialog(peer)
            .getByRole("button", {
              name: "Comparar referência atual",
              exact: true,
            })
            .click();
          await expect(
            dialog(peer)
              .getByRole("alert")
              .filter({
                hasText:
                  mode === "forbidden"
                    ? "Referência recusada fictícia"
                    : "não pôde ser conferida",
              }),
          ).toBeVisible();
          await expect(
            dialog(peer).getByRole("button", {
              name: "Adotar referência atual e revisar meus campos",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(
            dialog(peer).getByText("Disponível na origem:", { exact: false }),
          ).toHaveCount(0);
          if (mode === "forbidden") await resume(peer);
        }
        sql(
          "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
            q(f.patient) +
            "," +
            q(f.counterpartyId) +
            ",'ent.receive',false);",
        );
        const latest = (await rpc(f.client, "transfer_preparation", {
          p_patient: f.patient,
          p_source: source,
        })) as TransferPreparation;
        const replacement = latest.people.find(
          (person) =>
            person.id !== f.counterpartyId && person.id !== f.recipientId,
        );
        expect(replacement).toBeTruthy();
        fault = "live";
        await dialog(peer)
          .getByRole("button", {
            name: "Comparar referência atual",
            exact: true,
          })
          .click();
        await expect(
          dialog(peer).getByRole("region", {
            name: "Comparação da referência da transferência",
            exact: true,
          }),
        ).toContainText("Escolha indisponível");
        await dialog(peer)
          .getByRole("button", {
            name: "Adotar referência atual e revisar meus campos",
            exact: true,
          })
          .click();
        const counterparty = dialog(peer).getByRole("combobox", {
          name: /^Contraparte para concordância/,
        });
        await expect(counterparty).toHaveValue(f.counterpartyId);
        await expect(counterparty.locator("option:checked")).toContainText(
          packet.content.fields.counterpartyLabel,
        );
        await expect(
          dialog(peer).getByRole("textbox", {
            name: /^Quantidade de Material fictício V4 0/,
          }),
        ).toHaveValue("0,");
        await expect(
          dialog(peer).getByRole("textbox", {
            name: /^Sua justificativa para a (entrega|devolução) de materiais/,
          }),
        ).toHaveValue(packet.content.fields.reason);
        await expect(
          dialog(peer).getByRole("combobox", {
            name: /^Adicionar material da origem/,
          }),
        ).toHaveValue(packet.content.fields.query);
        await counterparty.selectOption(replacement!.id);
        if (source === "FAMILY")
          await dialog(peer)
            .getByRole("combobox", { name: /^Recebedor físico designado/ })
            .selectOption(replacement!.id);
        await dialog(peer)
          .getByRole("textbox", {
            name: /^Quantidade de Material fictício V4 0/,
          })
          .fill("2");
        if (source === "CARE_TEAM") {
          for (const width of [320, 390, 768, 1440]) {
            await peer.setViewportSize({ width, height: 900 });
            await audit(
              peer,
              "private transfer declaration " + source + " " + width,
            );
          }
          await info.attach("declaracao-privada", {
            body: await peer.screenshot({ animations: "disabled" }),
            contentType: "image/png",
          });
        } else await audit(peer, "private transfer declaration " + source);
        expect(declarationFacts(f)).toBe(before);
        await dialog(peer)
          .getByRole("button", { name: "Revisar declaração", exact: true })
          .click();
        await expect(
          dialog(peer).getByRole("heading", {
            name: "Conferir declaração antes de registrar",
            exact: true,
          }),
        ).toBeFocused();
        expect(declarationFacts(f)).toBe(before);
        await dialog(peer)
          .getByRole("button", {
            name: "Registrar declaração sem expedir",
            exact: true,
          })
          .click();
        await expect(
          dialog(peer).getByRole("heading", {
            name: "Declaração confirmada",
            exact: true,
          }),
        ).toBeVisible();
        expect(JSON.parse(declarationFacts(f)).ledger).toEqual(
          JSON.parse(before).ledger,
        );
      } finally {
        await context.close();
      }
    },
  );
  test(
    "declaração " +
      source +
      " recupera resultado consumido após reload e perda de escrita sem novo POST oficial",
    async ({ page }) => {
      const f = await declarationDraftFixture(source);
      await login(page, f);
      await open(page, source);
      await fill(page, f, "2");
      const before = JSON.parse(declarationFacts(f));
      let document: SupplyDocument | undefined;
      const packets: unknown[] = [];
      await page.route("**/api/transfers", async (route) => {
        packets.push(route.request().postDataJSON());
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        document = (await response.json()).data;
        sql(
          "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
            q(f.patient) +
            "," +
            q(f.writerId) +
            ",'ent.create',false);",
        );
        await route.abort("failed");
      });
      await dialog(page)
        .getByRole("button", { name: "Revisar declaração", exact: true })
        .click();
      await dialog(page)
        .getByRole("button", {
          name: "Registrar declaração sem expedir",
          exact: true,
        })
        .click();
      await expect(
        dialog(page).getByRole("button", {
          name: "Recuperar mesma declaração",
          exact: true,
        }),
      ).toBeVisible();
      expect(document?.transfer?.state).toBe("pending");
      expect(JSON.parse(declarationFacts(f)).ledger).toEqual(before.ledger);
      const after = declarationFacts(f);
      await page.reload();
      let preparations = 0;
      page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/api/transfers/preparation")
          preparations++;
      });
      await recover(page, source);
      await expect(
        dialog(page).getByRole("button", {
          name: "Reconhecer declaração registrada",
          exact: true,
        }),
      ).toBeEnabled();
      await expect(dialog(page).getByRole("textbox")).toHaveCount(0);
      await expect(
        dialog(page).getByRole("button", {
          name: "Registrar declaração sem expedir",
          exact: true,
        }),
      ).toHaveCount(0);
      const row = await (
        await page.request.get(
          "/api/drafts?careRecipientId=" +
            f.patient +
            "&kind=ENT&purpose=" +
            f.purpose,
        )
      ).json();
      expect(row.data.consumedDocumentId).toBe(document!.id);
      expect(row.data.targetDocumentId).toBeNull();
      await dialog(page)
        .getByRole("button", {
          name: "Reconhecer declaração registrada",
          exact: true,
        })
        .click();
      expect(packets).toHaveLength(1);
      expect(preparations).toBe(0);
      expect(declarationFacts(f)).toBe(after);
    },
  );
  test(
    "declaração " +
      source +
      " conserva consulta e descarte privados após perder leitura da origem",
    async ({ page }) => {
      const f = await declarationDraftFixture(source);
      await login(page, f);
      await open(page, source);
      await fill(page, f);
      const before = declarationFacts(f),
        packet = await save(page);
      const capability =
        source === "FAMILY" ? "stock.family.read" : "stock.team.read";
      sql(
        "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
          q(f.patient) +
          "," +
          q(f.writerId) +
          "," +
          q(capability) +
          ",false);",
      );
      await page.reload();
      let preparations = 0;
      page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/api/transfers/preparation")
          preparations++;
      });
      await recover(page, source);
      await dialog(page)
        .getByRole("button", {
          name: "Consultar preenchimento salvo",
          exact: true,
        })
        .click();
      await expect(
        dialog(page).getByText(
          "Sua justificativa: " + packet.content.fields.reason,
          { exact: false },
        ),
      ).toBeVisible();
      await expect(dialog(page).getByRole("textbox")).toHaveCount(0);
      await expect(
        dialog(page).getByRole("button", {
          name: "Revisar declaração",
          exact: true,
        }),
      ).toHaveCount(0);
      await dialog(page)
        .getByRole("button", {
          name: "Descartar preenchimento privado",
          exact: true,
        })
        .click();
      expect(preparations).toBe(0);
      expect(declarationFacts(f)).toBe(before);
    },
  );
}
