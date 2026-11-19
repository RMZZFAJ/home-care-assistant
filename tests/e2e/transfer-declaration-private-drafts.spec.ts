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
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { loginDecision } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
import type { Custody, SupplyDocument } from "../../src/types/documents";
import type { TransferPreparation } from "../../src/types/transfers";
test.setTimeout(180_000);

test("resultado confirmado permanece acessível quando a consulta do rascunho consumido chega depois", async ({ page }) => {
  const f = await declarationDraftFixture("CARE_TEAM");
  await login(page, f);await open(page, "CARE_TEAM");await fill(page, f, "2");
  const before = JSON.parse(declarationFacts(f));
  let release!: () => void, consumedReads = 0, posts = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  page.on("request", request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/transfers") posts++;
  });
  await page.route("**/api/drafts?*", async route => {
    if (route.request().method() !== "GET" || new URL(route.request().url()).searchParams.get("careRecipientId") !== f.patient)
      return route.continue();
    const response = await route.fetch(), body = await response.json();
    if (body.data?.state === "consumed") { consumedReads++;await gate; }
    return route.fulfill({ response, json: body });
  });
  try {
    await editor(page).getByRole("button", { name: "Revisar ficha", exact: true }).click();
    await editor(page).getByRole("button", { name: "Expedir devolução", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Devolução expedida", exact: true })).toBeVisible();
    await expect.poll(() => consumedReads).toBeGreaterThan(0);
    const consumed = page.waitForResponse(async response => {
      const url = new URL(response.url());
      return url.pathname === "/api/drafts" && url.searchParams.get("careRecipientId") === f.patient
        && response.request().method() === "GET" && (await response.json()).data?.state === "consumed";
    });
    release();await (await consumed).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByRole("dialog", { name: "Resultado anterior confirmado", exact: true })).toHaveCount(0);
    const result = page.getByRole("dialog", { name: "Devolução expedida", exact: true });
    await expect(result).toBeVisible();
    const href = new URL(page.url()).pathname;expect(href).toMatch(/^\/fichas\/[0-9a-f-]{36}$/);
    const after = declarationFacts(f);expect(JSON.parse(after).ledger).toHaveLength(before.ledger.length + 1);expect(posts).toBe(1);
    await result.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(href + "(?:[?#]|$)"));
    expect(declarationFacts(f)).toBe(after);expect(posts).toBe(1);
  } finally { release();await page.unrouteAll({ behavior: "wait" }); }
});
type Fixture = Awaited<ReturnType<typeof declarationDraftFixture>>;
const dialog = (page: Page) => page.getByRole("dialog");
const editor = (page: Page) => page.getByRole("region", { name: /^Nova (devolução|entrega)$/ });
const recipient = (page: Page) => editor(page).getByRole("combobox", { name: /^Recebedor físico designado/ });
const amountField = (page: Page) => editor(page).getByRole("textbox", { name: /^Quantidade de Material fictício V4 0/ });
const observationField = (page: Page) => editor(page).getByLabel("Observação 1", { exact: true });
const stepButton = (page: Page, name: string) =>
  editor(page).getByRole("navigation", { name: "Etapas da ficha" }).getByRole("button", { name: new RegExp(name + "$") });
const continueStep = (page: Page) => editor(page).getByRole("button", { name: "Continuar", exact: true }).click();
const draftReason = "\uFEFF\n Declaração própria preservada entre sessões\u00A0";
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
  await expect(page.getByRole("dialog",{name:"Continuar seu rascunho?",exact:true}).or(recipient(page)).first()).toBeVisible();
}
async function fill(page: Page, f: Fixture, amount = "0,") {
  await recipient(page).selectOption(f.recipientId);
  const manualSelection = editor(page).getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true });
  if (await manualSelection.isVisible()) await manualSelection.fill("Escolha confirmada com a pessoa que fará a conferência.");
  if (f.originId)
    await editor(page).getByRole("combobox", { name: /^ENT documental de origem/ }).selectOption(f.originId);
  await editor(page).getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  const search = editor(page).getByRole("combobox", {
    name: /^Adicionar material da origem/,
  });
  await search.click();
  await search.fill("Material fictício V4 0");
  await search.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await amountField(page).fill("2");
  await continueStep(page);
  await continueStep(page);
  await editor(page).getByRole("button", { name: "Adicionar observação", exact: true }).click();
  await observationField(page).fill(draftReason);
  if (amount !== "2") {
    await stepButton(page, "Materiais").click();
    await amountField(page).fill(amount);
  }
}
async function savedDraft(page: Page, f: Fixture, query = "") {
  const url = "/api/drafts?" + new URLSearchParams({ careRecipientId: f.patient, kind: "ENT", purpose: f.purpose });
  const read = async () => (await (await page.request.get(url)).json()).data;
  await expect.poll(read).toMatchObject({
    state: "active",
    content: { observations: [draftReason], fields: { query, [f.products[0] + ":transferQuantity"]: "0," } },
  });
  return read();
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
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
}
async function recover(page: Page, source: Custody) {
 await page.goto("/transferencias"); await page.getByRole("combobox",{name:/^Custódia de origem/}).selectOption(source);
 await page.getByRole("button",{name:/^(Consultar último rascunho|Preparar declaração)$/}).click();
}
test("L2 DEV retoma o extra pendente, protege a revisão e expede após escolha do catálogo", async ({ page }, info) => {
  const f = await declarationDraftFixture("CARE_TEAM");
  const author = await shiftWorker(f.patient, "admin");
  const item = "Protetor de tecido fictício";
  const before = declarationFacts(f);
  await loginDecision(page, author.email, f.patient);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fichas/devolucao");
  const start = page.getByRole("button", { name: "Preparar devolução", exact: true });
  await start.click();
  await recipient(page).selectOption(f.recipientId);
  const reason = editor(page).getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true });
  if (await reason.isVisible()) await reason.fill("A pessoa designada receberá esta devolução.");
  await editor(page).getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await editor(page).getByRole("button", { name: "Item extra", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
  await dialog.getByLabel("Nome do material", { exact: true }).fill(item);
  await dialog.getByLabel("Unidade de medida", { exact: true }).selectOption("unidade");
  await dialog.getByLabel("Quantidade", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Adicionar material", exact: true }).click();
  await expect(stepButton(page, "Materiais")).toHaveAttribute("aria-current", "step");
  await continueStep(page);
  const name = editor(page).getByText(item, { exact: true });
  await expect(name).toHaveCount(1);
  const url = "/api/drafts?" + new URLSearchParams({ careRecipientId: f.patient, kind: "ENT", purpose: f.purpose });
  await expect.poll(async () => (await (await page.request.get(url)).json()).data?.content).toMatchObject({
    fields: { wizardStep: "2" }, pendingExtras: [{ name: item, quantity: "2", unit: "unidade" }],
  });
  await page.reload();
  await start.click();
  await resume(page);
  await editor(page).getByRole("button", { name: "Comparar referência atual", exact: true }).click();
  await editor(page).getByRole("button", { name: "Adotar referência atual e revisar meus campos", exact: true }).click();
  await expect(name).toHaveCount(1);
  await continueStep(page);
  await editor(page).getByRole("button", { name: "Revisar ficha", exact: true }).click();
  await expect(editor(page).getByRole("region", { name: "Itens extras pendentes", exact: true }).getByText(item, { exact: true })).toHaveCount(1);
  const dispatch = editor(page).getByRole("button", { name: "Expedir devolução", exact: true });
  await expect(dispatch).toBeDisabled();
  await info.attach("E06-revisao-extra-pendente", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  expect(declarationFacts(f)).toBe(before);
  await stepButton(page, "Extras").click();
  await editor(page).getByRole("button", { name: "Editar " + item, exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Editar item extra", exact: true });
  const product = f.reference.products.find((row: TransferPreparation["products"][number]) => row.id === f.products[0])!;
  await edit.getByLabel("Nome do material", { exact: true }).fill(product.name);
  await edit.getByRole("button", { name: `Usar item do catálogo: ${product.name} (${product.unit})`, exact: true }).click();
  await expect(name).toHaveCount(0);
  await amountField(page).fill("2");
  await continueStep(page);
  await editor(page).getByRole("button", { name: "Revisar ficha", exact: true }).click();
  const confirmed = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/transfers");
  await dispatch.click();
  const response = await confirmed;
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({ persistence: "confirmed", data: {
    transfer: { state: "dispatched" },
    lines: [{ product_id: product.id, metadata: { catalogueExtra: "true" } }],
  } });
  const after = JSON.parse(declarationFacts(f));
  expect(after.ledger).toHaveLength(JSON.parse(before).ledger.length + 1);
});

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
      const search = editor(page).getByRole("combobox", {
        name: /^Adicionar material da origem/,
      });
      await search.fill("Busca própria ainda sem seleção");
      await search.press("Escape");
      const before = declarationFacts(f),
        packet = await savedDraft(page, f, "Busca própria ainda sem seleção");
      expect(packet.targetDocumentId).toBeNull();
      expect(packet.content.documentVersion).toBeNull();
      expect(packet.content.fields[f.products[0] + ":transferQuantity"]).toBe(
        "0,",
      );
      expect(JSON.stringify(packet.content)).not.toContain("available");
      expect(JSON.stringify(packet.content)).not.toContain("originTotal");
      expect(declarationFacts(f)).toBe(before);
      // Retire the first editor before continuing on the other device.
      // Intentionally concurrent editors have a separate CAS regression.
      await page.goto("/");
      const context = await peerContext(browser, page, info),
        peer = await context.newPage();
      try {
        await login(peer, f);
        await open(peer, source);
        await resume(peer);
        await expect(
          editor(peer).getByRole("textbox", {
            name: /^Quantidade de Material fictício V4 0/,
          }),
        ).toHaveValue("0,");
        await expect(
          editor(peer).getByRole("button", {
            name: "Revisar ficha",
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
          await editor(peer)
            .getByRole("button", {
              name: "Comparar referência atual",
              exact: true,
            })
            .click();
          await expect(
            editor(peer)
              .getByRole("alert")
              .filter({
                hasText:
                  mode === "forbidden"
                    ? "Referência recusada fictícia"
                    : "não pôde ser conferida",
              }),
          ).toBeVisible();
          await expect(
            editor(peer).getByRole("button", {
              name: "Adotar referência atual e revisar meus campos",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(
            editor(peer).getByText("Disponível na origem:", { exact: false }),
          ).toHaveCount(0);
          await expect(
            peer.getByRole("dialog", { name: "Continuar seu rascunho?" }),
          ).toHaveCount(0);
        }
        sql(
          "insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
            q(f.patient) +
            "," +
            q(f.recipientId) +
            ",'ent.receive',false);",
        );
        const latest = (await rpc(f.client, "transfer_preparation", {
          p_patient: f.patient,
          p_source: source,
        })) as TransferPreparation;
        const replacement = latest.people.find(
          (person) => person.id !== f.recipientId,
        );
        expect(replacement).toBeTruthy();
        fault = "live";
        await editor(peer)
          .getByRole("button", {
            name: "Comparar referência atual",
            exact: true,
          })
          .click();
        await expect(
          editor(peer).getByRole("region", {
            name: "Comparação da referência da transferência",
            exact: true,
          }),
        ).toContainText("Escolha indisponível");
        await editor(peer)
          .getByRole("button", {
            name: "Adotar referência atual e revisar meus campos",
            exact: true,
          })
          .click();
        await expect(stepButton(peer, "Materiais")).toHaveAttribute("aria-current", "step");
        await expect(amountField(peer)).toHaveValue("0,");
        await expect(
          editor(peer).getByRole("combobox", {
            name: /^Adicionar material da origem/,
          }),
        ).toHaveValue(packet.content.fields.query);
        await stepButton(peer, "Confirmação").click();
        await expect(recipient(peer)).toHaveValue(f.recipientId);
        await expect(recipient(peer).locator("option:checked")).toContainText(packet.content.fields.recipientLabel);
        await expect(recipient(peer).locator("option:checked")).toBeDisabled();
        await recipient(peer).selectOption(replacement!.id);
        await editor(peer).getByRole("button", { name: "Selecionar materiais", exact: true }).click();
        await amountField(peer).fill("2");
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
        await continueStep(peer);
        await continueStep(peer);
        await expect(observationField(peer)).toHaveValue(packet.content.observations[0]);
        await editor(peer)
          .getByRole("button", { name: "Revisar ficha", exact: true })
          .click();
        await expect(
          editor(peer).getByRole("heading", {
            name: "Revise antes de expedir",
            exact: true,
          }),
        ).toBeFocused();
        expect(declarationFacts(f)).toBe(before);
        await editor(peer)
          .getByRole("button", {
            name: /^Expedir (entrega|devolução)$/,
            exact: true,
          })
          .click();
        await expect(
          peer.getByRole("heading", { name: /^(Entrega|Devolução) expedida$/ }),
        ).toBeVisible();
        expect(JSON.parse(declarationFacts(f)).ledger).toHaveLength(JSON.parse(before).ledger.length + 1);
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
      await editor(page)
        .getByRole("button", { name: "Revisar ficha", exact: true })
        .click();
      await editor(page)
        .getByRole("button", {
          name: /^Expedir (entrega|devolução)$/,
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog", { name: "Resultado ainda não confirmado", exact: true })).toBeVisible();
      expect(document?.transfer?.state).toBe("dispatched");
      expect(JSON.parse(declarationFacts(f)).ledger).toHaveLength(before.ledger.length + 1);
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
          name: "Começar novo preenchimento",
          exact: true,
        }),
      ).toBeEnabled();
      await expect(dialog(page).getByRole("textbox")).toHaveCount(0);
      await expect(
        dialog(page).getByRole("button", {
          name: /^Expedir (entrega|devolução)$/,
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
          name: "Começar novo preenchimento",
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
        packet = await savedDraft(page, f);
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
          packet.content.observations[0].trim(),
          { exact: false },
        ),
      ).toBeVisible();
      await expect(dialog(page).getByRole("textbox")).toHaveCount(0);
      await expect(
        dialog(page).getByRole("button", {
          name: "Revisar ficha",
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


test("declaração aguarda autosave em andamento antes de revisar sem conflito com a própria gravação", async ({ page }) => {
  const f = await declarationDraftFixture("FAMILY");
  await login(page, f);
  await open(page, "FAMILY");
  const before = declarationFacts(f);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const isSave = (request: import("@playwright/test").Request) =>
    new URL(request.url()).pathname === "/api/drafts" &&
    request.method() === "POST" && request.postDataJSON().action === "save" &&
    request.postDataJSON().content?.observations?.[0] === draftReason;
  const started = page.waitForRequest(isSave);
  await page.route("**/api/drafts", async route => {
    if (!isSave(route.request())) return route.continue();
    await gate;
    return route.continue();
  });
  try {
    await fill(page, f, "2");
    await started;
    const review = editor(page).getByRole("button", { name: "Revisar ficha", exact: true });
    await expect(review).toBeDisabled();
    await expect(observationField(page)).toHaveValue(draftReason);
    expect(declarationFacts(f)).toBe(before);
    release();
    await expect(review).toBeEnabled();
    await review.click();
    await expect(editor(page).getByRole("heading", { name: "Revise antes de expedir", exact: true })).toBeFocused();
    await expect(editor(page).getByRole("alert")).toHaveCount(0);
    expect(declarationFacts(f)).toBe(before);
  } finally { release(); }
});
