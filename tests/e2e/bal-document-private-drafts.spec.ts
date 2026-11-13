import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import {
  balDocumentFixture,
  balDocumentFacts,
  saveBalDocument,
} from "../integration/bal-document-draft-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { balanceDocumentLabels } from "../../src/lib/forms/balance-document-draft";
import type { BalanceDocumentPurpose } from "../../src/lib/validation/supply-drafts";

test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof balDocumentFixture>>;
function recordNetwork(page: Page, events: Array<Record<string, unknown>>) {
  const started = new Map<
    object,
    { time: number; row: Record<string, unknown> }
  >();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return;
    const row = {
      method: request.method(),
      path: path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id"),
      status: "pending",
      elapsedMs: 0,
    };
    events.push(row);
    started.set(request, { time: Date.now(), row });
  });
  page.on("response", (response) => {
    const entry = started.get(response.request());
    if (entry) {
      entry.row.status = response.status();
      entry.row.elapsedMs = Date.now() - entry.time;
    }
  });
  page.on("requestfailed", (request) => {
    const entry = started.get(request);
    if (entry) {
      entry.row.status = "failed";
      entry.row.elapsedMs = Date.now() - entry.time;
    }
  });
}
const dialog = (page: Page) => page.getByRole("dialog");
const action = (page: Page, name: string) =>
  dialog(page).getByRole("button", { name, exact: true });
const text = (page: Page, purpose: BalanceDocumentPurpose) =>
  dialog(page).getByRole("textbox", {
    name:
      purpose === "assign_recount"
        ? /^Sua justificativa para o reconto/
        : /^Sua revisão sobre a contagem/,
  });
async function login(page: Page, f: Fixture) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.identity.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
}
async function open(
  page: Page,
  f: Fixture,
  purpose: BalanceDocumentPurpose,
  existing = false,
) {
  if (purpose === "assign_recount")
    await page.goto(
      "/balancos?" +
        new URLSearchParams({
          careRecipientId: f.patient,
          recountDocumentId: f.document.id,
        }),
    );
  else {
    await page.goto("/fichas/" + f.document.id);
    await selectDocumentSection(page, "workflow");
    await page
      .getByRole("button", {
        name: balanceDocumentLabels[purpose],
        exact: true,
      })
      .click();
  }
  await expect(
    action(
      page,
      existing ? "Continuar rascunho" : "Salvar preenchimento privado",
    ),
  ).toBeEnabled();
}
async function save(page: Page) {
  const reply = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await action(page, "Salvar preenchimento privado").click();
  expect((await reply).status()).toBe(200);
  await expect(action(page, "Salvar preenchimento privado")).toBeEnabled();
}
for (const purpose of [
  "review_family",
  "review_supervisor",
  "assign_recount",
] as const)
  test(`BAL ${purpose} retoma entre sessões,compara conflito e referências recusadas,e recupera confirmação exata após perda de escrita`, async ({
    page,
    browser,
  }, info) => {
    const f = await balDocumentFixture(purpose);
    const network: Array<Record<string, unknown>> = [];
    recordNetwork(page, network);
    await login(page, f);
    await open(page, f, purpose);
    const raw = "\n Minha edição própria ainda incompleta 🧭 \u00A0";
    await text(page, purpose).fill(raw);
    if (purpose === "review_family") {
      const unchanged = balDocumentFacts(f),
        privatePackets: unknown[] = [];
      const privateRoute = async (route: import("@playwright/test").Route) => {
        privatePackets.push(route.request().postDataJSON());
        if (privatePackets.length === 1) {
          const reply = await route.fetch();
          expect(reply.ok(), await reply.text()).toBe(true);
          return route.abort("failed");
        }
        return route.continue();
      };
      await page.route("**/api/drafts", privateRoute);
      await action(page, "Salvar preenchimento privado").click();
      await expect(
        action(page, "Recuperar salvamento ou descarte"),
      ).toBeEnabled();
      await expect(text(page, purpose)).toBeDisabled();
      expect(balDocumentFacts(f)).toBe(unchanged);
      await action(page, "Recuperar salvamento ou descarte").click();
      await expect(text(page, purpose)).toBeEnabled();
      expect(privatePackets).toHaveLength(2);
      expect(privatePackets[1]).toEqual(privatePackets[0]);
      await page.unroute("**/api/drafts", privateRoute);
      await expect(text(page, purpose)).toHaveValue(raw);
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toHaveCount(0);
      expect(balDocumentFacts(f)).toBe(unchanged);
      await open(page, f, purpose, true);
      await action(page, "Continuar rascunho").click();
      await expect(text(page, purpose)).toHaveValue(raw);
    } else await save(page);
    const before = balDocumentFacts(f);
    const use = info.project.use,
      peer = await browser.newContext({
        baseURL: new URL(page.url()).origin,
        viewport: use.viewport,
        isMobile: use.isMobile,
        hasTouch: use.hasTouch,
        deviceScaleFactor: use.deviceScaleFactor,
        userAgent: use.userAgent,
      });
    try {
      const second = await peer.newPage();
      recordNetwork(second, network);
      await login(second, f);
      await open(second, f, purpose, true);
      await action(second, "Continuar rascunho").click();
      await expect(text(second, purpose)).toHaveValue(raw);
      await text(page, purpose).fill(
        "Cópia concorrente salva na primeira sessão",
      );
      await save(page);
      const own = "Meu texto permanece durante o conflito e a comparação 🩺";
      await text(second, purpose).fill(own);
      const conflict = second.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/drafts" &&
          r.request().method() === "POST",
      );
      await action(second, "Salvar preenchimento privado").click();
      expect((await conflict).status()).toBe(409);
      await expect(
        action(second, "Manter minha edição para salvar nova revisão"),
      ).toBeEnabled();
      await expect(text(second, purpose)).toHaveValue(own);
      await action(
        second,
        "Manter minha edição para salvar nova revisão",
      ).click();
      await save(second);
      expect(balDocumentFacts(f)).toBe(before);
      const compare =
          purpose === "assign_recount"
            ? "Comparar com a situação atual"
            : "Consultar referência atual",
        adopt =
          purpose === "assign_recount"
            ? "Adotar referência atual"
            : "Adotar referência atual e manter minha revisão",
        review =
          purpose === "assign_recount"
            ? "Revisar designação"
            : "Conferir revisão",
        confirm =
          purpose === "assign_recount"
            ? "Confirmar designação"
            : "Confirmar revisão",
        recover =
          purpose === "assign_recount"
            ? "Recuperar a mesma tentativa"
            : "Recuperar revisão";
      let mode: "denied" | "invalid" | "valid" = "denied";
      await second.route("**/api/balances/document-preparation?**", (route) =>
        mode === "denied"
          ? route.fulfill({
              status: 403,
              json: {
                error: "Referência fictícia recusada",
                code: "FORBIDDEN",
              },
            })
          : mode === "invalid"
            ? route.fulfill({ status: 200, json: { data: {} } })
            : route.continue(),
      );
      await action(second, compare).click();
      await expect(text(second, purpose)).toHaveValue(own);
      await expect(action(second, review)).toBeDisabled();
      await expect(
        dialog(second).getByRole("region", {
          name: "Contagem física consultada",
          exact: true,
        }),
      ).toHaveCount(0);
      mode = "invalid";
      await action(second, compare).click();
      await expect(
        dialog(second).getByText(
          "Não foi possível conferir a referência do balanço. Seu preenchimento foi preservado.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(text(second, purpose)).toHaveValue(own);
      expect(balDocumentFacts(f)).toBe(before);
      mode = "valid";
      await action(second, compare).click();
      await expect(action(second, adopt)).toBeEnabled();
      await expect(action(second, review)).toBeDisabled();
      await action(second, adopt).click();
      await expect(text(second, purpose)).toHaveValue(own);
      if (purpose === "assign_recount") {
        const field = dialog(second).getByRole("combobox", {
          name: /^Plantão para o reconto/,
        });
        await field.fill(f.target.professional_name);
        await field.press("ArrowDown");
        await second
          .getByRole("option")
          .filter({ hasText: f.target.professional_name })
          .click();
      }
      await second.setViewportSize({ width: 320, height: 940 });
      await audit(second, "bal-private-" + purpose);
      await second
        .screenshot({
          path: info.outputPath("bal-private-" + purpose + ".png"),
        })
        .then((body) =>
          info.attach("bal-private-" + purpose, {
            body,
            contentType: "image/png",
          }),
        );
      const packets: unknown[] = [];
      await second.route(
        "**/api/balances/document-preparation",
        async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          packets.push(route.request().postDataJSON());
          if (packets.length === 1) {
            const reply = await route.fetch();
            expect(reply.ok(), await reply.text()).toBe(true);
            const cap =
              purpose === "review_supervisor"
                ? "bal.approve.supervisor"
                : "bal.approve.family";
            sql(
              `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.identity.id)},${q(cap)},false);`,
            );
            return route.abort("failed");
          }
          if (purpose === "assign_recount") {
            const reply = await route.fetch();
            const body = await reply.json();
            // Legacy code is nullable. Preserve every binding and native effect;
            // only emulate that declared display field in the replay response.
            body.data.result.code = null;
            return route.fulfill({ response: reply, json: body });
          }
          return route.continue();
        },
      );
      await action(second, review).click();
      expect(packets).toHaveLength(0);
      await action(second, confirm).click();
      await expect(action(second, recover)).toBeEnabled();
      await expect(action(second, "Fechar edição")).toBeDisabled();
      const applied = balDocumentFacts(f);
      expect(applied).not.toBe(before);
      await action(second, recover).click();
      expect(packets).toHaveLength(2);
      expect(packets[1]).toEqual(packets[0]);
      expect(balDocumentFacts(f)).toBe(applied);
      if (purpose === "assign_recount")
        await expect(
          dialog(second).getByRole("region", {
            name: "Resultado da designação",
            exact: true,
          }),
        ).toContainText("BAL sem código preservado");
      if (purpose === "assign_recount")
        await expect(
          dialog(second).getByRole("region", {
            name: "Resultado da designação",
            exact: true,
          }),
        ).toContainText(f.target.professional_name);
      else await expect(dialog(second)).toHaveCount(0);
      await second.goto("/fichas/" + f.document.id);
      await selectDocumentSection(second, "workflow");
      await second
        .getByText("Minhas decisões em preparação", { exact: true })
        .click();
      let references = 0;
      second.on("request", (request) => {
        if (
          new URL(request.url()).pathname ===
          "/api/balances/document-preparation"
        )
          references++;
      });
      await second
        .getByRole("button", {
          name: "Consultar preparação: " + balanceDocumentLabels[purpose],
          exact: true,
        })
        .click();
      await expect(
        action(second, "Reconhecer resultado aplicado"),
      ).toBeVisible();
      await expect(dialog(second).getByRole("textbox")).toHaveCount(0);
      expect(references).toBe(0);
      await action(second, "Reconhecer resultado aplicado").click();
      await expect(
        dialog(second).getByText(
          "Nenhum preenchimento ou resultado privado pendente para esta decisão neste perfil.",
          { exact: true },
        ),
      ).toBeVisible();
      expect(packets).toHaveLength(2);
      expect(balDocumentFacts(f)).toBe(applied);
    } finally {
      await info.attach("api-timeline", {
        contentType: "application/json",
        body: JSON.stringify(network),
      });
      await peer.close();
    }
  });

test("BAL confirmação exige que a ficha pertença ao paciente selecionado mesmo quando a mesma pessoa tem acesso aos dois", async ({
  page,
}, info) => {
  const selected = await balDocumentFixture("review_family"),
    other = await balDocumentFixture("review_family");
  const saved = await saveBalDocument(other),
    a = balDocumentFacts(selected),
    b = balDocumentFacts(other);
  await login(page, selected);
  const response = await page.request.post(
    "/api/balances/document-preparation",
    {
      headers: { origin: new URL(page.url()).origin },
      data: {
        careRecipientId: selected.patient,
        documentId: other.document.id,
        purpose: "review_family",
        draftCommit: { id: saved.id, revision: saved.revision },
        expectedVersion: other.document.version,
        idempotencyKey: randomUUID(),
        body: other.body,
      },
    },
  );
  const afterA = balDocumentFacts(selected),
    afterB = balDocumentFacts(other);
  await info.attach("selected-patient-boundary", {
    contentType: "application/json",
    body: JSON.stringify({
      status: response.status(),
      selectedUnchanged: a === afterA,
      otherUnchanged: b === afterB,
      beforeOtherSha256: createHash("sha256").update(b).digest("hex"),
      afterOtherSha256: createHash("sha256").update(afterB).digest("hex"),
    }),
  });
  expect(response.status()).toBe(404);
  expect(afterA).toBe(a);
  expect(afterB).toBe(b);
});
