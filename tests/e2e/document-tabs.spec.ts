import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  setup,
  issue,
  delivery,
  actor,
  rpc,
  fixtures,
} from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection, openDocumentMore } from "./document-sections";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);

test("Abas comparam tipografia, espaçamento e navegação fixa ao HTML canônico em cinco larguras", async ({
  page,
  browser,
}, info) => {
  const f = await setup(),
    req = await issue(f.patient, f.products);
  await login(page, f.patient);
  await page.goto(`/documentos/${req.id}`);
  await selectDocumentSection(page, "materials");
  const reference = await browser.newContext({ serviceWorkers: "block" });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, (route) => route.abort());
    await model.goto(
      pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href +
        "#ficha/REQ-0003",
    );
    await model.getByRole("tab", { name: /^Materiais/ }).click();
    const properties = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(
        [
          "display",
          "gap",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "color",
          "background-color",
          "padding",
          "min-height",
          "border-bottom",
          "position",
          "top",
          "margin-top",
          "margin-bottom",
          "overflow-x",
        ].map((name) => [name, style.getPropertyValue(name)]),
      );
    };
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await model.setViewportSize({ width, height: 900 });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
      );
      await model.evaluate(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
      );
      expect(
        await page
          .getByRole("tab", { name: "Materiais", exact: true })
          .evaluate(properties),
      ).toEqual(
        await model
          .getByRole("tab", { name: /^Materiais/ })
          .evaluate(properties),
      );
      const styleProperties = (element: Element, keys: string[]) =>
        Object.fromEntries(
          keys.map((key) => [
            key,
            getComputedStyle(element).getPropertyValue(key),
          ]),
        );
      const pairs: [string, string, string[]][] = [
        [
          ".hca-document-header",
          ".doc-hero",
          [
            "background-color",
            "border",
            "border-radius",
            "box-shadow",
            "overflow",
            "font-size",
            "line-height",
          ],
        ],
        [
          ".hca-document-identity",
          ".hero-id",
          ["display", "gap", "align-items", "justify-content", "padding"],
        ],
        [
          ".hca-document-name",
          ".hero-name",
          ["display", "gap", "align-items", "min-width"],
        ],
        [
          "[data-document-heading]",
          ".hero-name h1",
          [
            "font-family",
            "font-size",
            "font-weight",
            "line-height",
            "letter-spacing",
            "color",
          ],
        ],
        [
          ".hca-document-type",
          ".doctype",
          [
            "display",
            "width",
            "height",
            "border-radius",
            "background-color",
            "color",
            "font-size",
            "font-weight",
          ],
        ],
        [
          ".hca-document-meta",
          ".hero-meta",
          ["display", "gap", "padding", "margin", "grid-template-columns"],
        ],
        [
          ".hca-document-meta dt",
          ".hero-meta dt",
          [
            "font-size",
            "text-transform",
            "letter-spacing",
            "color",
            "margin-bottom",
          ],
        ],
        [
          ".hca-document-meta dd",
          ".hero-meta dd",
          ["font-size", "font-weight", "line-height", "margin"],
        ],
        [
          ".hca-document-macro",
          ".macro",
          ["background-color", "border-top", "padding"],
        ],
        [
          ".hca-document-macro-heading",
          ".macro-top",
          [
            "display",
            "justify-content",
            "align-items",
            "gap",
            "font-size",
            "margin-bottom",
          ],
        ],
        [
          ".hca-milestone-track",
          ".step-track",
          ["height", "border-radius", "background-color", "margin-bottom"],
        ],
        [
          ".hca-milestone-title",
          ".step-title",
          ["display", "font-size", "font-weight", "gap"],
        ],
        [
          ".hca-document-milestones li > p",
          ".step-sub",
          ["font-size", "line-height", "color", "margin-top", "margin-left"],
        ],
        [
          ".hca-document-action-bar",
          ".doc-actions",
          [
            "display",
            "gap",
            "align-items",
            "justify-content",
            "flex-wrap",
            "margin-top",
          ],
        ],
      ];
      for (const [actualSelector, modelSelector, keys] of pairs)
        expect(
          await page
            .locator(actualSelector)
            .first()
            .evaluate(styleProperties, keys),
          actualSelector + " " + width,
        ).toEqual(
          await model
            .locator(modelSelector)
            .first()
            .evaluate(styleProperties, keys),
        );
      const expected = await model.getByRole("tablist").evaluate(properties);
      // The real mobile patient selector is an approved additional 51px row.
      if (width <= 850)
        expected.top = `${Number.parseFloat(expected.top) + 51}px`;
      expect(await page.getByRole("tablist").evaluate(properties)).toEqual(
        expected,
      );
      await info.attach("abas-modelo-" + width, {
        body: await model.screenshot(),
        contentType: "image/png",
      });
      await info.attach("abas-reais-" + width, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    }
  } finally {
    await reference.close();
  }
});

async function login(page: Page, patient: string, role = "family") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const official = (id: string, patient: string) =>
  sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(id)}),
 'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)}),
 'pdf',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(id)}),'science',(select count(*) from public.requisition_science_events where requisition_id=${sqlLiteral(id)}))::text;`);

test("Abas REQ COM ENT BAL preservam conteúdo, autorização, teclado e navegação sem novos efeitos", async ({
  page,
}, info) => {
  const f = await setup(),
    req = await issue(f.patient, f.products),
    ent = await delivery(f.patient, req, f.products),
    family = await actor("family", f.patient);
  const com = await rpc(family, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "1" }],
    },
  });
  await actor("adminA", f.patient);
  const bal = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_key: randomUUID(),
    p_draft: false,
    p_payload: {
      lines: f.products.map((productId: string) => ({
        productId,
        quantity: "2",
      })),
    },
  });
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'audit.read',false);`,
  );
  await login(page, f.patient);
  for (const [type, id] of [
    ["REQ", req.id],
    ["COM", com.id],
    ["ENT", ent.id],
    ["BAL", bal.id],
  ]) {
    const opening =
      type === "REQ"
        ? page.waitForResponse(
            (r) =>
              r.url().includes(`/api/requisitions/${id}/openings`) &&
              r.request().method() === "POST",
          )
        : null;
    await page.goto(
      `/documentos/${id}?careRecipientId=${f.patient}&documentTab=audit`,
    );
    if (opening) await (await opening).finished();
    await expect(
      page.getByRole("tab", { name: "Visão geral", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: "Auditoria", exact: true }),
    ).toHaveCount(0);
    const before = official(id, f.patient),
      writes: string[] = [];
    const record = (r: import("@playwright/test").Request) => {
      if (new URL(r.url()).pathname.startsWith("/api/") && r.method() !== "GET")
        writes.push(r.method() + " " + new URL(r.url()).pathname);
    };
    page.on("request", record);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const more = page.getByRole("button", { name: "Mais", exact: true });
    await more.click();
    const identifiers = page.locator(".hca-document-identifiers");
    await expect(identifiers).toContainText(id);
    await expect(
      identifiers.getByRole("heading", {
        name: "Protocolo e identificação",
        exact: true,
      }),
    ).toBeVisible();
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            (window as unknown as { copiedReference: string }).copiedReference =
              value;
          },
        },
      }),
    );
    await identifiers
      .getByRole("button", { name: "Copiar referência", exact: true })
      .click();
    await expect(identifiers.getByRole("status")).toHaveText(
      "Referência copiada.",
    );
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { copiedReference: string }).copiedReference,
      ),
    ).toBe(
      sql(
        `select code from public.operational_documents where id=${sqlLiteral(id)};`,
      ),
    );
    await identifiers.press("Escape");
    await expect(identifiers).toHaveCount(0);
    await expect(more).toBeFocused();
    await selectDocumentSection(page, "materials");
    await expect(page.getByRole("tabpanel")).toContainText(
      "Material fictício V4 0",
    );
    await selectDocumentSection(page, "workflow");
    await expect(page.getByRole("tabpanel")).not.toBeEmpty();
    await selectDocumentSection(page, "communications");
    if (type === "REQ")
      await expect(page.getByRole("tabpanel")).toContainText(
        "Avisos e acompanhamento",
      );
    else
      await expect(
        page.getByRole("region", {
          name: "Notificações da ficha",
          exact: true,
        }),
      ).toBeVisible();
    await selectDocumentSection(page, "files");
    await expect(
      page.getByRole("region", { name: "Arquivos gerados", exact: true }),
    ).toBeVisible();
    await selectDocumentSection(page, "attachments");
    await expect(
      page.getByRole("button", { name: "Anexos e ficha física", exact: true }),
    ).toBeVisible();
    await selectDocumentSection(page, "history");
    await expect(
      page.getByRole("button", {
        name: type === "REQ" ? "Linha do tempo" : "Versões e integridade",
        exact: true,
      }),
    ).toBeVisible();
    await selectDocumentSection(page, "overview");
    const overview = page.getByRole("tab", {
      name: "Visão geral",
      exact: true,
    });
    await overview.focus();
    await overview.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Materiais", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("tab", { name: "Materiais", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel")).toBeFocused();
    expect(new URL(page.url()).searchParams.get("careRecipientId")).toBe(
      f.patient,
    );
    expect(new URL(page.url()).searchParams.get("documentTab")).toBe(
      "materials",
    );
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      // Each resize starts at the document's reading origin. A previous scroll
      // position can otherwise leave the last hero action sliced by the header.
      await page.evaluate(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
      );
      await audit(page, type + " abas " + width);
    }
    await info.attach(type + "-abas", {
      body: await page.locator(".hca-document-tabs").screenshot(),
      contentType: "image/png",
    });
    page.off("request", record);
    expect(writes).toEqual([]);
    expect(official(id, f.patient)).toBe(before);
  }
});

test("Abas conservam conferência ENT não salva e recuperam seleção por URL e histórico sem conceder auditoria", async ({
  page,
}) => {
  const f = await setup(),
    req = await issue(f.patient, f.products),
    ent = await delivery(f.patient, req, f.products);
  await login(page, f.patient, "professional");
  await page.goto(
    `/documentos/${ent.id}?careRecipientId=${f.patient}&documentTab=invalid`,
  );
  await expect(
    page.getByRole("tab", { name: "Visão geral", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Informar divergência", exact: true })
    .click();
  const editor = page.getByRole("region", {
    name: "Conferência pessoal em preparação",
    exact: true,
  });
  await editor
    .getByRole("checkbox", { name: /Material fictício V4 0/ })
    .check();
  await editor
    .getByRole("textbox", { name: "Efetivamente recebido", exact: true })
    .fill("1,");
  await editor
    .getByRole("textbox", { name: "Observações da divergência", exact: true })
    .fill("Edição fictícia entre abas");
  const before = official(ent.id, f.patient);
  await selectDocumentSection(page, "overview");
  await expect(editor).not.toBeVisible();
  await selectDocumentSection(page, "materials");
  await selectDocumentSection(page, "workflow");
  await expect(
    editor.getByRole("textbox", { name: "Efetivamente recebido", exact: true }),
  ).toHaveValue("1,");
  await expect(
    editor.getByRole("textbox", {
      name: "Observações da divergência",
      exact: true,
    }),
  ).toHaveValue("Edição fictícia entre abas");
  expect(official(ent.id, f.patient)).toBe(before);
  await selectDocumentSection(page, "files");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Arquivos gerados", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto(
    `/documentos/${ent.id}?historyVersion=1&careRecipientId=${f.patient}`,
  );
  await expect(
    page.getByRole("tab", { name: "Versões e integridade", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("article", {
      name: "Conteúdo preservado da versão 1",
      exact: true,
    }),
  ).toBeVisible();
});

test("REQ retira conteúdo recusado e conserva foco de recuperação sem alterar fatos documentais", async ({
  page,
}) => {
  const f = await setup(),
    req = await issue(f.patient, f.products);
  await login(page, f.patient);
  await page.goto(`/documentos/${req.id}`);
  await selectDocumentSection(page, "materials");
  const before = official(req.id, f.patient),
    refresh = page.getByRole("button", {
      name: "Atualizar ficha",
      exact: true,
    });
  for (const status of [503, 403]) {
    await page.route(
      `**/api/requisitions/${req.id}`,
      (route) =>
        route.fulfill({
          status,
          json: {
            error: "Consulta REQ recusada ou indisponível fictícia",
            code: "READ_UNAVAILABLE",
          },
        }),
      { times: 1 },
    );
    await refresh.focus();
    await refresh.press("Enter");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Consulta REQ recusada ou indisponível fictícia" }),
    ).toContainText("Consulta REQ recusada ou indisponível fictícia");
    const retry =
      status === 403
        ? page.getByRole("button", {
            name: "Tentar carregar requisição",
            exact: true,
          })
        : refresh;
    if (status === 403) {
      await expect(page.locator(".hca-document-header")).toHaveCount(0);
      await expect(
        page.getByText("Material fictício V4 0", { exact: false }),
      ).toHaveCount(0);
    }
    await expect(retry).toBeFocused();
    await retry.press("Enter");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: sql(
          `select code from public.operational_documents where id=${sqlLiteral(req.id)};`,
        ),
        exact: true,
      }),
    ).toBeVisible();
    await expect(refresh).toBeFocused();
  }
  expect(official(req.id, f.patient)).toBe(before);
});

test("Mais revisa cancelamento com foco, fecha sem efeito e respeita revogação real", async ({
  page,
}) => {
  const f = await setup(),
    req = await issue(f.patient, f.products);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'req.review',true);`,
  );
  await login(page, f.patient);
  await page.goto(`/documentos/${req.id}`);
  const more = page.getByRole("button", { name: "Mais", exact: true }),
    before = official(req.id, f.patient);
  await more.focus();
  await more.press("Enter");
  await page
    .locator(".hca-document-more-actions")
    .getByRole("button", { name: "Cancelar requisição", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar cancelamento da REQ",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.locator(".hca-document-identifiers")).toHaveCount(0);
  await expect(
    dialog.getByRole("textbox", { name: "Justificativa", exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole("textbox", { name: "Justificativa", exact: true })
    .fill("Motivo fictício ainda não confirmado");
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();
  expect(official(req.id, f.patient)).toBe(before);
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='req.review';`,
  );
  await page.reload();
  await openDocumentMore(page);
  await expect(
    page.getByRole("button", { name: "Cancelar requisição", exact: true }),
  ).toHaveCount(0);
  const denied = await page.request.patch(
    `/api/requisitions/${req.id}/status`,
    {
      data: {
        status: "cancelled",
        reason: "Tentativa fictícia sem capacidade",
      },
    },
  );
  expect(denied.status()).toBe(403);
  expect(official(req.id, f.patient)).toBe(before);
});
