import {
  expect,
  test,
  type Page,
  type Browser,
  type TestInfo,
} from "@playwright/test";
import {
  regularizationFixture,
  regularizationFacts,
  privateReason,
} from "../integration/regularization-draft-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { randomUUID } from "node:crypto";
test.setTimeout(180000);
async function login(page: Page, patient: string, role: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
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
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: /regularização|apuração própria/i });
const name = (role: string) =>
  sql(
    `select full_name from public.profiles where id=${q(fixtures[role].id)};`,
  );
async function choose(page: Page, label: string, role: string) {
  const field = dialog(page).getByRole("combobox", {
    name: label,
    exact: true,
  });
  await field.click();
  await field.fill(name(role));
  await field.press("ArrowDown");
  await page.getByRole("option", { name: name(role), exact: true }).click();
}
async function open(page: Page, id: string, action: string) {
  await page.goto("/fichas/" + id);
  await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: action, exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await dialog(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
}
async function resume(page: Page) {
  await dialog(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
}
async function recovery(page: Page, title: string) {
  await page
    .getByText("Meus preenchimentos de regularização", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Consultar preenchimento: " + title,
      exact: true,
    })
    .click();
}
test("ENT proposta privada retoma entre sessões,conserva seleção indisponível e adota versão autorizada após403 e200 inválido", async ({
  page,
  browser,
}, info) => {
  const f = await regularizationFixture(),
    typedReason = "\uFEFF\n" + privateReason + "\u00A0";
  await login(page, f.patient, "adminA");
  await open(page, f.document.id, "Preparar regularização");
  await dialog(page)
    .getByLabel("Sua justificativa", { exact: true })
    .fill(typedReason);
  await dialog(page)
    .getByLabel("Evidências e limites da apuração", { exact: true })
    .fill("Evidências próprias mantidas entre aparelhos");
  const label = f.document.lines[0].name_snapshot;
  await dialog(page)
    .getByLabel("Recebimento físico apurado · " + label, { exact: true })
    .fill("0,");
  await dialog(page)
    .getByLabel("Devolução física apurada · " + label, { exact: true })
    .fill("");
  await dialog(page)
    .getByLabel("Falta apurada · " + label, { exact: true })
    .fill("0");
  await choose(page, "Conferente independente", "family");
  await choose(page, "Responsável pela apuração futura", "adminA");
  const before = regularizationFacts(f);
  await save(page);
  expect(regularizationFacts(f)).toBe(before);
  await rpc(f.admin, "supply_document_command", {
    p_id: f.document.id,
    p_action: "cancel",
    p_body: {
      reason:
        "Pedido de outra sessão altera a referência sem presumir devolução",
    },
    p_key: randomUUID(),
    p_version: f.document.version,
  });
  const currentFacts = regularizationFacts(f),
    other = await peerContext(browser, page, info),
    peer = await other.newPage();
  try {
    await login(peer, f.patient, "adminA");
    await open(peer, f.document.id, "Preparar regularização");
    await resume(peer);
    await expect(
      dialog(peer).getByLabel("Sua justificativa", { exact: true }),
    ).toHaveValue(typedReason);
    await expect(
      dialog(peer).getByLabel("Recebimento físico apurado · " + label, {
        exact: true,
      }),
    ).toHaveValue("0,");
    await expect(
      dialog(peer).getByRole("button", {
        name: "Revisar ato administrativo",
        exact: true,
      }),
    ).toBeDisabled();
    let fault: "live" | "forbidden" | "invalid" = "forbidden";
    await peer.route(
      `**/api/documents/${f.document.id}?reference=regularization`,
      (route) =>
        fault === "live"
          ? route.continue()
          : route.fulfill({
              status: fault === "forbidden" ? 403 : 200,
              json:
                fault === "forbidden"
                  ? {
                      error: "Regularização recusada fictícia",
                      code: "FORBIDDEN",
                    }
                  : { data: { id: f.document.id } },
            }),
    );
    for (const mode of ["forbidden", "invalid"] as const) {
      fault = mode;
      await dialog(peer)
        .getByRole("button", {
          name: "Consultar ficha e elegibilidade atuais",
          exact: true,
        })
        .click();
      await expect(
        dialog(peer)
          .getByRole("alert")
          .filter({
            hasText:
              mode === "forbidden"
                ? "Regularização recusada fictícia"
                : "não pôde ser conferida",
          }),
      ).toBeVisible();
      await expect(
        dialog(peer).getByRole("button", {
          name: "Usar referência atual",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        dialog(peer).getByText("Aceite pessoal preservado:", { exact: false }),
      ).toHaveCount(0);
      if (mode === "forbidden") await resume(peer);
    }
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'ent.regularize',false);`,
    );
    fault = "live";
    await dialog(peer)
      .getByRole("button", {
        name: "Consultar ficha e elegibilidade atuais",
        exact: true,
      })
      .click();
    await dialog(peer)
      .getByRole("button", { name: "Usar referência atual", exact: true })
      .click();
    await expect(
      dialog(peer).getByText("Seleção preservada:", { exact: false }),
    ).toContainText(name("family"));
    await expect(
      dialog(peer).getByLabel("Recebimento físico apurado · " + label, {
        exact: true,
      }),
    ).toHaveValue("0,");
    await expect(
      dialog(peer).getByLabel("Sua justificativa", { exact: true }),
    ).toHaveValue(typedReason);
    expect(regularizationFacts(f)).toBe(currentFacts);
    for (const width of [320, 390, 768, 1440]) {
      await peer.setViewportSize({ width, height: 900 });
      await dialog(peer).evaluate((element) => (element.scrollTop = 0));
      await audit(peer, "regularization private reference " + width);
    }
    await info.attach("regularizacao-preenchimento", {
      body: await peer.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    sql(
      `delete from public.capability_overrides where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.family.id)} and capability='ent.regularize';`,
    );
    await dialog(peer)
      .getByRole("button", {
        name: "Consultar ficha e elegibilidade atuais",
        exact: true,
      })
      .click();
    await dialog(peer)
      .getByRole("button", { name: "Usar referência atual", exact: true })
      .click();
    await dialog(peer)
      .getByLabel("Recebimento físico apurado · " + label, { exact: true })
      .fill("0");
    await dialog(peer)
      .getByLabel("Devolução física apurada · " + label, { exact: true })
      .fill("0");
    await dialog(peer)
      .getByRole("button", { name: "Revisar ato administrativo", exact: true })
      .click();
    await expect(
      dialog(peer).getByRole("region", {
        name: "Revisão do ato administrativo",
        exact: true,
      }),
    ).toBeVisible();
    await dialog(peer)
      .getByRole("button", {
        name: "Registrar proposta sem movimentar",
        exact: true,
      })
      .click();
    await expect(dialog(peer)).toHaveCount(0);
    expect(
      sql(
        `select count(*) from public.delivery_regularizations where document_id=${q(f.document.id)};`,
      ),
    ).toBe("1");
    const appliedFacts = regularizationFacts(f);
    let writes = 0;
    peer.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/documents/" + f.document.id &&
        request.method() === "POST"
      )
        writes++;
    });
    await recovery(peer, "Preparar regularização administrativa");
    await expect(
      dialog(peer).getByRole("button", {
        name: "Revisar ato administrativo",
        exact: true,
      }),
    ).toHaveCount(0);
    await dialog(peer)
      .getByRole("button", {
        name: "Reconhecer resultado aplicado",
        exact: true,
      })
      .click();
    expect(regularizationFacts(f)).toBe(appliedFacts);
    expect(writes).toBe(0);
  } catch (error) {
    await info.attach("regularization-peer-failure", {
      body: await dialog(peer).ariaSnapshot(),
      contentType: "text/plain",
    });
    await info.attach("regularization-peer-failure-viewport", {
      body: await peer.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    throw error;
  } finally {
    await other.close();
    sql(
      `delete from public.capability_overrides where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.family.id)} and capability='ent.regularize';`,
    );
  }
});

for (const scenario of [
  {
    purpose: "approve_regularization",
    action: "Conferir proposta",
    title: "Conferir regularização administrativa",
    confirm: "Aprovar encerramento administrativo",
    state: "approved",
  },
  {
    purpose: "reject_regularization",
    action: "Rejeitar proposta",
    title: "Rejeitar regularização administrativa",
    confirm: "Registrar decisão sem movimentar",
    state: "rejected",
  },
  {
    purpose: "withdraw_regularization",
    action: "Retirar minha proposta",
    title: "Encerrar proposta de regularização",
    confirm: "Registrar decisão sem movimentar",
    state: "withdrawn",
  },
  {
    purpose: "record_regularization_finding",
    action: "Registrar apuração própria",
    title: "Registrar apuração própria",
    confirm: "Registrar minha apuração",
    state: "approved",
  },
])
  test(`ENT ${scenario.purpose} retoma sua justificativa e recupera o resultado perdido após reload sem repetir ato`, async ({
    page,
  }) => {
    const f = await regularizationFixture(scenario.purpose);
    await login(page, f.patient, f.role);
    await open(page, f.document.id, scenario.action);
    const fieldLabel =
      scenario.purpose === "record_regularization_finding"
        ? "Relato da sua apuração"
        : "Sua justificativa";
    await dialog(page)
      .getByLabel(fieldLabel, { exact: true })
      .fill(privateReason);
    const before = regularizationFacts(f);
    await save(page);
    expect(regularizationFacts(f)).toBe(before);
    await page.reload();
    await selectDocumentSection(page, "workflow");
    await page
      .getByRole("button", { name: scenario.action, exact: true })
      .click();
    await resume(page);
    await expect(
      dialog(page).getByLabel(fieldLabel, { exact: true }),
    ).toHaveValue(privateReason);
    await dialog(page)
      .getByRole("button", { name: "Revisar ato administrativo", exact: true })
      .click();
    let delivered!: () => void;
    const committed = new Promise<void>((resolve) => (delivered = resolve));
    await page.route(`**/api/documents/${f.document.id}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      delivered();
      await route.abort("failed");
    });
    await dialog(page)
      .getByRole("button", { name: scenario.confirm, exact: true })
      .click();
    await committed;
    await expect(
      dialog(page).getByRole("button", {
        name: "Recuperar mesmo ato",
        exact: true,
      }),
    ).toBeVisible();
    await page.unroute(`**/api/documents/${f.document.id}`);
    await page.reload();
    await selectDocumentSection(page, "workflow");
    let writes = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/documents/" + f.document.id &&
        request.method() === "POST"
      )
        writes++;
    });
    await recovery(page, scenario.title);
    await expect(
      dialog(page).getByRole("button", {
        name: "Revisar ato administrativo",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      dialog(page).getByRole("button", {
        name: "Reconhecer resultado aplicado",
        exact: true,
      }),
    ).toBeVisible();
    const applied = regularizationFacts(f);
    await dialog(page)
      .getByRole("button", {
        name: "Reconhecer resultado aplicado",
        exact: true,
      })
      .click();
    expect(regularizationFacts(f)).toBe(applied);
    expect(writes).toBe(0);
    expect(
      sql(
        `select state from public.delivery_regularizations where id=${q(f.document.deliveryRegularization.currentId)};`,
      ),
    ).toBe(scenario.state);
    if (scenario.purpose === "record_regularization_finding")
      expect(
        sql(
          `select count(*) from public.delivery_regularization_findings where regularization_id=${q(f.document.deliveryRegularization.currentId)} and body=${q(privateReason)};`,
        ),
      ).toBe("1");
  });
