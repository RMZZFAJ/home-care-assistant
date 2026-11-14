import {
  expect,
  test,
  type Page,
  type APIResponse,
  type Locator,
} from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(
  page: Page,
  patient: string,
  role: "professional" | "adminA",
) {
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
const detail = (page: Page) =>
  page.locator('section[aria-label="Detalhe do relato"]');

async function prepareDecision(dialog: Locator) {
  await dialog
    .getByRole("button", { name: "Revisar confirmação", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Resumo da decisão", exact: true }),
  ).toBeVisible();
}
test("consumo recupera a própria confirmação após perder escrita, mas nova decisão e perda de leitura continuam bloqueadas", async ({
  page,
}) => {
  const f = await setup(),
    id = await seedReport(f);
  await login(page, f.patient, "adminA");
  await page.goto(`/consumo?careRecipientId=${f.patient}&ref=${id}&refKind=report`);
  await detail(page)
    .getByRole("button", { name: "Conferir consumo", exact: true })
    .click();
  const decision = page.getByRole("dialog", {
      name: "Revisar confirmação do consumo",
      exact: true,
    }),
    attempts: Record<string, unknown>[] = [];
  await prepareDecision(decision);
  await page.route("**/api/consumption/preparations/commit", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const result = await route.fetch();
      expect(result.ok(), await result.text()).toBe(true);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'stock.family.manage',false);`,
      );
      await route.abort("failed");
    } else await route.continue();
  });
  await decision
    .getByRole("button", { name: "Confirmar consumo e descontar", exact: true })
    .click();
  await expect(
    decision.getByRole("button", { name: "Voltar sem decidir", exact: true }),
  ).toBeDisabled();
  await expect(
    decision.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  await expect(
    decision.getByRole("button", { name: "Recuperar decisão", exact: true }),
  ).toBeEnabled();
  const context = (await (await page.request.get("/api/context")).json()).data;
  expect(
    context.patients.find((p: { id: string }) => p.id === f.patient)
      .capabilities["stock.family.manage"],
  ).toBe(false);
  await decision
    .getByRole("button", { name: "Recuperar decisão", exact: true })
    .click();
  await expect(decision).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await expect(
    detail(page).getByText(
      "Consumo confirmado: 1 unidade descontado da família.",
      { exact: true },
    ),
  ).toBeVisible();
  const before = sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  const result = await page.request.get("/api/consumption/" + id);
  expect(result.ok()).toBe(true);
  const data = (await result.json()).data;
  expect(data.movements).toHaveLength(1);
  expect(data.decision.actor_id).toBe(fixtures.adminA.id);
  const fresh = await page.request.post("/api/consumption", {
    data: {
      ...(attempts[0].command as Record<string, unknown>),
      idempotencyKey: randomUUID(),
    },
  });
  expect(fresh.status()).toBe(403);
  expect(
    sql(
      `select count(*) from public.consumption_report_decisions where report_id=${sqlLiteral(id)};`,
    ),
  ).toBe("1");
  expect(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe(before);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'stock.family.read',false);`,
  );
  expect(
    (
      await page.request.post("/api/consumption", { data: attempts[0].command })
    ).status(),
  ).toBe(403);
  const denied = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/consumption/${id}` &&
      response.request().method() === "GET" &&
      response.status() === 403,
  );
  await detail(page)
    .getByRole("button", { name: "Atualizar relato", exact: true })
    .click();
  await denied;
  await expect(
    detail(page).getByRole("heading", {
      name: "Relato original · versão 1",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    detail(page).getByText(
      "Consumo confirmado: 1 unidade descontado da família.",
      { exact: true },
    ),
  ).toHaveCount(0);
  expect(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe(before);
});
test("consumo recupera complemento próprio já conferido por outra pessoa sem reabrir o relato ou repetir movimentos", async ({
  page,
}) => {
  const f = await setup(),
    id = await seedReport(f),
    reviewer = await actor("global", f.patient);
  await login(page, f.patient, "adminA");
  await page.goto("/consumo?ref=" + id);
  await detail(page)
    .getByRole("button", { name: "Adicionar complemento", exact: true })
    .click();
  await page
    .getByLabel("Esclarecimento do complemento", { exact: true })
    .fill(
      "Complemento próprio que permanece imutável após a conferência independente",
    );
  await page
    .getByRole("button", { name: "Revisar complemento", exact: true })
    .click();
  const attempts: Record<string, unknown>[] = [];
  await page.route("**/api/consumption/preparations/commit", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      const saved = (await response.json()).data.consumedResult.report;
      await rpc(reviewer, "decide_consumption_report", {
        p_id: id,
        p_accept: true,
        p_reason: null,
        p_version: saved.version,
        p_key: randomUUID(),
      });
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'consumption.report',false);`,
      );
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", {
      name: "Salvar complemento sem desconto",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar tentativa", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Recuperar tentativa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  await expect(
    detail(page).getByText(
      /Complemento anterior recuperado\. Estado atual: confirmado\./,
    ),
  ).toBeVisible();
  const response = await page.request.get("/api/consumption/" + id),
    data = (await response.json()).data;
  expect(data.status).toBe("confirmed");
  expect(data.revisions).toHaveLength(1);
  expect(data.revisions[0].actor_id).toBe(fixtures.adminA.id);
  expect(data.decision.actor_id).toBe(fixtures.global.id);
  expect(data.movements).toHaveLength(1);
  expect(Number(data.movements[0].quantity)).toBe(1);
});

async function seedReport(
  f: Awaited<ReturnType<typeof setup>>,
  kind = "consumption",
  lines = true,
) {
  return rpc(f.admin, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: kind,
    p_location: "FAMILY",
    p_text: "Relato fictício preservado para decisão",
    p_lines: lines ? [{ productId: f.products[0], quantity: "1" }] : [],
    p_key: randomUUID(),
  });
}

test("consumo textual recebe complemento próprio, revisão em leitura e confirmação recuperável com débito único e outra sessão atualizada", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150_000);
  const f = await setup(),
    professional = await actor("professional", f.patient);
  let delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      recipientReason: "Escolha manual fictícia para este recebimento",
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      lines: [{ productId: f.products[0], quantity: "5" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  delivery = await rpc(professional, "supply_document_command", {
    p_id: delivery.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: delivery.version,
  });
  expect(delivery.status).toBe("confirmed");
  expect(Number(delivery.lines[0].accepted_quantity)).toBe(5);
  expect(delivery.lines[0].fully_checked).toBe(true);
  await login(page, f.patient, "professional");
  await page.goto("/consumo");
  await page
    .getByRole("button", { name: "Registrar ocorrência", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Registrar relato",
    exact: true,
  });
  await expect(
    page.getByRole("dialog", { name: "Registrar relato", exact: true }),
  ).toBeVisible();
  await drawer
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("consumption");
  await drawer
    .getByRole("combobox", { name: "Custódia", exact: true })
    .selectOption("CARE_TEAM");
  await expect(
    drawer
      .getByRole("combobox", { name: "Custódia", exact: true })
      .locator('option[value="FAMILY"]'),
  ).toHaveCount(0);
  await drawer
    .getByLabel("O que aconteceu?", { exact: true })
    .fill(
      "Usamos material fictício durante o cuidado, sem quantidade inicial.",
    );
  await drawer
    .getByRole("button", { name: "Revisar relato", exact: true })
    .click();
  const review = page.getByRole("region", {
    name: "Revisão do relato",
    exact: true,
  });
  await expect(review.locator("input,textarea,select")).toHaveCount(0);
  const reportPayloads: unknown[] = [];
  await page.route("**/api/consumption/preparations/commit", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    reportPayloads.push(route.request().postDataJSON());
    if (reportPayloads.length === 1) {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await review
    .getByRole("button", { name: "Registrar relato sem desconto", exact: true })
    .click();
  await expect(
    review.getByRole("button", { name: "Voltar à edição", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  await review
    .getByRole("button", { name: "Recuperar tentativa", exact: true })
    .click();
  await page.unroute("**/api/consumption/preparations/commit");
  expect(reportPayloads).toHaveLength(2);
  expect(reportPayloads[0]).toEqual(reportPayloads[1]);
  await expect(
    detail(page).getByRole("heading", {
      name: "Relato e conferência",
      exact: true,
    }),
  ).toBeFocused();
  const id = new URL(page.url()).searchParams.get("ref")!;
  const before = sql(
    `select coalesce(sum(quantity),0)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`,
  );
  expect(before).toBe("0");
  await detail(page)
    .getByRole("button", { name: "Adicionar complemento", exact: true })
    .click();
  await page
    .getByLabel("Esclarecimento do complemento", { exact: true })
    .fill("Esclarecimento próprio: foram duas unidades do material fictício.");
  const material = page.getByRole("combobox", {
    name: "Adicionar material",
    exact: true,
  });
  const materialBefore = await material.boundingBox();
  await material.click();
  await expect(material).toBeInViewport({ ratio: 1 });
  await material.fill("Material fictício V4 0");
  await material.press("ArrowDown");
  const option = page
    .getByRole("option")
    .filter({ hasText: "Material fictício V4 0 · unidade" });
  await expect(option).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() =>
      option.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        return hit === element || Boolean(hit && element.contains(hit));
      }),
    )
    .toBe(true);
  await test.info().attach("consumption-material-pointer", {
    body: JSON.stringify(
      {
        before: materialBefore,
        after: await material.boundingBox(),
        option: await option.boundingBox(),
        viewport: page.viewportSize(),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await option.click();
  await page
    .getByRole("textbox", {
      name: "Material fictício V4 0 · quantidade em unidade",
      exact: true,
    })
    .fill("2,0");
  await page
    .getByRole("button", { name: "Revisar complemento", exact: true })
    .click();
  await expect(
    review.getByRole("heading", { name: "Revisar complemento", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    review.getByRole("button", { name: "Voltar à edição", exact: true }),
  ).toBeFocused();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "consumption supplement review " + width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/consumption-review-${info.project.name}.png`,
    animations: "disabled",
  });
  await review
    .getByRole("button", {
      name: "Salvar complemento sem desconto",
      exact: true,
    })
    .click();
  await expect(
    detail(page).getByRole("heading", {
      name: "Complemento · versão 2",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    sql(
      `select coalesce(sum(quantity),0)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`,
    ),
  ).toBe(before);
  const adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage();
  try {
    await login(adminPage, f.patient, "adminA");
    await adminPage.goto("/consumo?ref=" + id);
    await detail(adminPage)
      .getByRole("button", { name: "Conferir consumo", exact: true })
      .click();
    const decision = adminPage.getByRole("dialog", {
      name: "Revisar confirmação do consumo",
      exact: true,
    });
    await prepareDecision(decision);
    await expect(decision.locator("input,textarea,select")).toHaveCount(0);
    await expect(
      decision.getByText("Material fictício V4 0", { exact: true }),
    ).toBeVisible();
    const decisions: unknown[] = [];
    await adminPage.route(
      "**/api/consumption/preparations/commit",
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        decisions.push(route.request().postDataJSON());
        if (decisions.length === 1) {
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      },
    );
    await decision
      .getByRole("button", {
        name: "Confirmar consumo e descontar",
        exact: true,
      })
      .click();
    await expect(
      decision.getByRole("button", { name: "Voltar sem decidir", exact: true }),
    ).toBeDisabled();
    await expect(
      decision.getByRole("button", { name: "Fechar edição", exact: true }),
    ).toBeDisabled();
    await decision
      .getByRole("button", { name: "Recuperar decisão", exact: true })
      .click();
    await expect(decision).toHaveCount(0);
    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toEqual(decisions[1]);
    await expect(
      detail(adminPage).getByText(
        "Consumo confirmado: 2 unidade descontado da equipe.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      detail(adminPage).getByRole("heading", {
        name: "Relato e conferência",
        exact: true,
      }),
    ).toBeFocused();
    await expect(
      detail(page).getByText(
        "Consumo confirmado com movimentos vinculados ao relato.",
        { exact: true },
      ),
    ).toBeVisible();
    const result = await rpc(professional, "consumption_report", { p_id: id });
    expect(result.reported_by).toBe(fixtures.professional.id);
    expect(result.revisions[0].actor_id).toBe(fixtures.professional.id);
    expect(result.decision.actor_id).toBe(fixtures.adminA.id);
    expect(result.movements).toHaveLength(1);
    expect(Number(result.movements[0].quantity)).toBe(2);
    expect(
      sql(
        `select count(*) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`,
      ),
    ).toBe("1");
    expect(
      sql(
        `select count(*) from public.consumption_report_decisions where report_id=${sqlLiteral(id)};`,
      ),
    ).toBe("1");
    await audit(page, "consumption confirmed detail 320");
    await page.screenshot({
      path: `output/playwright/phase-d/consumption-confirmed-${info.project.name}.png`,
      animations: "disabled",
    });
  } finally {
    await adminContext.close();
  }
});

test("consumo compara complemento concorrente e só decide após nova revisão da versão atual", async ({
  page,
}) => {
  const f = await setup(),
    id = await seedReport(f),
    family = await actor("family", f.patient);
  await login(page, f.patient, "adminA");
  await page.goto("/consumo?ref=" + id);
  // Controlled stale client:the reviewed response stays visible while native facts change.
  // This proves the database guard even when the UI has not received a newer reference.
  let reviewedReference: unknown = null,
    holdReviewedReference = true;
  await page.route(
    "**/api/consumption/preparations/reference",
    async (route) => {
      try {
        if (holdReviewedReference && reviewedReference)
          return await route.fulfill({
            status: 200,
            headers: { "Cache-Control": "no-store" },
            json: reviewedReference,
          });
        const response = await route.fetch();
        expect(response.ok(), await response.text()).toBe(true);
        const body = await response.json();
        reviewedReference ??= body;
        await route.fulfill({ response, json: body });
      } catch {
        /* Superseded reads can be aborted;accepted UI state and native effects remain the oracles. */
      }
    },
  );
  await detail(page)
    .getByRole("button", { name: "Conferir consumo", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar confirmação do consumo",
    exact: true,
  });
  await prepareDecision(dialog);
  await expect(
    dialog.getByRole("button", {
      name: "Confirmar consumo e descontar",
      exact: true,
    }),
  ).toBeEnabled();
  await rpc(family, "supplement_consumption_report", {
    p_id: id,
    p_text: "Outro familiar esclareceu duas unidades",
    p_lines: [{ productId: f.products[0], quantity: "2.000000" }],
    p_version: 1,
    p_key: randomUUID(),
  });
  const payloads: {
    command: { expectedVersion: number };
    idempotencyKey: string;
  }[] = [];
  await page.route("**/api/consumption/preparations/commit", async (route) => {
    if (route.request().method() === "POST")
      payloads.push(route.request().postDataJSON());
    const response = await route.fetch();
    holdReviewedReference = false;
    await route.fulfill({ response });
  });
  await dialog
    .getByRole("button", { name: "Confirmar consumo e descontar", exact: true })
    .click();
  await expect(
    dialog.getByText("O relato recebeu um complemento.", { exact: false }),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`,
    ),
  ).toBe("0");
  await expect(
    dialog.getByRole("button", {
      name: "Confirmar consumo e descontar",
      exact: true,
    }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", {
      name: "Consultar decisão e versão atuais",
      exact: true,
    })
    .click();
  const comparison = dialog.getByRole("region", {
    name: "Comparação de referência do relato",
    exact: true,
  });
  await expect(
    comparison
      .getByText("Versão atual", { exact: true })
      .locator("..")
      .getByText("2", { exact: true }),
  ).toBeVisible();
  await expect(
    comparison.getByText("Aguardando conferência", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Revisar versão atual", exact: true })
    .click();
  await prepareDecision(dialog);
  await expect(dialog.locator("input,textarea,select")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Confirmar consumo e descontar", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(payloads.map((payload) => payload.command.expectedVersion)).toEqual([
    1, 2,
  ]);
  expect(payloads[0].idempotencyKey).not.toBe(payloads[1].idempotencyKey);
  const result = await rpc(f.admin, "consumption_report", { p_id: id });
  expect(result.decision.version).toBe(2);
  expect(Number(result.movements[0].quantity)).toBe(2);
  expect(result.movements).toHaveLength(1);
  const opposed = await seedReport(f),
    other = await actor("global", f.patient);
  reviewedReference = null;
  holdReviewedReference = true;
  await page.goto("/consumo?ref=" + opposed);
  await detail(page)
    .getByRole("button", { name: "Rejeitar relato", exact: true })
    .click();
  const rejection = page.getByRole("dialog", {
    name: "Revisar rejeição do relato",
    exact: true,
  });
  await rejection
    .getByRole("textbox", { name: "Motivo da rejeição", exact: true })
    .fill("Discordância fictícia preparada antes da outra decisão");
  await rejection
    .getByRole("button", { name: "Revisar rejeição", exact: true })
    .click();
  await expect(
    rejection.getByRole("button", {
      name: "Confirmar rejeição sem desconto",
      exact: true,
    }),
  ).toBeEnabled();
  await rpc(other, "decide_consumption_report", {
    p_id: opposed,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  await rejection
    .getByRole("button", {
      name: "Confirmar rejeição sem desconto",
      exact: true,
    })
    .click();
  await expect(
    rejection.getByText("Outro responsável já decidiu esta versão.", {
      exact: false,
    }),
  ).toBeVisible();
  await rejection
    .getByRole("button", {
      name: "Consultar decisão e versão atuais",
      exact: true,
    })
    .click();
  const decided = rejection.getByRole("region", {
    name: "Comparação de referência do relato",
    exact: true,
  });
  await expect(
    decided
      .getByText("Versão atual", { exact: true })
      .locator("..")
      .getByText("1", { exact: true }),
  ).toBeVisible();
  await expect(decided.getByText("Confirmado", { exact: true })).toBeVisible();
  await rejection
    .getByRole("button", { name: "Abrir resultado registrado", exact: true })
    .click();
  await expect(rejection).toHaveCount(0);
  const firstDecision = await rpc(f.admin, "consumption_report", {
    p_id: opposed,
  });
  expect(firstDecision.status).toBe("confirmed");
  expect(firstDecision.decision.actor_id).toBe(fixtures.global.id);
  expect(firstDecision.movements).toHaveLength(1);
  expect(Number(firstDecision.movements[0].quantity)).toBe(1);
});

test("falta conferida e rejeição motivada têm revisões próprias e nenhuma baixa de estoque", async ({
  page,
}) => {
  const f = await setup(),
    shortage = await seedReport(f, "shortage");
  await login(page, f.patient, "adminA");
  await page.goto("/consumo?ref=" + shortage);
  await detail(page)
    .getByRole("button", { name: "Conferir falta", exact: true })
    .click();
  const shortageDialog = page.getByRole("dialog", {
    name: "Revisar confirmação da falta",
    exact: true,
  });
  await prepareDecision(shortageDialog);
  await expect(
    shortageDialog.getByText(
      "Confirmar esta falta registra a conferência da necessidade, sem descontar estoque.",
      { exact: true },
    ),
  ).toBeVisible();
  await shortageDialog
    .getByRole("button", { name: "Confirmar falta sem desconto", exact: true })
    .click();
  await expect(shortageDialog).toHaveCount(0);
  await expect(
    detail(page).getByText("Falta conferida, sem desconto de estoque.", {
      exact: true,
    }),
  ).toBeVisible();
  const consumption = await seedReport(f, "consumption", false);
  await page.goto("/consumo?ref=" + consumption);
  await expect(
    detail(page).getByRole("button", { name: "Conferir consumo", exact: true }),
  ).toBeDisabled();
  await detail(page)
    .getByRole("button", { name: "Rejeitar relato", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar rejeição do relato",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Motivo da rejeição", { exact: true }),
  ).toHaveValue("");
  await dialog
    .getByLabel("Motivo da rejeição", { exact: true })
    .fill("Material e quantidade não comprovados no relato fictício");
  await dialog
    .getByRole("button", { name: "Revisar rejeição", exact: true })
    .click();
  await expect(dialog.locator("input,textarea,select")).toHaveCount(0);
  await dialog
    .getByRole("button", {
      name: "Confirmar rejeição sem desconto",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    detail(page).getByText(
      "Relato rejeitado, sem desconto. Original e complementos foram preservados.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`,
    ),
  ).toBe("0");
  const result = await rpc(f.admin, "consumption_report", {
    p_id: consumption,
  });
  expect(result.body).toBe("Relato fictício preservado para decisão");
  expect(result.decision.reason).toBe(
    "Material e quantidade não comprovados no relato fictício",
  );
});

test("relato anterior ao centésimo é acessível por referência e por todas as páginas, sem vazio falso em falha de leitura", async ({
  page,
}) => {
  const f = await setup(),
    old = await seedReport(f, "shortage", false);
  sql(
    `insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) select ${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'shortage','FAMILY','Registro histórico fictício para paginação '||n,'[]'::jsonb,gen_random_uuid() from generate_series(1,101)n;`,
  );
  const order: string[] = JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id desc) from public.consumption_reports where care_recipient_id=${sqlLiteral(f.patient)};`));
  await login(page, f.patient, "adminA");
  let fail = true;
  await page.route("**/api/consumption?*", async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "DATABASE_UNAVAILABLE",
          error: "Falha controlada na consulta de relatos",
        }),
      });
    } else await route.continue();
  });
  await page.goto("/consumo?ref=" + old);
  await expect(
    page.getByText("Falha controlada na consulta de relatos", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhum relato encontrado para estes filtros.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    detail(page).getByText("Relato fictício preservado para decisão", {
      exact: true,
    }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Abrir relato / }),
  ).toHaveCount(20);
  const visibleIds = () => page.getByRole("button", { name: /^Abrir relato / }).evaluateAll(nodes => nodes.map(node => node.querySelector(".sr-only")!.textContent));
  for (let size = 20; size < order.length; size += 20) {
    await expect.poll(visibleIds).toEqual(order.slice(0, size));
    await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click();
  }
  await expect.poll(visibleIds).toEqual(order);
  await expect(page.getByRole("button", { name: "Carregar mais relatos", exact: true })).toHaveCount(0);
  let next: null | { at: string; id: string } = null;
  const found = new Set<string>();
  let pages = 0;
  do {
    const query: URLSearchParams = new URLSearchParams({
      careRecipientId: f.patient,
      ...(next ? { beforeAt: next.at, beforeId: next.id } : {}),
    });
    const response: APIResponse = await page.request.get(
      "/api/consumption?" + query,
    );
    expect(response.ok()).toBe(true);
    const result: {
      data: { id: string }[];
      next: null | { at: string; id: string };
    } = await response.json();
    if (pages === 0)
      expect(result.data.some((row) => row.id === old)).toBe(false);
    for (const row of result.data) {
      expect(found.has(row.id)).toBe(false);
      found.add(row.id);
    }
    next = result.next;
    pages++;
    expect(pages).toBeLessThan(8);
  } while (next);
  expect(found.size).toBe(102);
  expect(found.has(old)).toBe(true);
  expect([...found]).toEqual(order);
  await page.unroute("**/api/consumption?*");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("shortage");
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(page).toHaveURL(/kind=shortage/);
  await detail(page)
    .getByRole("button", { name: "Voltar à lista", exact: true })
    .click();
  await expect(page).not.toHaveURL(/ref=/);
  await expect(
    page.getByRole("combobox", { name: "Tipo", exact: true }),
  ).toHaveValue("shortage");
  const day = sql(`select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM-DD') from public.consumption_reports where id=${sqlLiteral(old)};`);
  await page.getByRole("textbox", { name: "Buscar no relato original", exact: true }).fill("Relato fictício preservado para decisão");
  await page.getByLabel("Desde", { exact: true }).fill(day);
  await page.getByLabel("Até", { exact: true }).fill(day);
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page).toHaveURL(/q=Relato/);
  await expect.poll(visibleIds).toEqual([old]);
  await page.reload(); await expect.poll(visibleIds).toEqual([old]);
  await expect(page.getByLabel("Desde", { exact: true })).toHaveValue(day);
  await expect(page.getByLabel("Até", { exact: true })).toHaveValue(day);
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("confirmed");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toBeVisible();
  expect((await page.request.get(`/api/consumption?careRecipientId=${f.patient}&from=2026-11-12&to=2026-11-11`)).status()).toBe(400);
});
