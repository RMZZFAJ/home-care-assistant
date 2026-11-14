import {
  expect,
  test,
  type Page,
  type Browser,
  type TestInfo,
} from "@playwright/test";
import {
  reqDecisionFixture,
  reqDecisionFacts,
} from "../integration/requisition-decision-draft-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection, openDocumentMore } from "./document-sections";
import { audit } from "./accessibility-audit";
import type { RequisitionOperationPurpose } from "../../src/lib/validation/supply-drafts";

test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof reqDecisionFixture>>;
const drawer = (page: Page) => page.getByRole("dialog");
const reasonField = (page: Page, purpose: RequisitionOperationPurpose) =>
  drawer(page).getByRole("textbox", {
    name:
      purpose === "resolve_extra"
        ? "Justificativa da associação"
        : "Justificativa",
    exact: true,
  });
const reviewButton = (page: Page, purpose: RequisitionOperationPurpose) =>
  drawer(page).getByRole("button", {
    name:
      purpose === "resolve_extra" ? "Revisar associação" : "Revisar decisão",
    exact: true,
  });
const confirmLabel = (purpose: RequisitionOperationPurpose) =>
  purpose === "archive"
    ? "Confirmar arquivamento"
    : purpose === "cancel"
      ? "Confirmar cancelamento"
      : "Confirmar associação";
async function login(page: Page, f: Fixture) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/documentos/${f.req.id}`);
}
async function open(
  page: Page,
  purpose: RequisitionOperationPurpose,
  existing = false,
) {
  if (purpose === "resolve_extra") {
    await selectDocumentSection(page, "materials");
    await page
      .getByRole("button", { name: "Identificar item extra", exact: true })
      .click();
  } else {
    await openDocumentMore(page);
    await page
      .locator(".hca-document-more-actions")
      .getByRole("button", {
        name:
          purpose === "archive"
            ? "Revisar arquivamento manual"
            : "Cancelar requisição",
        exact: true,
      })
      .click();
  }
  await expect(reasonField(page, purpose)).toBeVisible();
  if (existing)
    await expect(
      drawer(page).getByRole("button", {
        name: "Continuar rascunho",
        exact: true,
      }),
    ).toBeVisible();
  else
    await expect(
      drawer(page).getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      }),
    ).toBeEnabled();
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
function formalPath(f: Fixture) {
  return `/api/requisitions/${f.req.id}/${f.purpose === "cancel" ? "status" : f.purpose === "archive" ? "archive" : "resolve"}`;
}

for (const purpose of ["archive", "cancel", "resolve_extra"] as const) {
  test(
    "REQ " +
      purpose +
      " retoma preenchimento parcial entre sessões,bloqueia referência403 e200 inválido e confirma somente após adoção explícita",
    async ({ page, browser }, info) => {
      const f = await reqDecisionFixture(purpose);
      await login(page, f);
      await open(page, purpose);
      const beforeSave = reqDecisionFacts(f),
        raw = " \n a \t";
      let posts = 0;
      const track = (request: { url(): string; method(): string }) => {
        if (
          new URL(request.url()).pathname === formalPath(f) &&
          request.method() !== "GET"
        )
          posts++;
      };
      page.on("request", track);
      if (purpose === "resolve_extra")
        await drawer(page)
          .getByRole("combobox", {
            name: "Produto correspondente",
            exact: true,
          })
          .selectOption(f.products[1]);
      await reasonField(page, purpose).fill(raw);
      const savedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/drafts" &&
          response.request().method() === "POST",
      );
      await drawer(page)
        .getByRole("button", {
          name: "Salvar preenchimento privado",
          exact: true,
        })
        .click();
      const saved = await savedResponse;
      expect(saved.status()).toBe(200);
      expect(saved.request().postDataJSON().content.fields.reason).toBe(raw);
      expect(reqDecisionFacts(f)).toBe(beforeSave);
      expect(posts).toBe(0);
      const context = await peerContext(browser, page, info),
        peer = await context.newPage();
      peer.on("request", track);
      try {
        await login(peer, f);
        await open(peer, purpose, true);
        await drawer(peer)
          .getByRole("button", { name: "Continuar rascunho", exact: true })
          .click();
        await expect(reasonField(peer, purpose)).toHaveValue(raw);
        if (purpose === "resolve_extra")
          await expect(
            drawer(peer).getByRole("combobox", {
              name: "Produto correspondente",
              exact: true,
            }),
          ).toHaveValue(f.products[1]);
        await expect(reviewButton(peer, purpose)).toBeDisabled();
        let mode: "denied" | "invalid" | "live" = "denied";
        await peer.route(
          `**/api/requisitions/${f.req.id}/decision-context`,
          (route) =>
            mode === "live"
              ? route.continue()
              : route.fulfill({
                  status: mode === "denied" ? 403 : 200,
                  json:
                    mode === "denied"
                      ? {
                          error: "Referência REQ fictícia recusada",
                          code: "FORBIDDEN",
                        }
                      : { data: { id: f.req.id } },
                }),
        );
        for (const fault of ["denied", "invalid"] as const) {
          mode = fault;
          await drawer(peer)
            .getByRole("button", {
              name: "Comparar referência atual",
              exact: true,
            })
            .click();
          await expect(
            drawer(peer)
              .getByRole("alert")
              .filter({
                hasText:
                  fault === "denied"
                    ? "Referência REQ fictícia recusada"
                    : "Não foi possível conferir a referência atual",
              }),
          ).toBeVisible();
          await expect(reasonField(peer, purpose)).toHaveValue(raw);
          await expect(
            drawer(peer).getByRole("button", {
              name: "Adotar estado atual e revisar meus campos",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(reviewButton(peer, purpose)).toBeDisabled();
          await expect(
            drawer(peer).getByText(
              new RegExp("^" + f.reference.code + " · versão"),
            ),
          ).toHaveCount(0);
        }
        mode = "live";
        await drawer(peer)
          .getByRole("button", {
            name: "Comparar referência atual",
            exact: true,
          })
          .click();
        await drawer(peer)
          .getByRole("button", {
            name: "Adotar estado atual e revisar meus campos",
            exact: true,
          })
          .click();
        await expect(reasonField(peer, purpose)).toHaveValue(raw);
        await reviewButton(peer, purpose).click();
        await expect(reasonField(peer, purpose)).toHaveAttribute(
          "aria-invalid",
          "true",
        );
        await expect(reasonField(peer, purpose)).toBeFocused();
        expect(posts).toBe(0);
        await reasonField(peer, purpose).fill(
          "\uFEFF\n Justificativa conferida e preservada\u00A0",
        );
        if (purpose === "resolve_extra") {
          for (const width of [320, 390, 768, 1024, 1440]) {
            await peer.setViewportSize({ width, height: 900 });
            await audit(peer, "REQ own extra decision " + width);
            expect(
              await peer.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true);
          }
          await info.attach("REQ-own-extra-decision", {
            body: await peer.screenshot(),
            contentType: "image/png",
          });
        }
        const beforeReview = reqDecisionFacts(f);
        await reviewButton(peer, purpose).click();
        await expect(
          drawer(peer).getByRole("heading", {
            name: "Conferir decisão antes de confirmar",
            exact: true,
          }),
        ).toBeFocused();
        expect(reqDecisionFacts(f)).toBe(beforeReview);
        expect(posts).toBe(0);
        await drawer(peer)
          .getByRole("button", { name: confirmLabel(purpose), exact: true })
          .click();
        await expect(drawer(peer)).toHaveCount(0);
        expect(posts).toBe(1);
        const read = await peer.request.get(
          `/api/drafts?careRecipientId=${f.patient}&kind=REQ&purpose=${purpose}&targetDocumentId=${f.req.id}`,
        );
        expect(read.status()).toBe(200);
        expect((await read.json()).data).toMatchObject({
          state: "consumed",
          consumedDocumentId: f.req.id,
        });
      } finally {
        await context.close();
      }
    },
  );
}

test("REQ resposta perdida recupera o pacote exato após perda das duas capacidades e reconhece resultado após reload sem novo POST", async ({
  page,
}) => {
  const f = await reqDecisionFixture("cancel");
  await login(page, f);
  await open(page, "cancel");
  await reasonField(page, "cancel").fill(
    "Cancelamento próprio com resposta perdida",
  );
  await reviewButton(page, "cancel").click();
  await expect(
    drawer(page).getByRole("heading", {
      name: "Conferir decisão antes de confirmar",
      exact: true,
    }),
  ).toBeFocused();
  const packets: unknown[] = [];
  await page.route(`**${formalPath(f)}`, async (route) => {
    packets.push(route.request().postDataJSON());
    if (packets.length === 1) {
      const upstream = await route.fetch();
      expect(upstream.status()).toBe(200);
      await route.abort("failed");
    } else await route.continue();
  });
  await drawer(page)
    .getByRole("button", { name: "Confirmar cancelamento", exact: true })
    .click();
  await expect(
    drawer(page).getByRole("button", {
      name: "Recuperar mesma decisão",
      exact: true,
    }),
  ).toBeEnabled();
  const committed = reqDecisionFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.review',false),(${q(f.patient)},${q(fixtures.adminA.id)},'req.create',false);`,
  );
  await drawer(page)
    .getByRole("button", { name: "Recuperar mesma decisão", exact: true })
    .click();
  await expect(drawer(page)).toHaveCount(0);
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  expect(reqDecisionFacts(f)).toBe(committed);
  let references = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname ===
      `/api/requisitions/${f.req.id}/decision-context`
    )
      references++;
  });
  await page.reload();
  await page
    .getByText("Minhas decisões em preparação", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Consultar preparação: Cancelar requisição",
      exact: true,
    })
    .click();
  await expect(
    drawer(page).getByRole("button", {
      name: "Reconhecer resultado aplicado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(drawer(page).getByRole("textbox")).toHaveCount(0);
  expect(references).toBe(0);
  await drawer(page)
    .getByRole("button", { name: "Reconhecer resultado aplicado", exact: true })
    .click();
  await expect(
    drawer(page).getByText(
      "Nenhum preenchimento ou resultado privado pendente para esta decisão neste perfil.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(packets).toHaveLength(2);
  expect(reqDecisionFacts(f)).toBe(committed);
});

test("REQ revalida acesso sem substituir edição própria e compara revisão privada alterada por outra sessão", async ({ page }) => {
  const f = await reqDecisionFixture("cancel");
  await login(page, f); await open(page, "cancel");
  await reasonField(page, "cancel").fill("Primeira cópia confirmada no servidor");
  const firstResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/drafts" && response.request().method() === "POST");
  await drawer(page).getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  const response = await firstResponse, saved = (await response.json()).data, original = response.request().postDataJSON();
  await expect(drawer(page).getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toBeEnabled();
  const local = "Minha edição local ainda não salva";
  await reasonField(page, "cancel").fill(local);
  const before = reqDecisionFacts(f);
  await page.route(`**/api/requisitions/${f.req.id}/decision-context`, route => route.fulfill({ status: 403, json: { error: "Referência fictícia recusada para revalidar acesso pessoal", code: "FORBIDDEN" } }));
  let invalidPrivateRead = true;
  await page.route("**/api/drafts?**", route => route.request().method() === "GET" && invalidPrivateRead ? route.fulfill({ status: 200, json: { data: {} } }) : route.continue());
  await drawer(page).getByRole("button", { name: "Comparar referência atual", exact: true }).click();
  await expect(drawer(page).getByRole("button", { name: "Revalidar acesso ao rascunho", exact: true })).toBeEnabled();
  await expect(drawer(page).getByRole("textbox")).toHaveCount(0);
  await expect(drawer(page).getByText(local, { exact: true })).toHaveCount(0);
  await expect(drawer(page).getByRole("button", { name: "Revalidar acesso ao rascunho", exact: true })).toBeFocused();
  invalidPrivateRead = false;
  await drawer(page).getByRole("button", { name: "Revalidar acesso ao rascunho", exact: true }).click();
  await expect(reasonField(page, "cancel")).toHaveValue(local);
  await expect(reasonField(page, "cancel")).toBeFocused();
  await expect(drawer(page).getByRole("button", { name: "Continuar rascunho", exact: true })).toHaveCount(0);
  const concurrent = await rpc(f.client, "supply_draft_command", { p_patient: f.patient, p_kind: "REQ", p_purpose: "cancel", p_target: f.req.id, p_id: saved.id, p_expected: saved.revision, p_key: randomUUID(), p_body: { action: "save", navigation: original.navigation, content: { ...original.content, fields: { ...original.content.fields, reason: "Cópia concorrente de outra sessão" } } } });
  await drawer(page).getByRole("button", { name: "Comparar referência atual", exact: true }).click();
  await expect(drawer(page).getByRole("button", { name: "Manter minha edição para salvar nova revisão", exact: true })).toBeEnabled();
  await expect(reasonField(page, "cancel")).toHaveValue(local);
  await expect(drawer(page).getByText("Cópia concorrente de outra sessão", { exact: true })).toBeVisible();
  await drawer(page).getByRole("button", { name: "Manter minha edição para salvar nova revisão", exact: true }).click();
  await expect(reasonField(page, "cancel")).toHaveValue(local);
  const nextSave = page.waitForResponse(reply => new URL(reply.url()).pathname === "/api/drafts" && reply.request().method() === "POST");
  await drawer(page).getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  expect((await (await nextSave).json()).data.revision).toBe(concurrent.revision + 1);
  expect(reqDecisionFacts(f)).toBe(before);
});
