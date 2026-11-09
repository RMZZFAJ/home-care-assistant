import {
  expect,
  test,
  type Page,
  type Browser,
  type TestInfo,
} from "@playwright/test";
import {
  consentFixture,
  addConsentConsumption,
} from "../integration/ent-consent-fixtures.mjs";
import { entFacts, entReason } from "../integration/ent-operation-fixtures.mjs";
import {
  decisionFixture,
  decisionFacts,
} from "../integration/com-decision-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openDocumentMore } from "./document-sections";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
async function session(browser: Browser, page: Page, info: TestInfo) {
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

async function login(
  page: Page,
  patient: string,
  who: "professional" | "adminA" | "family" = "professional",
) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill(fixtures[who].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const reason = (page: Page) =>
  page.getByRole("textbox", { name: "Motivo / justificativa", exact: true });
const returned = (
  page: Page,
  line: { name_snapshot: string; unit_snapshot: string },
) =>
  page.getByRole("textbox", {
    name: `Devolução física real · ${line.name_snapshot} · ${line.unit_snapshot}`,
    exact: true,
  });
const dialog = (page: Page) =>
  page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
async function openConsent(page: Page, id: string) {
  await page.goto(`/documentos/${id}`);
  await page
    .getByRole("button", {
      name: "Consentir e reconciliar cancelamento",
      exact: true,
    })
    .click();
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
}
async function resume(page: Page) {
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
}
async function prepare(page: Page) {
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
}
async function recovery(page: Page, label: string) {
  await openDocumentMore(page);
  await page
    .getByText("Meus preenchimentos nesta ficha", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Consultar preenchimento: ${label}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Rascunho privado", exact: true }),
  ).toBeVisible();
}

test("ENT consentimento retoma em outra sessão, compara fonte alterada sem nova versão e impede403,200 inválido e fonte restrita", async ({
  page,
  browser,
}, info) => {
  const f = await consentFixture();
  await login(page, f.patient);
  await openConsent(page, f.document.id);
  await returned(page, f.document.lines[0]).fill("1,");
  await returned(page, f.document.lines[1]).fill("2");
  await reason(page).fill(entReason);
  const beforeSave = entFacts(f);
  await save(page);
  expect(entFacts(f)).toBe(beforeSave);
  const peerContext = await session(browser, page, info),
    peer = await peerContext.newPage();
  try {
    await login(peer, f.patient);
    await openConsent(peer, f.document.id);
    await resume(peer);
    await expect(returned(peer, f.document.lines[0])).toHaveValue("1,");
    await expect(returned(peer, f.document.lines[1])).toHaveValue("2");
    await expect(reason(peer)).toHaveValue(entReason);
    const current = await addConsentConsumption(f);
    expect(current.version).toBe(f.document.version);
    expect(current.deliveryCancellation.referenceHash).not.toBe(
      f.document.deliveryCancellation.referenceHash,
    );
    await openConsent(peer, f.document.id);
    await resume(peer);
    await expect(
      peer.getByRole("button", { name: "Revisar operação", exact: true }),
    ).toBeDisabled();
    const unchanged = entFacts(f);
    let fault = 403;
    await peer.route(
      `**/api/documents/${f.document.id}?reference=consent`,
      (route) =>
        fault
          ? route.fulfill({
              status: fault,
              contentType: "application/json",
              body: JSON.stringify(
                fault === 200
                  ? { data: {} }
                  : { code: "FORBIDDEN", error: "Fonte fictícia recusada" },
              ),
            })
          : route.continue(),
    );
    await peer
      .getByRole("button", {
        name: "Comparar referência da operação",
        exact: true,
      })
      .click();
    const sources = peer.getByRole("region", {
      name: "Referências autorizadas da conciliação",
      exact: true,
    });
    const adopt = peer.getByRole("button", {
      name: "Usar referência atual e revisar novamente",
      exact: true,
    });
    for (const next of [200, 0]) {
      await expect(sources.getByRole("alert")).toBeVisible();
      await expect(adopt).toBeDisabled();
      await expect(
        sources.getByRole("region", { name: /^Fonte atual de / }),
      ).toHaveCount(0);
      await expect(
        peer.getByText("Consumo já confirmado disponível:", { exact: true }),
      ).toHaveCount(0);
      await expect(returned(peer, f.document.lines[0])).toHaveValue("1,");
      await expect(reason(peer)).toHaveValue(entReason);
      expect(entFacts(f)).toBe(unchanged);
      fault = next;
      await sources
        .getByRole("button", {
          name: "Conferir novamente as fontes da conciliação",
          exact: true,
        })
        .click();
    }
    await expect(
      sources.getByRole("region", { name: /^Fonte atual de / }),
    ).toHaveCount(2);
    sql(
      `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'stock.team.read',${q(fixtures.professional.id)},false);`,
    );
    try {
      await peer
        .getByRole("button", {
          name: "Consultar pedido e referências atuais novamente",
          exact: true,
        })
        .click();
      await expect(sources.getByRole("alert")).toContainText(
        "As fontes não estão disponíveis",
      );
      await expect(adopt).toBeDisabled();
      await expect(
        sources.getByRole("region", { name: /^Fonte atual de / }),
      ).toHaveCount(0);
      await expect(
        peer.getByText("Consumo já confirmado disponível:", { exact: true }),
      ).toHaveCount(0);
      await expect(reason(peer)).toHaveValue(entReason);
    } finally {
      sql(
        `update public.capability_overrides set enabled=true where care_recipient_id=${q(f.patient)} and capability='stock.team.read' and subject_user=${q(fixtures.professional.id)};`,
      );
    }
    await peer
      .getByRole("button", {
        name: "Consultar pedido e referências atuais novamente",
        exact: true,
      })
      .click();
    await expect(
      sources.getByRole("region", { name: /^Fonte atual de / }),
    ).toHaveCount(2);
    await expect(adopt).toBeEnabled();
    for (const width of [320, 390, 768, 1440]) {
      await peer.setViewportSize({ width, height: 900 });
      await peer.evaluate(() => window.scrollTo(0, 0));
      await audit(peer, `consent-source-${width}`);
    }
    await peer.setViewportSize({ width: 390, height: 844 });
    await sources.scrollIntoViewIfNeeded();
    await info.attach("referencias-consentimento", {
      body: await peer.screenshot(),
      contentType: "image/png",
    });
    await adopt.click();
    await expect(returned(peer, f.document.lines[0])).toHaveValue("1,");
    await expect(returned(peer, f.document.lines[1])).toHaveValue("2");
    await expect(reason(peer)).toHaveValue(entReason);
    await peer
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    await expect(dialog(peer)).toHaveCount(0);
    expect(entFacts(f)).toBe(unchanged);
    for (const line of f.document.lines) await returned(peer, line).fill("1");
    let body: { referenceHash: string; requestId: string } | undefined;
    peer.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === `/api/documents/${f.document.id}`
      )
        body = request.postDataJSON().body;
    });
    await prepare(peer);
    expect(entFacts(f)).toBe(unchanged);
    await dialog(peer)
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(dialog(peer)).toHaveCount(0);
    expect(body).toMatchObject({
      referenceHash: current.deliveryCancellation.referenceHash,
      requestId: current.deliveryCancellation.request.id,
    });
    expect(
      (await rpc(f.pro, "operational_document", { p_id: f.document.id }))
        .status,
    ).toBe("cancelled");
    expect(
      sql(
        `select count(*) from public.document_events where document_id=${q(f.document.id)} and action='ent.consent_cancel';`,
      ),
    ).toBe("1");
  } finally {
    await peerContext.close();
  }
});

test("ENT consentimento com resposta perdida recupera o resultado após reload em ficha encerrada sem repetirPOST", async ({
  page,
}) => {
  const f = await consentFixture();
  await login(page, f.patient);
  await openConsent(page, f.document.id);
  for (const line of f.document.lines) await returned(page, line).fill("2");
  await reason(page).fill(entReason);
  let posts = 0;
  await page.route(`**/api/documents/${f.document.id}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    return route.abort("failed");
  });
  await prepare(page);
  await dialog(page)
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("button", {
      name: "Recuperar tentativa",
      exact: true,
    }),
  ).toBeVisible();
  const applied = entFacts(f);
  await page.reload();
  await recovery(page, "Consentimento e conciliação");
  await expect(
    page.getByRole("region", { name: "Rascunho privado", exact: true }),
  ).toContainText("Este rascunho já foi usado em uma ficha");
  await expect(
    page.getByRole("button", { name: "Revisar operação", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reconhecer resultado aplicado", exact: true })
    .click();
  await expect(
    page.getByText(
      "Nenhum preenchimento ou resultado privado pendente para esta operação neste perfil.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(posts).toBe(1);
  expect(entFacts(f)).toBe(applied);
});

test("COM encerrada oferece consulta do resultado privado ao autor e não mostra esse resultado a outro perfil", async ({
  page,
  browser,
}, info) => {
  const f = await decisionFixture(false);
  await login(page, f.patient, "adminA");
  await page.goto(`/documentos/${f.document.id}`);
  await openDocumentMore(page);
  await page
    .getByRole("button", { name: "Solicitar cancelamento", exact: true })
    .click();
  await reason(page).fill(
    "Motivo fictício para recuperação em ficha encerrada",
  );
  await prepare(page);
  await dialog(page)
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  await page.reload();
  const applied = decisionFacts(f);
  const otherContext = await session(browser, page, info),
    other = await otherContext.newPage();
  try {
    await login(other, f.patient, "family");
    await other.goto(`/documentos/${f.document.id}`);
    await recovery(other, "Cancelamento ou pedido");
    await expect(
      other.getByText(
        "Nenhum preenchimento ou resultado privado pendente para esta operação neste perfil.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      other.getByRole("button", {
        name: "Reconhecer resultado aplicado",
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await otherContext.close();
  }
  await recovery(page, "Cancelamento ou pedido");
  await expect(
    page.getByRole("button", {
      name: "Reconhecer resultado aplicado",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reconhecer resultado aplicado", exact: true })
    .click();
  await expect(
    page.getByText(
      "Nenhum preenchimento ou resultado privado pendente para esta operação neste perfil.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(decisionFacts(f)).toBe(applied);
});
