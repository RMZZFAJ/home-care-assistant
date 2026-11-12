import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
async function fixture() {
  const f = await setup(),
    family = await actor("family", f.patient);
  const document = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "2" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  return { ...f, document };
}
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const official = (id: string, patient: string) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)}),'pdf',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(id)}));`,
  );
const field = (page: Page, id: string) => page.locator(`input[name="${id}"]`);

test("background revalidation between press and release still opens the retained operation without writing facts", async ({ page }) => {
  const f = await fixture(), id = f.document.id;
  await login(page, f.patient);
  await page.goto(`/documentos/${id}`);
  const open = page.getByRole("button", { name: "Aprovar itens", exact: true });
  const refresh = page.getByRole("button", { name: "Atualizar ficha", exact: true });
  await expect(open).toBeEnabled();
  await expect(refresh).toHaveAttribute("aria-disabled", "false");
  await open.scrollIntoViewIfNeeded();
  const before = official(id, f.patient), bounds = await open.boundingBox();
  expect(bounds).not.toBeNull();
  const reference = await page.request.get(`/api/documents/${id}`);
  expect(reference.ok()).toBe(true);
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const target = `**/api/documents/${id}`;
  await page.route(target, async route => {
    if (route.request().method() !== "GET") return route.continue();
    entered();
    await held;
    await route.fulfill({ response: reference });
  });
  try {
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    await page.mouse.down();
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await started;
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await page.mouse.up();
    await expect(page.getByRole("tab", { name: "Aquisição", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(field(page, f.document.lines[0].id)).toBeEnabled();
    expect(official(id, f.patient)).toBe(before);
  } finally {
    await page.mouse.up();
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("COM retoma aprovação aquisição e chegada entre sessões e recupera uma aquisição sem duplicar fato", async ({
  page,
  browser,
}, info) => {
  const f = await fixture(),
    id = f.document.id,
    line = f.document.lines[0].id;
  await login(page, f.patient);
  for (const label of [
    "Aprovar itens",
    "Registrar aquisição",
    "Informar nova chegada",
  ]) {
    await page.goto(`/documentos/${id}`);
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(field(page, line)).toBeEnabled();
    await field(page, line).fill("1,");
    const before = official(id, f.patient),
      saved = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/drafts" &&
          r.request().method() === "POST",
      );
    await page
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    expect((await saved).ok()).toBe(true);
    expect(official(id, f.patient)).toBe(before);
    const peerContext = await browser.newContext({
      baseURL: info.project.use.baseURL,
      viewport: page.viewportSize() ?? undefined,
    });
    try {
      const peer = await peerContext.newPage();
      await login(peer, f.patient);
      await peer.goto(`/documentos/${id}`);
      await peer.getByRole("button", { name: label, exact: true }).click();
      await peer
        .getByRole("button", { name: "Continuar rascunho", exact: true })
        .click();
      await expect(field(peer, line)).toHaveValue("1,");
      expect(official(id, f.patient)).toBe(before);
      await field(peer, line).fill(label === "Aprovar itens" ? "2" : "1");
      await audit(peer, "COM private " + label);
      await peer
        .getByRole("button", { name: "Revisar operação", exact: true })
        .click();
      const review = peer.getByRole("dialog", {
        name: "Revisar operação definitiva",
        exact: true,
      });
      await expect(review).toBeVisible();
      let dropped = false;
      const payloads: unknown[] = [];
      if (label === "Registrar aquisição")
        await peer.route(`**/api/documents/${id}`, async (route) => {
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
      await review
        .getByRole("button", { name: "Confirmar operação", exact: true })
        .click();
      if (label === "Registrar aquisição") {
        await expect(
          review.getByRole("button", {
            name: "Recuperar tentativa",
            exact: true,
          }),
        ).toBeVisible();
        const committed = official(id, f.patient);
        await review
          .getByRole("button", { name: "Recuperar tentativa", exact: true })
          .click();
        await expect(review).toHaveCount(0);
        expect(payloads).toHaveLength(2);
        expect(payloads[1]).toEqual(payloads[0]);
        expect(official(id, f.patient)).toBe(committed);
      } else await expect(review).toHaveCount(0);
    } finally {
      await peerContext.close();
    }
  }
  await page.goto(`/documentos/${id}`);
  await page.getByRole("button", { name: "Registrar aquisição", exact: true }).click();
  const after = official(id, f.patient);
  await page.getByRole("button", { name: "Confirmar resultado e começar novo preenchimento", exact: true }).click();
  await expect(field(page, line)).toHaveValue("");
  expect(official(id, f.patient)).toBe(after);
  expect(
    sql(
      `select coalesce(sum(quantity),0)=1 from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`,
    ),
  ).toBe("t");
});

test("COM compara rascunho obsoleto preserva decimal e exige decisão explícita sobre material ausente", async ({
  page,
}, info) => {
  const f = await fixture();
  let document = await rpc(f.admin, "supply_document_command", {
    p_id: f.document.id,
    p_action: "approve",
    p_body: { lines: [{ lineId: f.document.lines[0].id, quantity: "2" }] },
    p_key: randomUUID(),
    p_version: f.document.version,
  });
  const line = document.lines[0],
    removed = randomUUID();
  await rpc(f.admin, "supply_draft_command", {
    p_patient: f.patient,
    p_kind: "COM",
    p_purpose: "purchase",
    p_target: document.id,
    p_id: null,
    p_expected: null,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: {
        documentVersion: document.version,
        fields: { [line.id]: "1,", [removed]: "0,5" },
        divergentIds: [],
        materials: [
          {
            id: line.id,
            name: line.name_snapshot,
            unit: line.unit_snapshot,
            quantityDecimals: 0,
          },
          {
            id: removed,
            name: "Referência ausente fictícia",
            unit: "unidade",
            quantityDecimals: 1,
          },
        ],
      },
      navigation: { version: 1, stage: "acquisition" },
    },
  });
  document = await rpc(f.admin, "supply_document_command", {
    p_id: document.id,
    p_action: "purchase",
    p_body: { lines: [{ lineId: line.id, quantity: "1" }] },
    p_key: randomUUID(),
    p_version: document.version,
  });
  const before = official(document.id, f.patient);
  await login(page, f.patient);
  await page.goto(`/documentos/${document.id}`);
  await page
    .getByRole("button", { name: "Registrar aquisição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(field(page, line.id)).toHaveValue("1,");
  await expect(
    page.getByRole("button", { name: "Revisar operação", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Comparar referência da operação",
      exact: true,
    })
    .click();
  const comparison = page.getByRole("region", {
    name: "Comparação da referência da operação",
    exact: true,
  });
  await expect(
    comparison.getByText("Referência ausente fictícia: 0,5 unidade", {
      exact: true,
    }),
  ).toBeVisible();
  await audit(page, "COM comparison with preserved missing material");
  await info.attach("comparacao-operacao-com", { body: await page.screenshot({ fullPage: false, animations: "disabled" }), contentType: "image/png" });
  const adopt = comparison.getByRole("button", {
    name: "Usar referência vigente e manter preenchimento",
    exact: true,
  });
  await expect(adopt).toBeDisabled();
  expect(official(document.id, f.patient)).toBe(before);
  await comparison
    .getByRole("button", {
      name: "Retirar estes valores do preenchimento privado",
      exact: true,
    })
    .click();
  await adopt.click();
  await expect(field(page, line.id)).toHaveValue("1,");
  await field(page, line.id).fill("1");
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
  await review
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(review).toHaveCount(0);
  await selectDocumentSection(page, "workflow");
  expect(
    sql(
      `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`,
    ),
  ).toBe("0");
});
