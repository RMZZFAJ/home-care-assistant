import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  balanceSetup,
  shiftWorker,
  shiftCommand,
  balanceCommand,
} from "../integration/shift-fixtures.mjs";
import {
  privateDraftFixture,
  balContent,
  savePacket,
  draftContext,
  rpc,
  fixtures,
  officialState,
} from "../integration/private-draft-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const review = (page: Page) =>
  page.getByRole("region", {
    name: "Conferir mudança da contagem",
    exact: true,
  });
async function login(page: Page, patient: string, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await button(page, "Entrar").click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/fichas/bal");
  await expect(panel(page)).toBeVisible();
}
async function stockChange(
  f:
    | Awaited<ReturnType<typeof privateDraftFixture>>
    | Awaited<ReturnType<typeof balanceSetup>>,
) {
  const before = await rpc(f.admin, "balance_count_reference", {
    p_patient: f.patient,
  });
  const receiver = "client" in f.pro ? f.pro.id : fixtures.professional.id;
  const client = "client" in f.pro ? f.pro.client : f.pro;
  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: receiver,
      recipientReason:
        "Entrega fictícia para conferir mudança do estoque da equipe",
      lines: [{ productId: f.products[0], quantity: "1" }],
    },
  });
  await rpc(client, "supply_document_command", {
    p_id: delivery.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: delivery.version,
  });
  const after = await rpc(f.admin, "balance_count_reference", {
    p_patient: f.patient,
  });
  expect(after.revision).not.toBe(before.revision);
}

test("BAL local scheduled fields survive a stock change,reload and explicit fresh reference without becoming new quantities", async ({
  page,
}, info) => {
  const f = await balanceSetup();
  await login(page, f.patient, f.pro.email);
  await expect(button(page, "Revisar")).toBeEnabled();
  await page
    .getByLabel("Material fictício V4 0 · unidade", { exact: true })
    .fill("1,");
  await page
    .getByLabel("Observações da contagem", { exact: true })
    .fill("Notas anteriores que não podem sumir");
  const key = `hca:v2:bal-count:${f.pro.id}:${f.patient}:new`;
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page.evaluate((k) => sessionStorage.getItem(k), key))!,
        ).content.notes,
    )
    .toBe("Notas anteriores que não podem sumir");
  const old = JSON.parse(
    (await page.evaluate((k) => sessionStorage.getItem(k), key))!,
  ).content;
  await stockChange(f);
  const before = officialState(f);
  await page.reload();
  await expect(review(page)).toBeVisible();
  await expect(review(page)).toContainText("Quantidade anterior: 1,");
  await expect(
    page.getByLabel("Material fictício V4 0 · unidade", { exact: true }),
  ).toBeDisabled();
  expect(
    JSON.parse((await page.evaluate((k) => sessionStorage.getItem(k), key))!)
      .content,
  ).toEqual(old);
  await button(page, "Atualizar referência e iniciar nova conferência").click();
  await expect(review(page)).toHaveCount(0);
  await expect(
    page.getByLabel("Material fictício V4 0 · unidade", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Observações da contagem", { exact: true }),
  ).toHaveValue(old.notes);
  await button(page, "Salvar rascunho").click();
  await expect(panel(page)).toContainText("Revisão 1");
  const saved = await rpc(f.pro.client, "creation_draft_context", {
    p_patient: f.patient,
    p_kind: "BAL",
    p_target: null,
  });
  expect(saved.content.counts).toEqual({});
  expect(saved.content.observationTimes).toEqual({});
  expect(saved.content.previousObservations).toEqual([old]);
  expect(saved.content.context.referenceRevision).not.toBe(
    old.context.referenceRevision,
  );
  expect(officialState(f)).toBe(before);
  const history = page
    .getByRole("region", {
      name: "Conferências anteriores preservadas",
      exact: true,
    })
    .first();
  await history.getByText("Conferência anterior 1", { exact: true }).click();
  for (const width of info.project.name === "chromium"
    ? [320, 390, 768, 1440]
    : [390]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `BAL prior observations ${width}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  const image = info.outputPath("observations.png");
  await page.screenshot({ path: image, fullPage: true });
  await info.attach("observations", { path: image, contentType: "image/png" });
});

test("BAL private optional observations survive reference change,new entry and another real Auth device", async ({
  page,
  browser,
}) => {
  const f = await privateDraftFixture(),
    old = balContent(f);
  old.counts[f.products[0]] = "1,";
  old.notes = "Observação privada anterior entre aparelhos";
  old.observationTimes[f.products[0]] = "2026-11-05T09:00:00-03:00";
  old.context.referenceRevision = (
    await rpc(f.pro, "balance_count_reference", { p_patient: f.patient })
  ).revision;
  await rpc(f.pro, "creation_draft_command", savePacket(f, "BAL", old));
  await stockChange(f);
  const before = officialState(f);
  await login(page, f.patient, fixtures.professional.email);
  await panel(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(review(page)).toBeVisible();
  await expect(review(page)).toContainText("Quantidade anterior: 1,");
  await button(page, "Atualizar referência e iniciar nova conferência").click();
  await expect(review(page)).toHaveCount(0);
  await button(page, "Avançar").click();
  await button(page, "Avançar").click();
  const input = page.getByLabel("Quantidade — Material fictício V4 0", {
    exact: true,
  });
  await expect(input).toHaveValue("");
  await input.fill("2");
  await button(page, "Salvar rascunho").click();
  await expect(panel(page)).toContainText("Revisão 2");
  const saved = await draftContext(f, "BAL");
  expect(saved.content.previousObservations).toEqual([old]);
  expect(saved.content.counts[f.products[0]]).toBe("2");
  expect(saved.content.observationTimes[f.products[0]]).not.toBe(
    old.observationTimes[f.products[0]],
  );
  expect(officialState(f)).toBe(before);
  const device = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const other = await device.newPage();
    await login(other, f.patient, fixtures.professional.email);
    await panel(other)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await expect(review(other)).toHaveCount(0);
    await expect(
      other.getByLabel("Quantidade — Material fictício V4 0", { exact: true }),
    ).toHaveValue("2");
    const history = other
      .getByRole("region", {
        name: "Conferências anteriores preservadas",
        exact: true,
      })
      .first();
    await history.getByText("Conferência anterior 1", { exact: true }).click();
    await expect(history).toContainText("Quantidade anterior: 1,");
    expect((await draftContext(f, "BAL")).content).toEqual(saved.content);
    await audit(other, "BAL old and new observations another device");
  } finally {
    await device.close();
  }
});

test("BAL scheduled failed source read preserves the exact local copy and recovers without blank overwrite", async ({
  page,
}) => {
  const f = await balanceSetup();
  await login(page, f.patient, f.pro.email);
  await expect(button(page, "Revisar")).toBeEnabled();
  await page
    .getByLabel("Material fictício V4 0 · unidade", { exact: true })
    .fill("7");
  const key = `hca:v2:bal-count:${f.pro.id}:${f.patient}:new`;
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page.evaluate((k) => sessionStorage.getItem(k), key))!,
        ).counts[f.products[0]],
    )
    .toBe("7");
  const raw = await page.evaluate((k) => sessionStorage.getItem(k), key);
  await page.route("**/api/catalog?**", (route) => route.abort("failed"), {
    times: 1,
  });
  await page.reload();
  await expect(button(page, "Consultar referência novamente")).toBeVisible();
  expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBe(raw);
  await button(page, "Consultar referência novamente").click();
  await expect(
    page.getByLabel("Material fictício V4 0 · unidade", { exact: true }),
  ).toHaveValue("7");
  await expect(button(page, "Revisar")).toBeEnabled();
});

test("BAL private document version and reassigned shift keep old observations without authorizing another count", async ({
  page,
}) => {
  const f = await balanceSetup();
  const state = await rpc(f.pro.client, "balance_workspace", {
      p_patient: f.patient,
    }),
    assignment = state.eligibility.assignment;
  const payload = {
    lines: f.products.map((productId) => ({ productId, quantity: "0" })),
    notes: "Base documental",
    balanceAssignment: {
      id: assignment.id,
      version: assignment.version,
      referenceRevision: state.referenceRevision,
    },
  };
  const doc = await rpc(f.pro.client, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_key: randomUUID(),
    p_draft: true,
    p_payload: payload,
  });
  const old = balContent(f);
  old.context = {
    mode: "scheduled",
    documentId: doc.id,
    documentVersion: doc.version,
    assignmentId: assignment.id,
    assignmentVersion: assignment.version,
    referenceRevision: state.referenceRevision,
  };
  old.counts[f.products[0]] = "3";
  old.observationTimes[f.products[0]] = "2026-11-05T09:00:00-03:00";
  await rpc(
    f.pro.client,
    "creation_draft_command",
    savePacket(f, "BAL", old, null, null, doc.id),
  );
  const revised = await rpc(f.pro.client, "revise_supply_document", {
    p_id: doc.id,
    p_payload: { ...payload, notes: "Outra revisão oficial" },
    p_key: randomUUID(),
    p_version: doc.version,
  });
  await login(page, f.patient, f.pro.email);
  await page.goto(`/fichas/bal?documentId=${doc.id}`);
  await panel(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(review(page)).toBeVisible();
  await expect(review(page)).toContainText("Quantidade anterior: 3");
  const before = officialState(f);
  await button(page, "Atualizar referência e iniciar nova conferência").click();
  await expect(review(page)).toHaveCount(0);
  await expect(
    page.getByLabel("Material fictício V4 0 · unidade", { exact: true }),
  ).toHaveValue("");
  await button(page, "Salvar rascunho").click();
  await expect(panel(page)).toContainText("Revisão 2");
  const own = await rpc(f.pro.client, "creation_draft_context", {
    p_patient: f.patient,
    p_kind: "BAL",
    p_target: doc.id,
  });
  expect(own.content.context.documentVersion).toBe(revised.version);
  expect(own.content.previousObservations).toEqual([old]);
  expect(officialState(f)).toBe(before);
  const other = await shiftWorker(f.patient, "supervisor"),
    shift = state.targets.find(
      (t: { id: string }) => t.id === assignment.shift_id,
    );
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: shift.id,
      professionalId: other.id,
      reason: "Substituição real no mesmo período de teste",
    },
    shift.version,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  const changed = officialState(f);
  await page.reload();
  await panel(page)
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(review(page)).toBeVisible();
  await button(page, "Atualizar referência e iniciar nova conferência").click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "plantão não está disponível",
  );
  expect(
    (
      await rpc(f.pro.client, "creation_draft_context", {
        p_patient: f.patient,
        p_kind: "BAL",
        p_target: doc.id,
      })
    ).content,
  ).toEqual(own.content);
  expect(officialState(f)).toBe(changed);
  await audit(page, "BAL reassignment preserves source without authority");
});
