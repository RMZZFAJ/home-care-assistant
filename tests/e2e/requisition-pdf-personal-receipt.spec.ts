import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  actor,
  rpc,
  setup,
  issue,
  fixtures,
} from "../integration/v4-fixtures.mjs";
import {
  localToday,
  shiftCommand,
  shiftWorker,
} from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(180_000);
async function login(
  page: Page,
  patient: string,
  email = fixtures.adminA.email,
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
async function logout(page: Page) {
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const material = (id: string) =>
  sql(`select jsonb_build_object(
 'items',(select jsonb_agg(to_jsonb(i) order by id) from public.requisition_items i where requisition_id=${sqlLiteral(id)}),
 'original',(select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id=${sqlLiteral(id)} and version=1),
 'identity',(select material_identity from public.requisitions where id=${sqlLiteral(id)}),
 'payload',(select payload from public.operational_documents where id=${sqlLiteral(id)}));`);
const sciences = (id: string) =>
  JSON.parse(
    sql(
      `select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.requisition_science_events e where requisition_id=${sqlLiteral(id)};`,
    ),
  );
const ledger = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
async function pdf(page: Page, id: string, version: number) {
  const response = await generatedPdf(
    page,
    `/api/documents/${id}/pdf?version=${version}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  return response.body();
}
async function readOnlyDispatch(page: Page, codes: string[]) {
  const facts = page.getByRole("region", {
    name: "Expedição preservada",
    exact: true,
  });
  await expect(facts).toContainText("Família");
  await expect(facts).toContainText("Equipe");
  await expect(facts).toContainText("Sheila");
  await expect(facts.locator("input,select,textarea")).toHaveCount(0);
  for (const code of codes)
    await expect(
      facts.getByRole("link", { name: new RegExp(code) }),
    ).toBeVisible();
}

test("M1 mantém material e ciência após resolução de extra, atendimento e duas emissões PDF", async ({
  page,
}, info) => {
  const f = await setup(),
    pro = await actor("professional", f.patient);
  const receipt = (
    await rpc(pro, "submit_requisition", {
      p_care_recipient_id: f.patient,
      p_idempotency_key: randomUUID(),
      p_payload_hash: "ignored",
      p_lines: [],
      p_extra_items: [
        {
          id: "extra-m1",
          customName: "Material extra original M1",
          currentStock: "0",
          urgent: false,
        },
      ],
      p_observations: [],
    })
  )[0];
  const id = receipt.requisition_id;
  const progress = await rpc(f.admin, "requisition_progress", { p_id: id });
  await rpc(f.admin, "acknowledge_requisition", {
    p_id: id,
    p_mode: "express",
    p_version: progress.version,
    p_material_identity: progress.materialIdentity,
  });
  const original = material(id),
    science = sciences(id);
  expect(science).toHaveLength(1);
  const firstVersion = Number(
    sql(
      `select version from public.operational_documents where id=${sqlLiteral(id)};`,
    ),
  );
  await login(page, f.patient);
  await page.goto("/historico/" + id);
  await selectDocumentSection(page, "materials");
  await expect(
    page.getByText("Material extra original M1", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /editar materiais|editar requisição/i }),
  ).toHaveCount(0);
  const beforePdf = await pdf(page, id, firstVersion);
  expect(sciences(id)).toEqual(science);
  await page
    .getByRole("combobox", { name: "Produto correspondente", exact: true })
    .selectOption(f.products[0]);
  await page
    .getByLabel("Justificativa da associação")
    .fill("Correspondência conferida; nome original M1 preservado");
  await page
    .getByRole("button", { name: "Revisar associação", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar associação", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(material(id)).toBe(original);
  expect(sciences(id)).toEqual(science);
  const item = JSON.parse(
    sql(
      `select to_jsonb(i) from public.requisition_items i where requisition_id=${sqlLiteral(id)};`,
    ),
  );
  expect(item.product_id).toBeNull();
  expect(item.custom_name).toBe("Material extra original M1");
  const resolved = JSON.parse(
    sql(
      `select to_jsonb(r) from public.requisition_item_resolutions r where requisition_item_id=${sqlLiteral(item.id)};`,
    ),
  );
  expect(resolved.product_id).toBe(f.products[0]);
  expect(resolved.reason).toBe(
    "Correspondência conferida; nome original M1 preservado",
  );
  const denied = await f.admin
    .from("requisition_items")
    .update({ custom_name: "Nome indevido" })
    .eq("id", item.id);
  expect(denied.error).toBeTruthy();
  expect(() =>
    sql(
      `update public.requisition_items set current_stock=7 where id=${sqlLiteral(item.id)};`,
    ),
  ).toThrow(/immutable/);
  const family = await actor("family", f.patient);
  const ent = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason: "Recebedor real indicado para este atendimento",
      lines: [
        {
          productId: f.products[0],
          quantity: "3",
          requisitionItemIds: [item.id],
        },
      ],
    },
  });
  await rpc(pro, "supply_document_command", {
    p_id: ent.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: ent.version,
  });
  const final = await rpc(f.admin, "requisition_progress", { p_id: id });
  expect(final.materialIdentity).toBe(progress.materialIdentity);
  expect(final.familyAware).toBe(true);
  expect(sciences(id)).toEqual(expect.arrayContaining(science));
  expect(sciences(id)).toHaveLength(2); // Original express SCI plus the actual family dispatcher.
  expect(
    (await rpc(f.admin, "requisition_fulfillment", { p_requisition: id }))
      .fulfilled,
  ).toBe(1);
  const finalVersion = Number(
    sql(
      `select version from public.operational_documents where id=${sqlLiteral(id)};`,
    ),
  );
  expect(finalVersion).toBeGreaterThan(firstVersion);
  const beforeDownload = sciences(id),
    finalPdf = await pdf(page, id, finalVersion),
    oldAgain = await pdf(page, id, firstVersion);
  expect(hash(oldAgain)).toBe(hash(beforePdf));
  expect(hash(finalPdf)).not.toBe(hash(beforePdf));
  expect(sciences(id)).toEqual(beforeDownload);
  expect(material(id)).toBe(original);
  const renders = JSON.parse(
    sql(
      `select jsonb_agg(jsonb_build_object('version',version,'row',to_jsonb(r))) from private.pdf_issuances r where state='ready' and document_id=${sqlLiteral(id)};`,
    ),
  );
  // Only explicit generation actions create signed, immutable registrations.
  const versions = renders.map((r: { version: number }) => r.version);
  expect(new Set(versions).size).toBe(versions.length);
  expect(versions).toEqual(
    expect.arrayContaining([firstVersion, finalVersion]),
  );
  for (const [version, bytes] of [
    [firstVersion, beforePdf],
    [finalVersion, finalPdf],
  ] as const) {
    const registration = renders.find(
      (r: { version: number }) => r.version === version,
    ).row;
    expect(registration.document_id).toBe(id);
    expect(registration.sha256).toBe(hash(bytes));
    expect(registration.object_path).toBe(
      `issuances/${id}/${registration.id}.pdf`,
    );
    expect(registration.validation).toMatchObject({
      accepted: true,
      profile: "PAdES-B-T",
      wholeFile: true,
    });
  }
  await page.reload();
  await expect(
    page.getByText("Material extra original M1", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Produto correspondente", exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "M1 original material and resolved link " + width);
  }
  mkdirSync("output/pdf/phase-d", { recursive: true });
  const prefix = `output/pdf/phase-d/m1-resolved-${info.project.name}-${id}`;
  writeFileSync(prefix + "-before.pdf", beforePdf);
  writeFileSync(prefix + "-after.pdf", finalPdf);
  writeFileSync(
    prefix + "-evidence.json",
    JSON.stringify(
      {
        id,
        firstVersion,
        finalVersion,
        beforeHash: hash(beforePdf),
        afterHash: hash(finalPdf),
        material: JSON.parse(original),
        science: beforeDownload,
        renders,
      },
      null,
      2,
    ),
  );
});

test("ENT pessoal mostra todas as linhas e expedição em leitura; Sheila recebe2 de3 e mantém1 pendente", async ({
  page,
}, info) => {
  const f = await setup(),
    sheila = await shiftWorker(f.patient);
  sql(
    `update public.profiles set full_name='Sheila' where id=${sqlLiteral(sheila.id)};`,
  );
  const req1 = await issue(f.patient, [f.products[0]]),
    req2 = await issue(f.patient, [f.products[1]]);
  const family = await actor("family", f.patient);
  const delivery = (await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: sheila.id,
      recipientReason: "Sheila conferirá pessoalmente os materiais expedidos",
      lines: [
        {
          productId: f.products[0],
          quantity: "3",
          requisitionItemIds: [req1.lines[0].id],
        },
        {
          productId: f.products[1],
          quantity: "1",
          requisitionItemIds: [req2.lines[0].id],
        },
      ],
    },
  })) as SupplyDocument;
  const codes = [req1.id, req2.id].map((id) =>
      sql(`select code from public.requisitions where id=${sqlLiteral(id)};`),
    ),
    before = ledger(f.patient);
  for (const profile of ["family", "global"] as const) {
    await login(page, f.patient, fixtures[profile].email);
    await page.goto("/fichas/" + delivery.id);
    await selectDocumentSection(page, "workflow");
    await readOnlyDispatch(page, codes);
    await expect(
      page.getByRole("button", {
        name: /^(Confirmar recebimento|Informar divergência)$/,
      }),
    ).toHaveCount(0);
    const denied = await page.request.post("/api/documents/" + delivery.id, {
      data: {
        action: "receive",
        body: { divergences: [] },
        expectedVersion: delivery.version,
        idempotencyKey: randomUUID(),
      },
    });
    expect(denied.status()).toBe(403);
    expect(ledger(f.patient)).toBe(before);
    await logout(page);
  }
  await login(page, f.patient, sheila.email);
  await page.goto("/fichas/" + delivery.id);
    await selectDocumentSection(page, "workflow");
  await readOnlyDispatch(page, codes);
  await page
    .getByRole("button", { name: "Informar divergência", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Material fictício V4/ }),
  ).toHaveCount(2);
  await page.getByRole("checkbox", { name: /^Material fictício V4 0/ }).check();
  await page.getByLabel("Efetivamente recebido", { exact: true }).fill("2");
  await page
    .getByLabel("Observações da divergência", { exact: true })
    .fill("Conferência física: uma unidade não chegou");
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
  await expect(review).toBeVisible();
  await expect(review.locator("input,select,textarea")).toHaveCount(0);
  const lines = review.getByRole("article");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toContainText("Material fictício V4 0");
  await expect(lines.nth(0)).toContainText("3 unidade");
  await expect(lines.nth(0)).toContainText("2 unidade");
  await expect(lines.nth(0)).toContainText("1 unidade");
  await expect(lines.nth(1)).toContainText("Recebimento integral desta linha");
  for (const code of codes)
    await expect(
      review.getByRole("link", { name: new RegExp(code) }),
    ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "ENT personal full line review " + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/personal-partial-review-${info.project.name}.png`,
    fullPage: true,
  });
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/documents/" + delivery.id &&
      response.request().method() === "POST",
  );
  await review
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  expect(response.request().postDataJSON().body).toEqual({
    divergences: [
      {
        lineId: delivery.lines[0].id,
        acceptedQuantity: "2",
        problem: "shortage",
        notes: "Conferência física: uma unidade não chegou",
      },
    ],
  });
  await expect(review).not.toBeVisible();
  const result = (await rpc(sheila.client, "operational_document", {
    p_id: delivery.id,
  })) as SupplyDocument;
  expect(result.status).toBe("disputed");
  expect(result.workflow_data.acceptedBy).toBe(sheila.id);
  expect(Number(result.lines[0].quantity)).toBe(3);
  expect(Number(result.lines[0].accepted_quantity)).toBe(2);
  expect(Number(result.lines[1].accepted_quantity)).toBe(1);
  expect(result.lines[0].requisitionItemIds).toEqual(
    delivery.lines[0].requisitionItemIds,
  );
  expect(result.payload).toEqual(delivery.payload);
  const movement = JSON.parse(
    sql(
      `select jsonb_build_object('family',sum(case when destination_location='FAMILY' then quantity else 0 end-case when source_location='FAMILY' then quantity else 0 end),'team',sum(case when destination_location='CARE_TEAM' then quantity else 0 end-case when source_location='CARE_TEAM' then quantity else 0 end),'transit',sum(case when destination_location='TRANSIT' then quantity else 0 end-case when source_location='TRANSIT' then quantity else 0 end)) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])};`,
    ),
  );
  expect(movement).toEqual({ family: 27, team: 2, transit: 1 });
  const event = JSON.parse(
    sql(
      `select to_jsonb(e) from public.document_events e where document_id=${sqlLiteral(delivery.id)} order by version desc limit 1;`,
    ),
  );
  expect(event.actor_id).toBe(sheila.id);
  await page.screenshot({
    path: `output/playwright/phase-d/personal-partial-result-${info.project.name}.png`,
    fullPage: true,
  });
});

test("confirmadores mostram retirada familiar5→4 e BAL noturno de sexta em leitura, com efeitos distintos", async ({
  page,
}, info) => {
  const f = await setup(),
    today = localToday();
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_quantity: "25",
    p_action: "outbound",
    p_reason: "Retirada física fictícia para formar referência de cinco",
    p_key: randomUUID(),
  });
  const type = await shiftCommand(f.admin, f.patient, "type", {
    name: "Noturno de sexta",
    startsLocal: "19:00",
    durationMinutes: 720,
  });
  await login(page, f.patient);
  await page.goto("/estoque");
  await page
    .getByRole("button", { name: "Movimentar estoque familiar", exact: true })
    .click();
  await page.getByLabel("Operação", { exact: true }).selectOption("outbound");
  await page.getByLabel("Produto", { exact: true }).selectOption(f.products[0]);
  await page.getByLabel("Quantidade", { exact: true }).fill("1");
  await page
    .getByLabel("Motivo", { exact: true })
    .fill("Saída familiar física de uma unidade, cinco para quatro");
  await page
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  const movement = page.getByRole("region", {
    name: "Revisão da movimentação familiar",
    exact: true,
  });
  await expect(movement).toContainText("Material fictício V4 0");
  await expect(movement).toContainText("1 unidade");
  await expect(movement).toContainText("familiar");
  await expect(
    movement.locator("input:visible,select:visible,textarea:visible"),
  ).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByText("Movimentação familiar confirmada.", { exact: false }),
  ).toBeVisible();
  expect(
    Number(
      sql(
        `select private.stock_quantity(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'FAMILY');`,
      ),
    ),
  ).toBe(4);
  const before = ledger(f.patient);
  await page.goto("/balancos");
  await page
    .getByRole("button", { name: "Configurar dia e plantão", exact: true })
    .click();
  const form = page.getByRole("dialog", {
    name: "Programação do BAL",
    exact: true,
  });
  await form
    .getByRole("checkbox", {
      name: "Processamento automático neste paciente",
      exact: true,
    })
    .check();
  await form.getByLabel("Dia do balanço", { exact: true }).selectOption("5");
  await form
    .getByLabel("Plantão responsável", { exact: true })
    .selectOption(type.id);
  await form
    .getByLabel("Fuso do paciente", { exact: true })
    .selectOption("America/Sao_Paulo");
  await form.getByLabel("Vigente a partir de", { exact: true }).fill(today);
  await form
    .getByLabel("Justificativa", { exact: true })
    .fill("Programação noturna de sexta conforme responsabilidade familiar");
  await form
    .getByRole("button", { name: "Revisar decisão", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar decisão do balanço",
    exact: true,
  });
  const facts = review.getByRole("region", {
    name: "Programação a confirmar",
    exact: true,
  });
  for (const text of [
    "Sexta-feira",
    "Noturno de sexta",
    "19:00",
    "12h",
    "America/Sao_Paulo",
    "Derivar da escala real",
    "não registra contagem nem movimenta estoque",
  ])
    await expect(facts).toContainText(text);
  await expect(
    review.locator("input:visible,select:visible,textarea:visible"),
  ).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "BAL Friday night configuration summary " + width);
  }
  await page.screenshot({
    path: `output/playwright/phase-d/bal-friday-summary-${info.project.name}.png`,
    fullPage: true,
  });
  await review
    .getByRole("button", { name: "Confirmar decisão", exact: true })
    .click();
  await expect(review).not.toBeVisible();
  const current = await rpc(f.admin, "balance_workspace", {
    p_patient: f.patient,
  });
  expect(current.regime).toMatchObject({
    weekday: 5,
    timezone: "America/Sao_Paulo",
    shift_type_id: type.id,
    starts_on: today,
    enabled: true,
  });
  expect(ledger(f.patient)).toBe(before);
});
