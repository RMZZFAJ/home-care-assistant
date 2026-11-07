import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import {
  privateDraftFixture,
  reqContent,
  balContent,
  savePacket,
  draftContext,
  officialState,
  officialWithReadyFile,
  rpc,
  fixtures,
} from "../integration/private-draft-fixtures.mjs";
import {
  pendingRecount,
  assignRecount,
  substitute,
} from "../integration/bal-recount-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const save = (page: Page) =>
  page.getByRole("button", { name: "Salvar rascunho", exact: true });
const next = (page: Page) =>
  page.getByRole("button", { name: /^Avançar$|^Revisar$/ }).click();
async function login(
  page: Page,
  patient: string,
  email = fixtures.professional.email,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, kind: "REQ" | "BAL", url?: string) {
  await page.goto(url ?? (kind === "REQ" ? "/fichas/req" : "/fichas/bal"));
  await expect(panel(page)).toBeVisible();
  await expect(
    panel(page).getByText("Consultando seu rascunho no servidor…", {
      exact: true,
    }),
  ).toHaveCount(0);
}
async function resume(page: Page) {
  await panel(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(save(page)).toBeEnabled();
}
async function observations(page: Page) {
  for (let i = 0; i < 5; i++) await next(page);
}

test("D3 consulta falha pede nova leitura e JSON inválido após save confirmado recupera a mesma intenção", async ({ page }, info) => {
  const f = await privateDraftFixture(), content = reqContent(f);
  await rpc(f.pro, "creation_draft_command", savePacket(f, "REQ", content));
  const before = officialState(f);
  await login(page, f.patient);
  let failRead = true;
  await page.route("**/api/drafts?**", async (route) => {
    if (failRead) { failRead = false; await route.abort("failed"); }
    else await route.continue();
  });
  await open(page, "REQ");
  await expect(panel(page)).toContainText("Não foi possível consultar esta seção.");
  await expect(panel(page)).not.toContainText("Recupere a mesma tentativa");
  await expect(panel(page).getByRole("button", { name: "Recuperar salvamento ou descarte", exact: true })).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Consultar novamente", exact: true }).click();
  await expect(panel(page)).toContainText("Revisão 1");
  await resume(page); await observations(page);
  const observation = page.getByLabel("Observação 1", { exact: true });
  await observation.fill("Edição mantida após resposta inválida, sem outra emissão");
  const packets: unknown[] = [];
  await page.route("**/api/drafts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (packets.length === 1) {
      const persisted = await route.fetch(); expect(persisted.ok(), await persisted.text()).toBe(true);
      // A proxy status with an undecodable body is not proof of rejection.
      await route.fulfill({ status: 400, contentType: "application/json", body: "{invalid" });
    } else await route.continue();
  });
  await save(page).click();
  await expect(panel(page)).toContainText("A resposta desta ação não pôde ser confirmada.");
  await expect(save(page)).toBeDisabled();
  await expect(observation).toHaveValue("Edição mantida após resposta inválida, sem outra emissão");
  expect((await draftContext(f, "REQ")).revision).toBe(2);
  await panel(page).getByRole("button", { name: "Recuperar salvamento ou descarte", exact: true }).click();
  await expect(panel(page)).toContainText("Revisão 2");
  expect(packets).toHaveLength(2); expect(packets[0]).toEqual(packets[1]);
  const recovered = await draftContext(f, "REQ");
  expect(recovered.revision).toBe(2);
  expect(recovered.content.observations).toEqual(["Edição mantida após resposta inválida, sem outra emissão"]);
  expect(officialState(f)).toBe(before);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, `d3-request-recovery-${width}`); }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `output/playwright/phase-d/d3-request-recovery-${info.project.name}.png`, fullPage: true });
});

test("D3 404 público é português, acessível e conserva respostas de autorização próprias", async ({ page }, info) => {
  const response = await page.goto("/endereco-publico-inexistente-d3");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page).toHaveTitle("Página não encontrada | Home Care Assistant");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Página não encontrada", level: 1, exact: true })).toBeVisible();
  const enter = page.getByRole("link", { name: "Entrar na minha conta", exact: true });
  await expect(enter).toHaveAttribute("href", "/login");
  await enter.focus(); await expect(enter).toBeFocused();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, `d3-public-404-${width}`, "Página não encontrada | Home Care Assistant"); }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: `output/playwright/phase-d/d3-public-404-${info.project.name}.png`, fullPage: true });
  const unauthorized = await page.request.get("/api/context");
  expect(unauthorized.status()).toBe(401); expect((await unauthorized.json()).code).toBe("SESSION_EXPIRED");
  await enter.click(); await expect(page).toHaveURL(/\/login$/);
});

test("D3 403 autenticado permanece próprio após navegar pelo 404 público", async ({ page }) => {
  const f = await privateDraftFixture();
  const before = sql(`select display_name from public.care_recipients where id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient);
  const response = await page.goto("/outro-endereco-inexistente-d3");
  expect(response?.status()).toBe(404);
  const denied = await page.request.post("/api/admin", { data: { action: "recipient", id: f.patient, displayName: "Tentativa fictícia não autorizada", isActive: true, isDevelopment: true } });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).code).toBe("FORBIDDEN");
  expect(sql(`select display_name from public.care_recipients where id=${sqlLiteral(f.patient)};`)).toBe(before);
});

test("REQ em dois aparelhos compara revisões5 e6, mantém o texto de B e salva7 sem renovar a data observada", async ({
  page,
  browser,
}, info) => {
  const f = await privateDraftFixture(),
    content = reqContent(f);
  let saved = null;
  for (let i = 0; i < 5; i++)
    saved = await rpc(
      f.pro,
      "creation_draft_command",
      savePacket(f, "REQ", content, saved?.id ?? null, saved?.revision ?? null),
    );
  const before = officialState(f),
    device = await browser.newContext({
      baseURL: new URL(test.info().project.use.baseURL!).origin,
    });
  try {
    const second = await device.newPage();
    await login(page, f.patient);
    await login(second, f.patient);
    for (const editor of [page, second]) {
      await open(editor, "REQ");
      await expect(panel(editor)).toContainText("Revisão 5");
      await expect(panel(editor)).toContainText("05/11/2026");
      await resume(editor);
      await observations(editor);
    }
    await page
      .getByLabel("Observação 1", { exact: true })
      .fill("Texto de A salvo na revisão seis");
    await save(page).click();
    await expect(panel(page)).toContainText("Revisão 6");
    await second
      .getByLabel("Observação 1", { exact: true })
      .fill("Texto próprio de B que precisa sobreviver ao conflito");
    let failComparison = true;
    await second.route("**/api/drafts?**", async (route) => {
      if (failComparison) {
        failComparison = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Consulta temporariamente indisponível",
          }),
        });
      } else await route.continue();
    });
    await save(second).click();
    await expect(
      panel(second).getByRole("region", { name: "Minha edição", exact: true }),
    ).toContainText("Texto próprio de B");
    const keep = panel(second).getByRole("button", {
      name: "Manter minha edição para salvar nova revisão",
      exact: true,
    });
    await expect(keep).toBeDisabled();
    await panel(second)
      .getByRole("button", {
        name: "Consultar versão para comparar",
        exact: true,
      })
      .click();
    const theirs = panel(second).getByRole("region", {
      name: "Versão salva no servidor",
      exact: true,
    });
    await expect(theirs).toContainText("Revisão 6");
    await expect(theirs).toContainText("Texto de A");
    await expect(theirs.getByRole("textbox")).toHaveCount(0);
    for (const width of [320, 390, 768, 1440]) {
      await second.setViewportSize({ width, height: 900 });
      await audit(second, `private-req-conflict-${width}`);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await second.setViewportSize({ width: 320, height: 900 });
    await second.screenshot({
      path: `output/playwright/phase-d/private-req-conflict-${info.project.name}.png`,
      fullPage: true,
    });
    await keep.click();
    await expect(
      second.getByLabel("Observação 1", { exact: true }),
    ).toHaveValue("Texto próprio de B que precisa sobreviver ao conflito");
    await save(second).click();
    await expect(panel(second)).toContainText("Revisão 7");
    const current = await draftContext(f);
    expect(current.content.observations).toEqual([
      "Texto próprio de B que precisa sobreviver ao conflito",
    ]);
    expect(current.content.lines[0].stockObservationAt).toBe(
      content.lines[0].stockObservationAt,
    );
    expect(officialState(f)).toBe(before);
  } finally {
    await device.close();
  }
});

test("BAL parcial recupera o mesmo save após resposta perdida; REQ fica separada e descarte preserva ficha e arquivo ready", async ({
  page,
  browser,
}, info) => {
  const f = await privateDraftFixture(),
    ready = await officialWithReadyFile(f);
  await rpc(f.pro, "creation_draft_command", savePacket(f));
  const balance = balContent(f);
  balance.context.referenceRevision = (
    await rpc(f.pro, "balance_count_reference", { p_patient: f.patient })
  ).revision;
  balance.counts[f.products[0]] = "1,";
  balance.observationTimes[f.products[0]] = "2026-11-05T09:00:00-03:00";
  await rpc(f.pro, "creation_draft_command", savePacket(f, "BAL", balance));
  const before = officialState(f);
  await login(page, f.patient);
  await open(page, "BAL");
  await expect(panel(page)).toContainText("Contagem privada ainda incompleta");
  await expect(panel(page)).not.toContainText("Preenchimento privado de ontem");
  await resume(page);
  await next(page);
  await next(page);
  const count = page.getByLabel("Quantidade — Material fictício V4 0", {
    exact: true,
  });
  await expect(count).toHaveValue("1,");
  const packets: unknown[] = [];
  let lostDiscard = false;
  await page.route("**/api/drafts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    const discarding =
      route.request().postDataJSON().action === "discard" && !lostDiscard;
    if (packets.length === 1 || discarding) {
      if (discarding) lostDiscard = true;
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await save(page).click();
  await expect(
    panel(page).getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(save(page)).toBeDisabled();
  await page.reload();
  await panel(page)
    .getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText("Revisão 2");
  expect(packets).toHaveLength(2);
  expect(packets[0]).toEqual(packets[1]);
  const saved = await draftContext(f, "BAL");
  expect(saved.content.counts[f.products[0]]).toBe("1,");
  expect(saved.content.observationTimes).toEqual(balance.observationTimes);
  expect(officialState(f)).toBe(before);
  await open(page, "REQ");
  await expect(panel(page)).toContainText("Preenchimento privado de ontem");
  await panel(page)
    .getByRole("button", { name: "Descartar e começar nova", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Descartar rascunho privado",
    exact: true,
  });
  await expect(drawer.getByRole("textbox")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `private-discard-${width}`);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({
    path: `output/playwright/phase-d/private-discard-${info.project.name}.png`,
    fullPage: true,
  });
  await drawer
    .getByRole("button", {
      name: "Confirmar descarte do rascunho",
      exact: true,
    })
    .click();
  await expect(
    drawer.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  await drawer
    .getByRole("button", { name: "Recuperar descarte", exact: true })
    .click();
  await expect(drawer).toHaveCount(0);
  expect(packets).toHaveLength(4);
  expect(packets[2]).toEqual(packets[3]);
  await expect(save(page)).toBeEnabled();
  expect(await draftContext(f)).toBeNull();
  expect((await draftContext(f, "BAL")).id).toBe(saved.id);
  expect(officialState(f)).toBe(before);
  const file = await f.pro.storage
    .from("patient-evidence")
    .download(ready.path);
  expect(file.error).toBeNull();
  if (!file.data)
    throw new Error("The preserved ready object must remain readable");
  expect(
    createHash("sha256")
      .update(Buffer.from(await file.data.arrayBuffer()))
      .digest("hex"),
  ).toBe(ready.sha256);
  const other = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const admin = await other.newPage();
    await login(admin, f.patient, fixtures.adminA.email);
    const privateRead = await admin.request.get(
      `/api/drafts?careRecipientId=${f.patient}&kind=BAL`,
    );
    expect(privateRead.ok()).toBe(true);
    expect((await privateRead.json()).data).toBeNull();
  } finally {
    await other.close();
  }
  await open(page, "BAL");
  await resume(page);
  await next(page);
  await next(page);
  await page
    .getByLabel("Quantidade — Material fictício V4 0", { exact: true })
    .fill("1");
  await page
    .getByLabel("Quantidade — Material fictício V4 1", { exact: true })
    .fill("0");
  for (let i = 0; i < 3; i++) await next(page);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `private-legacy-bal-review-${width}`);
  }
  const confirmation = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/documents",
  );
  await page
    .getByRole("button", { name: "Confirmar e concluir", exact: true })
    .click();
  const emitted = await confirmation;
  expect(emitted.ok(), await emitted.text()).toBe(true);
  const official = (await emitted.json()).data;
  await expect(
    page.getByText("Documento persistido", { exact: true }),
  ).toBeVisible();
  const consumed = await draftContext(f, "BAL");
  expect(consumed.state).toBe("consumed");
  expect(consumed.consumedDocumentId).toBe(official.id);
});

test("reconto BAL privado retoma em outro aparelho e confirma uma única versão nativa após perda de resposta e de escrita", async ({
  page,
  browser,
}, info) => {
  const f = await pendingRecount(),
    target = f.initial.targets.find(
      (row: { id: string }) => row.id === f.assignment.shift_id,
    );
  const designated = await assignRecount(f.family, f, target);
  expect(designated.error).toBeNull();
  const counter = await substitute(f),
    url = `/fichas/bal?documentId=${f.document.id}&recount=true`;
  const before = sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
  await login(page, f.patient, counter.email);
  await open(page, "BAL", url);
  await expect(save(page)).toBeEnabled();
  await page
    .getByLabel("Material fictício V4 0 · unidade", { exact: true })
    .fill("1,");
  await page
    .getByLabel("Observações da contagem", { exact: true })
    .fill("Reconto parcial privado da substituta");
  await save(page).click();
  await expect(panel(page)).toContainText("Revisão 1");
  expect(
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
    ),
  ).toBe(before);
  const own = await rpc(counter.client, "creation_draft_context", {
    p_patient: f.patient,
    p_kind: "BAL",
    p_target: f.document.id,
  });
  const device = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const second = await device.newPage();
    await login(second, f.patient, counter.email);
    await open(second, "BAL", url);
    await expect(panel(second)).toContainText(
      "Reconto parcial privado da substituta",
    );
    await resume(second);
    await expect(
      second.getByLabel("Material fictício V4 0 · unidade", { exact: true }),
    ).toHaveValue("1,");
    const unchanged = await rpc(counter.client, "creation_draft_context", {
      p_patient: f.patient,
      p_kind: "BAL",
      p_target: f.document.id,
    });
    expect(unchanged.content.observationTimes).toEqual(
      own.content.observationTimes,
    );
    for (const [i] of f.products.entries())
      await second
        .getByLabel(`Material fictício V4 ${i} · unidade`, { exact: true })
        .fill(i ? "0" : "1");
    await second.getByRole("button", { name: "Revisar", exact: true }).click();
    await expect(second.getByRole("textbox")).toHaveCount(0);
    await expect(
      second.getByRole("region", {
        name: "Datas das observações recuperadas",
        exact: true,
      }),
    ).toContainText("Material fictício V4 0");
    for (const width of [320, 390, 768, 1440]) {
      await second.setViewportSize({ width, height: 900 });
      await audit(second, `private-recount-review-${width}`);
    }
    await second.setViewportSize({ width: 320, height: 900 });
    await second.screenshot({
      path: `output/playwright/phase-d/private-recount-review-${info.project.name}.png`,
      fullPage: true,
    });
    const attempts: unknown[] = [];
    await second.route(
      `**/api/documents/${f.document.id}/revise`,
      async (route) => {
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) {
          const result = await route.fetch();
          expect(result.ok(), await result.text()).toBe(true);
          sql(
            `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(counter.id)},'bal.count',false);`,
          );
          await route.abort("failed");
        } else await route.continue();
      },
    );
    await second
      .getByRole("button", { name: "Confirmar reconto", exact: true })
      .click();
    await second
      .getByRole("button", { name: "Recuperar esta tentativa", exact: true })
      .click();
    await expect(
      second.getByRole("link", { name: "Abrir ficha BAL", exact: true }),
    ).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
    const document = (
      await (await second.request.get("/api/documents/" + f.document.id)).json()
    ).data;
    expect(document.created_by).toBe(f.pro.id);
    expect(document.balanceReview.counter.id).toBe(counter.id);
    expect(document.balanceReview.countVersion).toBe(2);
    const consumed = await rpc(counter.client, "creation_draft_context", {
      p_patient: f.patient,
      p_kind: "BAL",
      p_target: f.document.id,
    });
    expect(consumed.state).toBe("consumed");
    expect(consumed.consumedDocumentId).toBe(f.document.id);
  } finally {
    await device.close();
  }
});

test("abertura BAL antiga com resposta desconhecida recupera a mesma ficha antes de salvar o preenchimento privado", async ({
  page,
}) => {
  const f = await privateDraftFixture(),
    key = crypto.randomUUID();
  const payload = {
    lines: f.products.map((productId: string) => ({
      productId,
      quantity: "0",
    })),
    notes: "",
  };
  const old = await rpc(f.pro, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_payload: payload,
    p_key: key,
    p_draft: true,
  });
  const before = officialState(f);
  await login(page, f.patient);
  await open(page, "BAL");
  const storageKey = `hca:v2:draft:BAL:${fixtures.professional.id}:${f.patient}:new:standalone:edit`;
  await page.evaluate(
    ({ storageKey, key, ids }) => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form: {
            quantities: Object.fromEntries(ids.map((id: string) => [id, ""])),
            notes: "",
            origin: "",
            source: "FAMILY",
            recipientId: "",
          },
        }),
      );
      sessionStorage.setItem(storageKey + ":start", key);
    },
    { storageKey, key, ids: f.products },
  );
  await page.reload();
  await expect(save(page)).toBeEnabled();
  const recovered = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/documents",
  );
  await next(page);
  const result = await recovered;
  expect(result.ok(), await result.text()).toBe(true);
  expect((await result.json()).data.id).toBe(old.id);
  expect(officialState(f)).toBe(before);
  await next(page);
  await page
    .getByLabel("Quantidade — Material fictício V4 0", { exact: true })
    .fill("1,");
  await save(page).click();
  await expect(panel(page)).toContainText("Revisão 1");
  const draft = await rpc(f.pro, "creation_draft_context", {
    p_patient: f.patient,
    p_kind: "BAL",
    p_target: old.id,
  });
  expect(draft.targetDocumentId).toBe(old.id);
  expect(draft.content.counts[f.products[0]]).toBe("1,");
  expect(officialState(f)).toBe(before);
});
