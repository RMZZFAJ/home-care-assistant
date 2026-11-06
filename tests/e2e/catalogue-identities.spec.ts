import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import {
  catalogueIdentityFixture,
  identityPhysicalState,
  identityState,
  identityPacket,
  rpc,
} from "../integration/catalogue-identity-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

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
}
const modal = (page: Page) =>
  page.getByRole("dialog", {
    name: "Situação e sucessor do material",
    exact: true,
  });
async function open(page: Page, patient: string, inactive = false) {
  await page.goto(`/admin?careRecipientId=${patient}&section=catalog`);
  await expect(
    page.getByRole("heading", { name: "Catálogo do paciente", exact: true }),
  ).toBeVisible();
  if (inactive)
    await page
      .getByRole("combobox", { name: "Situação dos produtos", exact: true })
      .selectOption("inactive");
  await page
    .getByRole("button", {
      name: "Situação e sucessor: Material fictício V4 0",
      exact: true,
    })
    .click();
  await expect(
    modal(page).getByRole("region", {
      name: "Material de origem",
      exact: true,
    }),
  ).toBeVisible();
}
async function choose(
  page: Page,
  action: string,
  reason: string,
  successor = "",
) {
  await modal(page)
    .getByRole("combobox", { name: "Ato no catálogo", exact: true })
    .selectOption(action);
  if (successor) {
    await modal(page)
      .getByRole("combobox", {
        name: "Sucessor para novas escolhas, opcional",
        exact: true,
      })
      .selectOption(successor);
    await expect(
      modal(page).getByRole("region", {
        name: "Material comparado",
        exact: true,
      }),
    ).toBeVisible();
  }
  await modal(page)
    .getByLabel("Motivo próprio da escolha", { exact: true })
    .fill(reason);
  await modal(page)
    .getByRole("button", { name: "Revisar mudança no catálogo", exact: true })
    .click();
  await expect(
    modal(page).getByRole("heading", {
      name: "Confira o efeito no catálogo",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(modal(page).getByRole("textbox")).toHaveCount(0);
}

test("sucessor de outra unidade preserva PDF e saldos; resposta perdida recupera a mesma intenção após perda de escrita", async ({
  page,
  browser,
}, info) => {
  const f = await catalogueIdentityFixture();
  await login(page, f.patient);
  const pdf = await page.request.get(`/api/documents/${f.origin.id}/pdf`);
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const firstBytes = await pdf.body(),
    firstHash = createHash("sha256").update(firstBytes).digest("hex");
  expect(firstBytes.subarray(0, 5).toString()).toBe("%PDF-");
  const before = identityPhysicalState(f);
  await open(page, f.patient);
  await choose(
    page,
    "retire",
    "Escolhi um sucessor para novas seleções, mantendo os fatos e as unidades distintas",
    f.successorId,
  );
  await expect(
    modal(page).getByRole("region", {
      name: "Material de origem",
      exact: true,
    }),
  ).toContainText("4 unidade");
  await expect(
    modal(page).getByRole("region", {
      name: "Sucessor para novas escolhas",
      exact: true,
    }),
  ).toContainText("9,5 mL");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `catalogue-successor-review-${width}`);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await modal(page)
    .getByRole("region", { name: "Material de origem", exact: true })
    .screenshot({
      path: `output/playwright/phase-d/catalogue-successor-source-${info.project.name}.png`,
    });
  await modal(page)
    .getByRole("region", { name: "Sucessor para novas escolhas", exact: true })
    .screenshot({
      path: `output/playwright/phase-d/catalogue-successor-target-${info.project.name}.png`,
    });
  let lose = true;
  const packets: unknown[] = [];
  await page.route("**/api/catalog/identities**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (lose) {
      lose = false;
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await modal(page)
    .getByRole("button", { name: "Confirmar mudança no catálogo", exact: true })
    .click();
  await expect(
    modal(page).getByText(/A escolha, o motivo e a chave estão congelados/),
  ).toBeVisible();
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'catalog.manage',false);`,
  );
  // Observe the authority refresh before recovery; a fast retry must not hide
  // an unmount race behind the eventual context update.
  const refreshed = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/context") || !response.ok())
      return false;
    const value = await response.json();
    return value.data.patients.some(
      (row: { id: string; capabilities?: Record<string, boolean> }) =>
        row.id === f.patient && row.capabilities?.["catalog.manage"] === false,
    );
  });
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hca:profile-updated")),
  );
  await refreshed;
  await expect(
    page.getByText(/Seu vínculo não permite novas mudanças no catálogo/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Novo item", exact: true }),
  ).toHaveCount(0);
  await expect(
    modal(page).getByRole("button", {
      name: "Recuperar mesma intenção",
      exact: true,
    }),
  ).toBeVisible();
  await modal(page)
    .getByRole("button", { name: "Recuperar mesma intenção", exact: true })
    .click();
  await expect(modal(page)).toHaveCount(0);
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  await expect(page.getByText(/A mesma intenção foi recuperada/)).toBeVisible();
  await audit(page, "catalogue-recovered-without-write");
  await page.unroute("**/api/catalog/identities**");
  const fresh = await page.request.get(
    `/api/catalog?careRecipientId=${f.patient}`,
  );
  expect(fresh.ok()).toBe(true);
  const products = (await fresh.json()).data;
  expect(products.some((row: { id: string }) => row.id === f.products[0])).toBe(
    false,
  );
  expect(
    products.find((row: { id: string }) => row.id === f.successorId)
      .selectionPredecessors,
  ).toEqual([
    { id: f.products[0], name: "Material fictício V4 0", unit: "unidade" },
  ]);
  const afterPdf = await page.request.get(`/api/documents/${f.origin.id}/pdf`);
  expect(afterPdf.ok()).toBe(true);
  expect(
    createHash("sha256")
      .update(await afterPdf.body())
      .digest("hex"),
  ).toBe(firstHash);
  expect(identityPhysicalState(f)).toBe(before);
  // The team chooses the successor explicitly. The previous identity is never
  // rebound through alias matching, an existing line or its previous balance.
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const team = await context.newPage();
    await login(team, f.patient, "professional");
    await team.goto(`/fichas/req?careRecipientId=${f.patient}`);
    await team.getByRole("button", { name: "Avançar", exact: true }).click();
    await team.getByRole("button", { name: "Avançar", exact: true }).click();
    await team
      .getByLabel("Buscar produto", { exact: true })
      .fill("Material fictício V4 0");
    const choice = team.getByRole("checkbox", {
      name: /Material fictício V4 A solução/,
    });
    await expect(choice).not.toBeChecked();
    await choice.check();
    await expect(
      team.getByText(/a seleção é sua e não converte o estoque anterior/),
    ).toBeVisible();
  } finally {
    await context.close();
  }
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.adminA.id)} and capability='catalog.manage';`,
  );
  await open(page, f.patient, true);
  await choose(
    page,
    "reactivate",
    "Reativação explícita da mesma identidade e das quatro unidades preservadas em cada custódia",
  );
  await modal(page)
    .getByRole("button", { name: "Confirmar mudança no catálogo", exact: true })
    .click();
  await expect(modal(page)).toHaveCount(0);
  expect(identityPhysicalState(f)).toBe(before);
  sql(`update public.care_recipient_memberships set status='revoked'
    where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);
  const noRead = page.waitForResponse(
    (response) => response.url().endsWith("/api/context") && response.ok(),
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hca:profile-updated")),
  );
  await noRead;
  await expect(
    page.getByRole("heading", { name: "Catálogo do paciente", exact: true }),
  ).toHaveCount(0);
  const denied = await page.request.post("/api/catalog/identities", {
    data: packets[0],
  });
  expect(denied.status()).toBe(404);
  expect(identityPhysicalState(f)).toBe(before);
});

test("referência alterada compara saldo atual, preserva motivo e exige adoção após falha de consulta", async ({
  page,
}) => {
  const f = await catalogueIdentityFixture();
  await login(page, f.patient);
  await open(page, f.patient);
  const ownReason =
    "Quero manter este material inativo, conservando meu motivo durante o conflito";
  await choose(page, "retire", ownReason);
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_quantity: "1",
    p_action: "inbound",
    p_reason: "Entrada física legítima posterior à referência revisada",
    p_key: randomUUID(),
  });
  const before = identityState(f),
    physical = identityPhysicalState(f);
  let fail = true;
  await page.route("**/api/catalog/identities**", async (route) => {
    if (route.request().method() === "GET" && fail) {
      fail = false;
      await route.fulfill({
        status: 503,
        json: { error: "Consulta atual temporariamente indisponível" },
      });
    } else await route.continue();
  });
  await modal(page)
    .getByRole("button", { name: "Confirmar mudança no catálogo", exact: true })
    .click();
  await expect(
    modal(page).getByText(/A referência atual está indisponível/),
  ).toBeVisible();
  expect(identityState(f)).toBe(before);
  const reason = modal(page).getByLabel("Motivo próprio da escolha", {
    exact: true,
  });
  await expect(reason).toHaveValue(ownReason);
  await expect(reason).toBeFocused();
  await expect(
    modal(page).getByRole("button", {
      name: "Revisar mudança no catálogo",
      exact: true,
    }),
  ).toBeDisabled();
  await modal(page)
    .getByRole("button", {
      name: "Consultar referência para comparação",
      exact: true,
    })
    .click();
  await expect(
    modal(page).getByRole("region", {
      name: "Referência atual de origem",
      exact: true,
    }),
  ).toContainText("5 unidade");
  await modal(page)
    .getByRole("button", {
      name: "Adotar referência consultada e manter meu motivo",
      exact: true,
    })
    .click();
  await expect(reason).toHaveValue(ownReason);
  await expect(reason).toBeFocused();
  await modal(page)
    .getByRole("button", { name: "Revisar mudança no catálogo", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Confirmar mudança no catálogo", exact: true })
    .click();
  await expect(modal(page)).toHaveCount(0);
  expect(identityPhysicalState(f)).toBe(physical);
});

test("compensação de inativo mantém a referência visível e usa uma única superfície de revisão", async ({
  page,
}) => {
  const f = await catalogueIdentityFixture();
  await rpc(f.admin, "catalogue_identity_command", await identityPacket(f));
  const before = JSON.parse(identityPhysicalState(f)),
    original = before.ledger.find(
      (row: {
        product_id: string;
        reference_type: string;
        destination_location: string;
      }) =>
        row.product_id === f.products[0] &&
        row.reference_type === "family_manual" &&
        row.destination_location === "FAMILY",
    );
  await login(page, f.patient);
  await page.goto(`/estoque?careRecipientId=${f.patient}`);
  const history = page.getByRole("region", {
      name: "Histórico auditável",
      exact: true,
    }),
    row = history
      .locator("li")
      .filter({ has: page.getByText(original.id, { exact: true }) });
  await row
    .getByRole("button", { name: "Corrigir este movimento", exact: true })
    .click();
  const edit = page.getByRole("dialog", {
    name: "Movimentar estoque familiar",
    exact: true,
  });
  await expect(
    edit.getByRole("combobox", { name: "Produto", exact: true }),
  ).toHaveValue(f.products[0]);
  await expect(
    edit.locator('select[name="productId"] option:checked'),
  ).toContainText("Inativo");
  await expect(edit.locator('select[name="referenceId"]')).toHaveValue(
    original.id,
  );
  await edit.getByLabel("Quantidade", { exact: true }).fill("1");
  await edit
    .getByLabel("Motivo", { exact: true })
    .fill(
      "Compensação histórica explícita do material inativo, sem mudar sua identidade",
    );
  await edit
    .getByRole("button", { name: "Revisar movimentação", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Confirmar movimentação familiar",
    exact: true,
  });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    review.getByRole("heading", {
      name: "Confira o movimento e sua referência",
      exact: true,
    }),
  ).toBeFocused();
  await expect(review.getByRole("textbox")).toHaveCount(0);
  await review
    .getByText("Movimento histórico compensado", { exact: true })
    .click();
  await expect(review.getByText(original.id, { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `inactive-compensation-${width}`);
  }
  await review.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByText("Movimentação familiar confirmada.", { exact: false }),
  ).toBeVisible();
  const after = JSON.parse(identityPhysicalState(f)),
    created = after.ledger.filter(
      (m: { id: string }) =>
        !before.ledger.some((old: { id: string }) => old.id === m.id),
    );
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({
    product_id: f.products[0],
    reference_type: "family_manual",
    reference_id: original.id,
    source_location: "FAMILY",
    destination_location: null,
  });
  expect(after.documents).toEqual(before.documents);
  expect(after.lines).toEqual(before.lines);
  expect(after.events).toEqual(before.events);
});

test("gestor delegado conserva somente recuperação própria ao perder a última capacidade administrativa", async ({
  page,
}) => {
  const f = await catalogueIdentityFixture();
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
  );
  await login(page, f.patient, "professional");
  await open(page, f.patient);
  await choose(
    page,
    "retire",
    "Motivo próprio do gestor delegado para preservar a identidade e seu estoque",
  );
  const before = identityPhysicalState(f);
  const packets: Record<string, unknown>[] = [];
  let lost = true;
  await page.route("**/api/catalog/identities**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (!lost) return route.continue();
    lost = false;
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    await route.abort("failed");
  });
  await modal(page)
    .getByRole("button", { name: "Confirmar mudança no catálogo", exact: true })
    .click();
  await expect(
    modal(page).getByText(/A escolha, o motivo e a chave estão congelados/),
  ).toBeVisible();
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
  );
  const refreshed = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/context") || !response.ok())
      return false;
    const { data } = await response.json();
    return data.patients.some(
      (row: { id: string; capabilities: Record<string, boolean> }) =>
        row.id === f.patient &&
        !row.capabilities["catalog.manage"] &&
        !row.capabilities["access.manage"] &&
        !row.capabilities["audit.read"],
    );
  });
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hca:profile-updated")),
  );
  await refreshed;
  await expect(
    page.getByText(/Seu vínculo não permite novas mudanças no catálogo/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Novo item", exact: true }),
  ).toHaveCount(0);
  await modal(page)
    .getByRole("button", { name: "Recuperar mesma intenção", exact: true })
    .click();
  await expect(page.getByText(/A mesma intenção foi recuperada/)).toBeVisible();
  expect(packets).toHaveLength(2);
  expect(packets[0]).toEqual(packets[1]);
  expect(identityPhysicalState(f)).toBe(before);
  await page.unroute("**/api/catalog/identities**");
  const denied = await page.request.post("/api/catalog/identities", {
    data: { ...packets[0], idempotencyKey: randomUUID() },
  });
  expect(denied.status()).toBe(403);
  expect(identityPhysicalState(f)).toBe(before);
  await audit(page, "catalogue-delegated-recovery-only");
});
