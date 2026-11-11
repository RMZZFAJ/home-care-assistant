import { expect, test, type Page } from "@playwright/test";
import {
  stockPreparationFixture,
  stockPreparationFacts,
} from "../integration/stock-preparation-fixtures.mjs";
import { rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";
test.setTimeout(180_000);
async function login(
  page: Page,
  patient: string,
  role: "adminA" | "professional" = "adminA",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto(
    `/estoque?careRecipientId=${patient}&custody=${role === "professional" ? "CARE_TEAM" : "FAMILY"}`,
  );
}
const panel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const dialog = (page: Page) =>
  page.getByRole("dialog", {
    name: /^(Movimentar estoque familiar|Confirmar movimentação familiar)$/,
  });
async function open(page: Page, consult = false) {
  await page
    .getByRole("button", {
      name: consult
        ? "Consultar meu preenchimento familiar"
        : "Movimentar estoque familiar",
      exact: true,
    })
    .click();
  await expect(dialog(page)).toBeVisible();
}
async function fill(page: Page, product: string, reason: string) {
  await dialog(page)
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption(product);
  await dialog(page).getByLabel("Quantidade", { exact: true }).fill("1");
  await dialog(page).getByLabel("Motivo", { exact: true }).fill(reason);
}
async function save(page: Page) {
  await dialog(page)
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    panel(page).getByText(
      "Salvo no servidor. Este preenchimento ainda não registrou uma decisão.",
      { exact: true },
    ),
  ).toBeVisible();
}

test("movimentação privada retoma em outra sessão,compara saldo e recupera uma única entrada após resposta perdida", async ({
  page,
  browser,
  baseURL,
}, info) => {
  const f = await stockPreparationFixture(),
    before = stockPreparationFacts(f),
    reason =
      "Entrada física própria preservada entre aparelhos,com motivo extenso e revisão explícita.";
  await login(page, f.patient);
  await open(page);
  await fill(page, f.productId, reason);
  await dialog(page).getByLabel("Quantidade", { exact: true }).fill("0,5");
  await dialog(page)
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  await expect(
    dialog(page).getByLabel("Quantidade", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    dialog(page).getByLabel("Quantidade", { exact: true }),
  ).toBeFocused();
  await expect(dialog(page).getByLabel("Motivo", { exact: true })).toHaveValue(
    reason,
  );
  expect(stockPreparationFacts(f)).toEqual(before);
  await dialog(page).getByLabel("Quantidade", { exact: true }).fill("1");
  for (const width of [1440, 1150, 850, 500, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await auditFromTop(page, `stock-private-edit-${width}`);
    if (width === 1440 || width === 320)
      await info.attach(`stock-private-edit-${width}`, {
        body: await dialog(page)
          .locator("form")
          .screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
  }
  const savedPackets: unknown[] = [];
  let loseSave = true;
  await page.route("**/api/stock/preparations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    savedPackets.push(route.request().postDataJSON());
    if (loseSave) {
      loseSave = false;
      const r = await route.fetch();
      expect(r.ok()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await dialog(page)
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await panel(page)
    .getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    })
    .click();
  await expect(
    panel(page).getByText(
      "Salvo no servidor. Este preenchimento ainda não registrou uma decisão.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(savedPackets).toHaveLength(2);
  expect(savedPackets[0]).toEqual(savedPackets[1]);
  await page.unroute("**/api/stock/preparations");
  expect(stockPreparationFacts(f)).toEqual(before);
  await dialog(page)
    .getByRole("button", { name: "Fechar edição", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.productId,
    p_action: "inbound",
    p_quantity: "2",
    p_reason: "Outra entrada real durante o rascunho privado",
    p_key: crypto.randomUUID(),
  });
  const external = stockPreparationFacts(f);
  const next = await browser.newContext({
    baseURL,
    viewport: page.viewportSize()!,
    isMobile: info.project.use.isMobile,
    hasTouch: info.project.use.hasTouch,
    userAgent: info.project.use.userAgent,
  });
  try {
    const resumed = await next.newPage();
    await login(resumed, f.patient);
    await open(resumed, true);
    await expect(panel(resumed)).toContainText(reason);
    await panel(resumed)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await expect(
      dialog(resumed).getByLabel("Quantidade", { exact: true }),
    ).toHaveValue("1");
    await expect(
      dialog(resumed).getByLabel("Motivo", { exact: true }),
    ).toHaveValue(reason);
    await expect(
      dialog(resumed).getByRole("button", {
        name: "Revisar movimentação",
        exact: true,
      }),
    ).toBeDisabled();
    await dialog(resumed)
      .getByRole("button", { name: "Comparar referência atual", exact: true })
      .click();
    const comparison = dialog(resumed).getByRole("region", {
      name: "Comparação da referência de estoque",
      exact: true,
    });
    await expect(comparison).toContainText("saldo 30");
    await expect(comparison).toContainText("saldo 32");
    await comparison
      .getByRole("button", { name: "Usar referência atual", exact: true })
      .click();
    await dialog(resumed)
      .getByRole("button", { name: "Revisar movimentação", exact: true })
      .click();
    const review = resumed.getByRole("region", {
      name: "Revisão da movimentação familiar",
      exact: true,
    });
    await expect(review).toContainText(reason);
    await expect(review).toContainText("1 unidade");
    await expect(
      review.locator("input:visible,textarea:visible,select:visible"),
    ).toHaveCount(0);
    expect(stockPreparationFacts(f)).toEqual(external);
    const packets: unknown[] = [];
    let lose = true;
    await resumed.route("**/api/stock/preparations/commit", async (route) => {
      packets.push(route.request().postDataJSON());
      if (lose) {
        lose = false;
        const r = await route.fetch();
        expect(r.ok()).toBe(true);
        await route.abort("failed");
      } else await route.continue();
    });
    await dialog(resumed)
      .getByRole("button", { name: "Confirmar", exact: true })
      .click();
    await expect(
      dialog(resumed).getByRole("button", {
        name: "Recuperar tentativa",
        exact: true,
      }),
    ).toBeVisible();
    const committed = stockPreparationFacts(f);
    expect(committed.ledger).toHaveLength(external.ledger.length + 1);
    await dialog(resumed)
      .getByRole("button", { name: "Recuperar tentativa", exact: true })
      .click();
    await expect(
      resumed.getByText("Movimentação familiar confirmada.", { exact: false }),
    ).toBeVisible();
    expect(packets).toHaveLength(2);
    expect(packets[0]).toEqual(packets[1]);
    expect(stockPreparationFacts(f)).toEqual(committed);
    await open(resumed, true);
    await expect(panel(resumed)).toContainText(
      "Este preenchimento já registrou uma movimentação.",
    );
    for (const width of [1440, 1150, 850, 500, 320]) {
      await resumed.setViewportSize({ width, height: 940 });
      await auditFromTop(resumed, `stock-private-receipt-${width}`);
    }
    await info.attach("stock-private-receipt320", {
      body: await dialog(resumed).screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    expect(stockPreparationFacts(f)).toEqual(committed);
  } finally {
    await next.close();
  }
});

test("compensação privada preserva referência fora da página,retoma sem replay e confirma uma única entrada histórica", async ({
  page,
}) => {
  const f = await stockPreparationFixture("correction_in"),
    before = stockPreparationFacts(f),
    reason =
      "Compensação histórica privada da retirada original,com identidade preservada";
  await login(page, f.patient);
  const original = page
    .getByRole("region", { name: "Histórico auditável", exact: true })
    .locator("tbody tr[data-movement-id]")
    .filter({ has: page.getByText(f.referenceId!, { exact: true }) });
  await original
    .getByRole("button", { name: "Corrigir este movimento", exact: true })
    .click();
  await dialog(page).getByLabel("Quantidade", { exact: true }).fill("1");
  await dialog(page).getByLabel("Motivo", { exact: true }).fill(reason);
  await expect(
    dialog(page).getByRole("button", {
      name: "Revisar movimentação",
      exact: true,
    }),
  ).toBeEnabled();
  await save(page);
  // Change the retained page rather than manufacturing a second private slot.
  for (let i = 0; i < 21; i++)
    await rpc(f.admin, "family_stock_movement", {
      p_patient: f.patient,
      p_product: f.products[1],
      p_action: "inbound",
      p_quantity: "1",
      p_reason:
        "Outra identidade para paginar sem mudar a referência preservada",
      p_key: crypto.randomUUID(),
    });
  const paginated = stockPreparationFacts(f);
  await page.reload();
  await open(page, true);
  await panel(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(dialog(page).locator('select[name="referenceId"]')).toHaveValue(
    f.referenceId!,
  );
  await expect(dialog(page).getByLabel("Motivo", { exact: true })).toHaveValue(
    reason,
  );
  await dialog(page)
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  await dialog(page)
    .getByText("Movimento histórico compensado", { exact: true })
    .click();
  await expect(
    dialog(page).getByText(f.referenceId!, { exact: true }),
  ).toBeVisible();
  await audit(page, "stock-private-compensation-readonly");
  expect(stockPreparationFacts(f)).toEqual(paginated);
  await dialog(page)
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByText("Movimentação familiar confirmada.", { exact: false }),
  ).toBeVisible();
  const after = stockPreparationFacts(f);
  expect(after.ledger).toHaveLength(paginated.ledger.length + 1);
  expect(after.documents).toBe(before.documents);
  const compensated = after.ledger.filter(
    (m: { reference_id: string | null; destination_location: string | null }) =>
      m.reference_id === f.referenceId,
  );
  expect(compensated).toHaveLength(1);
  expect(compensated[0].destination_location).toBe("FAMILY");
});

test("resultado familiar privado sobrevive à perda de escrita e revalida leitura sem expor o preenchimento recusado", async ({
  page,
}) => {
  const f = await stockPreparationFixture("outbound"),
    reason = "Retirada privada cujo resultado precisa de recuperação pessoal";
  await login(page, f.patient);
  await open(page);
  await fill(page, f.productId, reason);
  await dialog(page)
    .getByRole("combobox", { name: "Operação", exact: true })
    .selectOption("outbound");
  await dialog(page)
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  let lose = true;
  await page.route("**/api/stock/preparations/commit", async (route) => {
    if (lose) {
      lose = false;
      const r = await route.fetch();
      expect(r.ok()).toBe(true);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
      );
      await route.abort("failed");
    } else await route.continue();
  });
  await dialog(page)
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("button", {
      name: "Recuperar tentativa",
      exact: true,
    }),
  ).toBeVisible();
  const after = stockPreparationFacts(f);
  await page.reload();
  await open(page, true);
  let denied = true;
  await page.route("**/api/stock/preparations?**", (route) =>
    denied
      ? route.fulfill({
          status: 403,
          json: {
            code: "FORBIDDEN",
            error: "Leitura pessoal recusada no ensaio controlado.",
          },
        })
      : route.continue(),
  );
  await page.reload();
  await open(page, true);
  await expect(dialog(page).getByText(reason, { exact: true })).toHaveCount(0);
  denied = false;
  await dialog(page)
    .getByRole("button", { name: "Revalidar acesso ao rascunho", exact: true })
    .click();
  await expect(
    dialog(page).getByRole("button", {
      name: "Recuperar tentativa",
      exact: true,
    }),
  ).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Recuperar tentativa", exact: true })
    .click();
  await expect(
    page.getByText("Movimentação familiar confirmada.", { exact: false }),
  ).toBeVisible();
  expect(stockPreparationFacts(f)).toEqual(after);
  await expect(
    page.getByRole("button", {
      name: "Movimentar estoque familiar",
      exact: true,
    }),
  ).toHaveCount(0);
  await open(page, true);
  await expect(panel(page)).toContainText(reason);
  await expect(
    dialog(page).getByRole("button", {
      name: "Revisar movimentação",
      exact: true,
    }),
  ).toBeDisabled();
});

test("salvar antes da referência conserva a ausência explícita e exige adoção manual após a consulta tardia", async ({
  page,
}) => {
  const f = await stockPreparationFixture(),
    before = stockPreparationFacts(f);
  let release!: () => void,
    enter!: () => void,
    hold = true;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    entered = new Promise<void>((r) => {
      enter = r;
    });
  await page.route("**/api/stock/preparations/reference?**", async (route) => {
    if (hold) {
      enter();
      await gate;
    }
    if (!route.request().failure()) await route.continue();
  });
  try {
    await login(page, f.patient);
    await open(page);
    await fill(
      page,
      f.productId,
      "Preenchimento salvo enquanto a referência ainda estava sendo consultada",
    );
    await entered;
    await save(page);
    expect(
      (await rpc(f.admin, "stock_movement_preparation_context", f.scope))
        .content.referenceHash,
    ).toBeNull();
    hold = false;
    release();
    await expect(
      dialog(page).getByText(/Saldo familiar consultado:/),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("button", {
        name: "Revisar movimentação",
        exact: true,
      }),
    ).toBeDisabled();
    expect(
      (await rpc(f.admin, "stock_movement_preparation_context", f.scope))
        .content.referenceHash,
    ).toBeNull();
    await page.reload();
    await open(page, true);
    await panel(page)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await expect(
      dialog(page).getByRole("button", {
        name: "Revisar movimentação",
        exact: true,
      }),
    ).toBeDisabled();
    await dialog(page)
      .getByRole("button", { name: "Comparar referência atual", exact: true })
      .click();
    await dialog(page)
      .getByRole("button", { name: "Usar referência atual", exact: true })
      .click();
    await expect(
      dialog(page).getByRole("button", {
        name: "Revisar movimentação",
        exact: true,
      }),
    ).toBeEnabled();
    expect(stockPreparationFacts(f)).toEqual(before);
  } finally {
    release();
  }
});

test("gestão familiar sem leitura do saldo mantém preparação e ato nativo com respostas e recibo restritos", async ({
  page,
}) => {
  const f = await stockPreparationFixture(),
    before = stockPreparationFacts(f);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.professional.id)},'stock.family.manage',true);`,
  );
  await login(page, f.patient, "professional");
  await open(page);
  await fill(
    page,
    f.productId,
    "Entrada física autorizada sem leitura do saldo familiar",
  );
  await expect(
    dialog(page).getByText(/Saldo familiar restrito à sua autorização/),
  ).toBeVisible();
  await save(page);
  await dialog(page)
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  await expect(
    dialog(page).getByText("Não disponível neste preenchimento", {
      exact: true,
    }),
  ).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByText("Movimentação familiar confirmada.", { exact: false }),
  ).toBeVisible();
  const after = stockPreparationFacts(f);
  expect(after.ledger).toHaveLength(before.ledger.length + 1);
  expect(
    after.ledger.filter(
      (m: { performed_by: string }) =>
        m.performed_by === fixtures.professional.id,
    ),
  ).toHaveLength(1);
  const balances = await page.request.get(
    `/api/stock/balances?careRecipientId=${f.patient}`,
  );
  expect(balances.ok()).toBe(true);
  expect(
    (await balances.json()).overview.every(
      (p: { family: unknown }) => p.family === null,
    ),
  ).toBe(true);
  const read = await page.request.get(
    `/api/stock/preparations?careRecipientId=${f.patient}&purpose=family_movement&targetResourceId=${f.patient}`,
  );
  expect(read.ok()).toBe(true);
  const own = (await read.json()).data;
  expect(own.consumedResult.actorId).toBe(fixtures.professional.id);
  expect(own.consumedResult.preparedMovement).not.toHaveProperty(
    "observedBalance",
  );
  await open(page, true);
  await expect(panel(page)).toContainText(
    "Este preenchimento já registrou uma movimentação.",
  );
  await expect(
    dialog(page).getByText("30 unidade", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog(page).getByText("31 unidade", { exact: true }),
  ).toHaveCount(0);
  expect(stockPreparationFacts(f)).toEqual(after);
});
