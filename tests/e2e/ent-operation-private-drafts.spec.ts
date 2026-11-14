import { expect, test, type Page } from "@playwright/test";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import {
  entOperationFixture,
  entFacts,
  entReason,
  entPacket,
  entSend,
} from "../integration/ent-operation-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openDocumentMore } from "./document-sections";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
async function login(
  page: Page,
  patient: string,
  who: "adminA" | "professional" = "adminA",
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
async function open(page: Page, id: string, label: string, more = false) {
  await page.goto(`/documentos/${id}`);
  if (more) await openDocumentMore(page);
  await page.getByRole("button", { name: label, exact: true }).click();
}
const reason = (page: Page, name = "Motivo / justificativa") =>
  page.getByRole("textbox", { name, exact: true });
const review = (page: Page) =>
  page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
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
const stock = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );

test("ENT retoma destinatário em outra sessão preserva pessoa indisponível e recupera uma troca sem repeti-la", async ({
  page,
  browser,
}, info) => {
  const f = await entOperationFixture();
  sql(
    `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.shared.id)},'professional');`,
  );
  await login(page, f.patient);
  await open(page, f.document.id, "Alterar destinatário", true);
  const before = entFacts(f);
  await page
    .getByRole("combobox", { name: "Novo destinatário", exact: true })
    .selectOption(fixtures.shared.id);
  await reason(page).fill(entReason);
  await save(page);
  expect(entFacts(f)).toBe(before);
  const peerContext = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const peer = await peerContext.newPage();
    await login(peer, f.patient);
    await open(peer, f.document.id, "Alterar destinatário", true);
    await resume(peer);
    const select = peer.getByRole("combobox", {
      name: "Novo destinatário",
      exact: true,
    });
    await expect(select).toHaveValue(fixtures.shared.id);
    await expect(reason(peer)).toHaveValue(entReason);
    sql(
      `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.shared.id)};`,
    );
    await open(peer, f.document.id, "Alterar destinatário", true);
    await resume(peer);
    await expect(select).toHaveValue(fixtures.shared.id);
    await expect(select.locator("option:checked")).toHaveText(
      "Pessoa preservada indisponível para esta entrega",
    );
    await peer
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    await expect(review(peer)).toHaveCount(0);
    await expect(
      peer.getByText(
        "Escolha expressamente uma pessoa elegível para receber esta entrega.",
        { exact: true },
      ),
    ).toBeVisible();
    await select.selectOption(fixtures.global.id);
    await audit(peer, "ENT private recipient selection");
    await peer
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    let sends = 0;
    await peer.route(`**/api/documents/${f.document.id}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      sends++;
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      return route.abort("failed");
    });
    await review(peer)
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(
      review(peer).getByRole("button", {
        name: "Recuperar tentativa",
        exact: true,
      }),
    ).toBeVisible();
    const committed = entFacts(f);
    await peer.reload();
    await openDocumentMore(peer);
    await peer
      .getByRole("button", { name: "Alterar destinatário", exact: true })
      .click();
    await peer
      .getByRole("button", {
        name: "Confirmar resultado e começar novo preenchimento",
        exact: true,
      })
      .click();
    await expect(select).toHaveValue("");
    expect(sends).toBe(1);
    expect(entFacts(f)).toBe(committed);
    expect(
      (await rpc(f.admin, "operational_document", { p_id: f.document.id }))
        .recipient_id,
    ).toBe(fixtures.global.id);
  } finally {
    await peerContext.close();
  }
});

test("ENT conciliação preserva material decimal e solução pessoal indisponível até escolha e referência explícitas", async ({
  page,
}, info) => {
  const f = await entOperationFixture("disputed"),
    line = f.document.lines[1];
  await rpc(
    f.admin,
    "supply_draft_command",
    entPacket(f, "resolve", { resolution: "received", quantity: "1," }),
  );
  const newer = await entSend(f.pro, f.document, "resolve", {
    lineId: f.document.lines[0].id,
    resolution: "received",
    quantity: "1",
    reason: "Recebimento complementar pessoal fictício",
  });
  await login(page, f.patient);
  await open(page, f.document.id, "Conciliar divergência");
  await resume(page);
  const selectedLine = page.getByRole("combobox", {
      name: "Linha divergente",
      exact: true,
    }),
    resolution = page.getByRole("combobox", { name: "Resolução", exact: true }),
    amount = page.getByRole("textbox", {
      name: "Quantidade conciliada neste ato",
      exact: true,
    });
  await expect(selectedLine).toHaveValue(line.id);
  await expect(amount).toHaveValue("1,");
  await expect(resolution).toHaveValue("received");
  await expect(resolution.locator("option:checked")).toHaveText(
    "Solução preservada indisponível para sua atuação",
  );
  await expect(
    page.getByRole("button", { name: "Revisar operação", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Comparar referência da operação",
      exact: true,
    })
    .click();
  const facts = page.getByRole("region", {
    name: "Fatos oficiais das referências da operação",
    exact: true,
  });
  await expect(
    facts.getByRole("article", {
      name: `Conteúdo preservado da versão ${newer.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Usar referência vigente e manter preenchimento",
      exact: true,
    })
    .click();
  await expect(amount).toHaveValue("1,");
  await expect(resolution).toHaveValue("received");
  const before = entFacts(f);
  await amount.fill("1");
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  await expect(
    page.getByText(/Escolha uma solução disponível para sua atuação/),
  ).toBeVisible();
  expect(entFacts(f)).toBe(before);
  await resolution.selectOption("returned");
  await audit(page, "ENT private line and resolution");
  await info.attach("ent-conciliacao-privada", {
    body: await page.screenshot({ fullPage: false, animations: "disabled" }),
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await expect(review(page)).toContainText(line.name_snapshot);
  await review(page)
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  expect(
    sql(
      `select accepted_quantity=1 and reconciled_quantity=1 from public.document_lines where id=${sqlLiteral(line.id)};`,
    ),
  ).toBe("t");
});

for (const mode of ["pending", "accepted"] as const)
  test(`ENT cancelamento ${mode} retoma motivo e fechar a revisão não antecipa cancelamento ou devolução`, async ({
    page,
  }) => {
    const f = await entOperationFixture(mode);
    await login(page, f.patient);
    await open(page, f.document.id, "Solicitar cancelamento", true);
    const before = entFacts(f),
      ledger = stock(f.patient);
    await reason(page).fill(entReason);
    await save(page);
    await open(page, f.document.id, "Solicitar cancelamento", true);
    await resume(page);
    await expect(reason(page)).toHaveValue(entReason);
    await page
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    await expect(review(page)).toBeVisible();
    await review(page).press("Escape");
    await expect(review(page)).toHaveCount(0);
    expect(entFacts(f)).toBe(before);
    await page
      .getByRole("button", { name: "Revisar operação", exact: true })
      .click();
    await review(page)
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(review(page)).toHaveCount(0);
    const actual = await rpc(f.admin, "operational_document", {
      p_id: f.document.id,
    });
    expect(actual.status).toBe(
      mode === "pending" ? "cancelled" : "cancellation_pending",
    );
    if (mode === "accepted") expect(stock(f.patient)).toBe(ledger);
  });

test("ENT recusa retoma o pedido original e só adota outro pedido após comparação explícita", async ({
  page,
}) => {
  const f = await entOperationFixture("request"),
    original = f.document.deliveryCancellation.request;
  await login(page, f.patient, "professional");
  await open(page, f.document.id, "Recusar pedido de cancelamento");
  await reason(page, "Motivo da recusa").fill(entReason);
  await save(page);
  let newer = await entSend(f.admin, f.document, "withdraw_cancellation", {
    requestId: original.id,
    reason: "Retirada fictícia antes da nova solicitação",
  });
  newer = await entSend(f.admin, newer, "cancel", {
    reason: "Novo pedido de cancelamento fictício distinto",
  });
  await open(page, f.document.id, "Recusar pedido de cancelamento");
  const privatePanel = page.getByRole("region", {
    name: "Rascunho privado",
    exact: true,
  });
  await expect(privatePanel).toContainText(original.reason);
  await resume(page);
  await expect(reason(page, "Motivo da recusa")).toHaveValue(entReason);
  await expect(
    page.getByRole("button", { name: "Revisar operação", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Comparar referência da operação",
      exact: true,
    })
    .click();
  const facts = page.getByRole("region", {
    name: "Fatos oficiais das referências da operação",
    exact: true,
  });
  await expect(
    facts.getByRole("article", {
      name: `Conteúdo preservado da versão ${newer.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Usar referência vigente e manter preenchimento",
      exact: true,
    })
    .click();
  await expect(reason(page, "Motivo da recusa")).toHaveValue(entReason);
  const afterReplacement = entFacts(f),
    ledger = stock(f.patient);
  let body: { requestId: string } | null = null;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === `/api/documents/${f.document.id}`
    )
      body = request.postDataJSON().body;
  });
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  expect(entFacts(f)).toBe(afterReplacement);
  await review(page)
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  expect(body).toMatchObject({
    requestId: newer.deliveryCancellation.request.id,
  });
  expect(
    (await rpc(f.pro, "operational_document", { p_id: f.document.id }))
      .deliveryCancellation.request.status,
  ).toBe("refused");
  expect(stock(f.patient)).toBe(ledger);
});

test("ENT retirada retoma justificativa e recupera a mesma intenção depois de resposta perdida", async ({
  page,
}) => {
  const f = await entOperationFixture("request");
  await login(page, f.patient);
  await open(page, f.document.id, "Retirar meu pedido de cancelamento");
  await reason(page, "Motivo da retirada").fill(entReason);
  await save(page);
  await open(page, f.document.id, "Retirar meu pedido de cancelamento");
  await resume(page);
  await expect(reason(page, "Motivo da retirada")).toHaveValue(entReason);
  const payloads: unknown[] = [];
  let dropped = false;
  const ledger = stock(f.patient);
  await page.route(`**/api/documents/${f.document.id}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    payloads.push(route.request().postDataJSON());
    if (!dropped) {
      dropped = true;
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      return route.abort("failed");
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await review(page)
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(
    review(page).getByRole("button", {
      name: "Recuperar tentativa",
      exact: true,
    }),
  ).toBeVisible();
  const committed = entFacts(f);
  await review(page)
    .getByRole("button", { name: "Recuperar tentativa", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toEqual(payloads[0]);
  expect(entFacts(f)).toBe(committed);
  expect(stock(f.patient)).toBe(ledger);
});
