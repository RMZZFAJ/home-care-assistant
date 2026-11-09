import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { unavailableDelivery } from "../integration/delivery-regularization-fixtures.mjs";
import { actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";
test.setTimeout(180_000);
type Fixture = Awaited<ReturnType<typeof unavailableDelivery>>;
const ledger = (f: Fixture) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
const person = (role: string) =>
  sql(
    `select full_name from public.profiles where id=${sqlLiteral(fixtures[role].id)};`,
  );
async function login(page: Page, patient: string, role: string) {
  const identities = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(identities[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function choose(page: Page, label: string, name: string) {
  const field = page.getByRole("combobox", { name: label, exact: true });
  const before = await field.boundingBox();
  // Fill/press do not require an on-screen control. Start with the visible
  // pointer interaction a person uses, including the drawer's actual scroll.
  await field.click();
  await expect(field).toBeInViewport({ ratio: 1 });
  await field.fill(name);
  await field.press("ArrowDown");
  const option = page.getByRole("option", { name, exact: true });
  await expect(option).toBeInViewport({ ratio: 1 });
  await test.info().attach("P05-visible-choice-" + label, {
    body: JSON.stringify({
      viewport: page.viewportSize(),
      before,
      field: await field.boundingBox(),
      option: await option.boundingBox(),
    }),
    contentType: "application/json",
  });
  await option.click();
}
const drawer = (page: Page) =>
  page.getByRole("dialog", { name: /regularização|apuração própria/i });
async function proposalForm(page: Page, returned = "1") {
  await page
    .getByLabel("Sua justificativa", { exact: true })
    .fill("Minha apuração administrativa preserva o recebimento original");
  await page
    .getByLabel("Evidências e limites da apuração", { exact: true })
    .fill(
      "Conferência fictícia documenta o retorno físico e limita a declaração ao material apurado",
    );
  await page
    .getByLabel("Recebimento físico apurado · Material fictício V4 0", {
      exact: true,
    })
    .fill("0");
  await page
    .getByLabel("Devolução física apurada · Material fictício V4 0", {
      exact: true,
    })
    .fill(returned);
  await page
    .getByLabel("Falta apurada · Material fictício V4 0", { exact: true })
    .fill("0");
  await choose(page, "Conferente independente", person("family"));
}
async function confirm(page: Page, id: string, button: string) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/documents/" + id &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: button, exact: true }).click();
  const result = await response;
  expect(result.ok(), await result.text()).toBe(true);
  return (await result.json()).data as SupplyDocument;
}
async function unknownCase(f: Fixture, owner: string) {
  let document = await rpc(f.admin, "supply_document_command", {
    p_id: f.document.id,
    p_action: "propose_regularization",
    p_body: {
      reason: "Proposta fictícia mantém situação física desconhecida",
      basis: "Não foi possível comprovar o destino da unidade remanescente",
      reviewerId: fixtures.family.id,
      followUpOwnerId: owner,
      lines: f.document.lines.map((l: SupplyDocument["lines"][number]) => ({
        lineId: l.id,
        receivedQuantity: "0",
        returnedQuantity: "0",
        missingQuantity: "0",
      })),
    },
    p_key: randomUUID(),
    p_version: f.document.version,
  });
  const family = await actor("family", f.patient);
  document = await rpc(family, "supply_document_command", {
    p_id: document.id,
    p_action: "review_regularization",
    p_body: {
      caseId: document.deliveryRegularization.currentId,
      accept: true,
      reason:
        "Conferência independente conserva o desconhecido e sua apuração futura",
    },
    p_key: randomUUID(),
    p_version: document.version,
  });
  return document as SupplyDocument;
}

test("P05 proposta e conferência independentes preservam autoria, recuperam o mesmo ato e produzem dossiê PDF", async ({
  page,
  browser,
}, info) => {
  const f = await unavailableDelivery({ cancellation: true }),
    before = ledger(f);
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  const panel = page.getByRole("region", {
    name: "Regularização administrativa",
    exact: true,
  });
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resolver divergência", exact: true }),
  ).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Preparar regularização", exact: true })
    .click();
  await expect(
    page.getByLabel("Sua justificativa", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Devolução física apurada · Material fictício V4 0", {
      exact: true,
    }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Revisar ato administrativo", exact: true })
    .click();
  await expect(
    page.getByLabel("Sua justificativa", { exact: true }),
  ).toBeFocused();
  expect(ledger(f)).toBe(before);
  await proposalForm(page);
  await page
    .getByRole("button", { name: "Revisar ato administrativo", exact: true })
    .click();
  await expect(drawer(page).getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Resumo do ato administrativo",
      exact: true,
    }),
  ).toBeFocused();
  const attempts: unknown[] = [];
  await page.route("**/api/documents/" + f.document.id, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const result = await route.fetch();
      expect(result.ok(), await result.text()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", {
      name: "Registrar proposta sem movimentar",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar mesmo ato", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Editar meus campos", exact: true }),
  ).toHaveCount(0);
  const proposed = await confirm(page, f.document.id, "Recuperar mesmo ato");
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  expect(ledger(f)).toBe(before);
  expect(proposed.deliveryRegularization!.cases).toHaveLength(1);
  await page.unroute("**/api/documents/" + f.document.id);
  const familyContext = await browser.newContext(),
    family = await familyContext.newPage();
  try {
    await login(family, f.patient, "family");
    await family.goto("/entregas");
    await expect(
      family.getByRole("combobox", {
        name: "Situação das entregas",
        exact: true,
      }),
    ).toHaveValue("tasks");
    await expect(
      family.getByText("Conferir regularização administrativa", {
        exact: true,
      }),
    ).toBeVisible();
    await family
      .getByRole("link", { name: new RegExp(proposed.code!) })
      .click();
    await selectDocumentSection(family, "workflow");
    await family
      .getByRole("button", { name: "Conferir proposta", exact: true })
      .click();
    await expect(
      family.getByLabel("Sua justificativa", { exact: true }),
    ).toHaveValue("");
    await expect(
      drawer(family).getByText(
        "Minha apuração administrativa preserva o recebimento original",
        { exact: false },
      ),
    ).toBeVisible();
    await family
      .getByLabel("Sua justificativa", { exact: true })
      .fill(
        "Minha conferência independente confirma somente a devolução física apurada",
      );
    await family
      .getByRole("button", { name: "Revisar ato administrativo", exact: true })
      .click();
    await expect(drawer(family).getByRole("textbox")).toHaveCount(0);
    const result = await confirm(
      family,
      f.document.id,
      "Aprovar encerramento administrativo",
    );
    expect(result.status).toBe("administratively_closed");
    expect(result.workflow_data.acceptedBy).toBe(fixtures.professional.id);
    expect(Number(result.lines[0].accepted_quantity)).toBe(2);
    expect(Number(result.lines[0].reconciled_quantity)).toBe(1);
    expect(result.lines[0].fully_checked).toBe(false);
    expect(result.deliveryCancellation!.historical).toBe(true);
    await expect(
      family
        .getByRole("region", {
          name: "Regularização administrativa",
          exact: true,
        })
        .getByRole("heading", {
          name: "Regularização administrativa",
          exact: true,
        }),
    ).toBeFocused();
    await expect(
      family.getByText("Pedido anterior sem decisão pessoal", { exact: true }),
    ).toBeVisible();
    for (const width of [1440, 768, 390, 320]) {
      await family.setViewportSize({ width, height: 900 });
      // Start each responsive inspection at the document's reading origin;
      // focus restoration may have left earlier controls at the sticky edge.
      await family.evaluate(() => window.scrollTo(0, 0));
      await audit(family, "regularizacao-resultado-" + width);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await family.screenshot({
      path: `output/playwright/phase-d/delivery-regularization-${info.project.name}.png`,
      fullPage: true,
    });
    const pdf = await generatedPdf(
      family,
      `/api/documents/${result.id}/pdf?version=${result.version}`,
    );
    expect(pdf.ok(), await pdf.text().then((t) => t.slice(0, 80))).toBe(true);
    mkdirSync("output/pdf/phase-d", { recursive: true });
    writeFileSync(
      `output/pdf/phase-d/delivery-regularization-${result.id}-v${result.version}.pdf`,
      await pdf.body(),
    );
    writeFileSync(
      `output/pdf/phase-d/delivery-regularization-${result.id}-v${result.version}.json`,
      sql(
        `select jsonb_build_object('snapshot',e.body,'canonicalHash',e.content_hash,'document',to_jsonb(d),'render',(select to_jsonb(a) from private.pdf_issuances a where a.document_id=d.id and a.version=e.version and a.state='ready'),'movements',(select jsonb_agg(to_jsonb(m) order by movement_revision) from public.stock_movements m where care_recipient_id=d.care_recipient_id)) from public.document_events e join public.operational_documents d on d.id=e.document_id where e.document_id=${sqlLiteral(result.id)} and e.version=${result.version};`,
      ),
    );
    const inbox = await family.request.get(
      `/api/deliveries?careRecipientId=${f.patient}`,
    );
    expect((await inbox.json()).total).toBe(0);
  } finally {
    await familyContext.close();
  }
});

test("P05 profissional futuro encontra sua tarefa e relata apenas apuração própria sem substituir o aceite", async ({
  page,
}) => {
  const f = await unavailableDelivery();
  sql(
    `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.supervisor.id)},'professional');`,
  );
  const document = await unknownCase(f, fixtures.supervisor.id),
    before = ledger(f);
  await login(page, f.patient, "supervisor");
  await page.goto("/entregas");
  await expect(
    page.getByText("Relatar apuração da pendência física", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(document.code!) }).click();
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: "Registrar apuração própria", exact: true })
    .click();
  await expect(
    page.getByLabel("Relato da sua apuração", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Relato da sua apuração", { exact: true })
    .fill(
      "Apuração futura própria: a unidade continua não localizada, sem recebimento em nome de terceiro",
    );
  await page
    .getByRole("button", { name: "Revisar ato administrativo", exact: true })
    .click();
  await expect(drawer(page).getByRole("textbox")).toHaveCount(0);
  const result = await confirm(page, document.id, "Registrar minha apuração");
  expect(ledger(f)).toBe(before);
  expect(result.workflow_data.acceptedBy).toBe(fixtures.professional.id);
  expect(Number(result.lines[0].accepted_quantity)).toBe(2);
  expect(result.deliveryRegularization!.cases[0].findings[0].actor_id).toBe(
    fixtures.supervisor.id,
  );
  await selectDocumentSection(page, "materials");
  await expect(
    page.getByText(
      "Encerramento administrativo · situação física ainda desconhecida",
      { exact: true },
    ),
  ).toBeVisible();
  const pdf = await generatedPdf(
    page,
    `/api/documents/${result.id}/pdf?version=${result.version}`,
  );
  expect(pdf.ok()).toBe(true);
  mkdirSync("output/pdf/phase-d", { recursive: true });
  writeFileSync(
    `output/pdf/phase-d/delivery-regularization-unknown-${result.id}-v${result.version}.pdf`,
    await pdf.body(),
  );
  writeFileSync(
    `output/pdf/phase-d/delivery-regularization-unknown-${result.id}-v${result.version}.json`,
    sql(
      `select jsonb_build_object('snapshot',e.body,'canonicalHash',e.content_hash,'render',(select to_jsonb(a) from private.pdf_issuances a where a.document_id=e.document_id and a.version=e.version and a.state='ready'),'movements',(select jsonb_agg(to_jsonb(m) order by movement_revision) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)})) from public.document_events e where e.document_id=${sqlLiteral(result.id)} and e.version=${result.version};`,
    ),
  );
  await page.goto("/entregas");
  await expect(
    page.getByRole("heading", {
      name: "Nenhuma entrega nesta seleção",
      exact: true,
    }),
  ).toBeVisible();
});

test("C043 caixa padrão oferece decisão pessoal de cancelamento e remove a tarefa após recusa sem movimentar", async ({
  page,
}) => {
  const f = await unavailableDelivery({
      revoke: false,
      cancellation: true,
      quantity: "2",
      completeReceipt: true,
    }),
    before = ledger(f);
  const third = await actor("reader", f.patient);
  expect(
    (await rpc(third, "delivery_task_list", { p_patient: f.patient })).total,
  ).toBe(0);
  await login(page, f.patient, "professional");
  await page.goto("/entregas");
  await expect(
    page.getByText("Decidir pedido de cancelamento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(f.document.code) }).click();
  await expect(page).toHaveURL(
    new RegExp("/documentos/" + f.document.id + "$"),
  );
  await page
    .getByRole("button", {
      name: "Recusar pedido de cancelamento",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Motivo da recusa", { exact: true })
    .fill("Minha decisão pessoal mantém o recebimento e recusa o cancelamento");
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/documents/" + f.document.id &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(ledger(f)).toBe(before);
  await page.goto("/entregas");
  await expect(
    page.getByRole("heading", {
      name: "Nenhuma entrega nesta seleção",
      exact: true,
    }),
  ).toBeVisible();
  const result = await page.request.get("/api/documents/" + f.document.id);
  const data = (await result.json()).data;
  expect(data.status).toBe("confirmed");
  expect(data.deliveryCancellation.request.outcome.actorId).toBe(
    fixtures.professional.id,
  );
  expect(data.deliveryCancellation.request.status).toBe("refused");
});

test("P05 conflito preserva campos próprios e só permite nova proposta após comparar e adotar a referência atual", async ({
  page,
}) => {
  const f = await unavailableDelivery();
  f.document = await unknownCase(f, fixtures.adminA.id);
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  await page
    .getByRole("button", { name: "Preparar regularização", exact: true })
    .click();
  await proposalForm(page);
  await page
    .getByRole("button", { name: "Revisar ato administrativo", exact: true })
    .click();
  const before = ledger(f),
    latest = await rpc(f.admin, "supply_document_command", {
      p_id: f.document.id,
      p_action: "record_regularization_finding",
      p_body: {
        caseId: f.document.deliveryRegularization!.currentId,
        text: "Apuração de outra sessão altera a versão sem movimentação",
      },
      p_key: randomUUID(),
      p_version: f.document.version,
    });
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/documents/" + f.document.id &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Registrar proposta sem movimentar",
      exact: true,
    })
    .click();
  expect((await response).status()).toBe(409);
  await expect(
    page.getByLabel("Sua justificativa", { exact: true }),
  ).toHaveValue(
    "Minha apuração administrativa preserva o recebimento original",
  );
  await expect(
    page.getByRole("button", {
      name: "Revisar ato administrativo",
      exact: true,
    }),
  ).toBeDisabled();
  expect(ledger(f)).toBe(before);
  await page
    .getByRole("button", {
      name: "Consultar ficha e elegibilidade atuais",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Comparação da regularização",
      exact: true,
    }),
  ).toContainText(`Ficha atual: v${latest.version}`);
  await page
    .getByRole("button", { name: "Usar referência atual", exact: true })
    .click();
  await expect(
    page.getByLabel("Sua justificativa", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Devolução física apurada · Material fictício V4 0", {
      exact: true,
    }),
  ).toHaveValue("1");
  await page.setViewportSize({ width: 320, height: 900 });
  await audit(page, "regularizacao-conflito-adotado-320");
  await page
    .getByRole("button", { name: "Revisar ato administrativo", exact: true })
    .click();
  const result = await confirm(
    page,
    f.document.id,
    "Registrar proposta sem movimentar",
  );
  expect(result.deliveryRegularization!.cases).toHaveLength(2);
  expect(ledger(f)).toBe(before);
});
