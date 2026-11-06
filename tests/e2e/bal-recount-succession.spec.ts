import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  pendingRecount,
  assignRecount,
  substitute,
  recountState,
  workspace,
  balanceCommand,
  rpc,
} from "../integration/bal-recount-fixtures.mjs";
import { shiftWorker, shiftCommand } from "../integration/shift-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { formatZonedDate } from "../../src/lib/schedules/time";
import type { ScheduledShift } from "../../src/types/schedules";
import type { SupplyDocument } from "../../src/types/documents";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const editor = (page: Page) =>
  page.getByRole("dialog", {
    name: /^(Designar reconto|Revisar designação do reconto|Reconto designado)$/,
  });
const ownReason = (page: Page) =>
  editor(page).getByRole("textbox", {
    name: /^Sua justificativa para o reconto/,
  });
const action = (page: Page, name: string) =>
  editor(page).getByRole("button", { name, exact: true });
async function choose(page: Page, target: ScheduledShift) {
  const field = editor(page).getByRole("combobox", {
    name: /^Plantão para o reconto/,
  });
  await field.click();
  await expect(field).toBeInViewport({ ratio: 1 });
  await field.fill(target.professional_name);
  await field.press("ArrowDown");
  const label = `${target.professional_name} · ${target.type_name} · ${formatZonedDate(target.starts_at, target.timezone)} → ${formatZonedDate(target.ends_at, target.timezone)}`;
  const option = page.getByRole("option", { name: label, exact: true });
  await expect(option).toBeInViewport({ ratio: 1 });
  await option.click();
}
test("BAL reconto preserva Juliana, transfere a Sheila no mesmo plantão e concilia somente a nova contagem", async ({
  page,
  browser,
}, info) => {
  const f = await pendingRecount(),
    target = f.initial.targets.find(
      (row: ScheduledShift) => row.id === f.assignment.shift_id,
    );
  const before = JSON.parse(recountState(f));
  await login(page, fixtures.family.email, f.patient);
  await page.goto("/fichas/" + f.document.id);
  await page
    .getByRole("link", { name: "Designar reconto", exact: true })
    .click();
  await expect(
    editor(page).getByText(f.payload.notes, { exact: true }),
  ).toBeVisible();
  await expect(ownReason(page)).toHaveValue("");
  await expect(action(page, "Revisar designação")).toBeDisabled();
  await choose(page, target);
  const reason =
    "Designação própria da família para nova conferência física; sem apagar a primeira contagem.";
  await ownReason(page).fill(reason);
  for (const width of info.project.name === "chromium"
    ? [1440, 768, 390, 320]
    : [390]) {
    await page.setViewportSize({ width, height: 940 });
    await ownReason(page).focus();
    await audit(page, "bal-recount-designation-" + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/bal-recount-${f.document.id}-${info.project.name}.png`,
    animations: "disabled",
  });
  const attempts: unknown[] = [];
  await page.route("**/api/balances", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'bal.approve.family',false);`,
      );
      await route.abort("failed");
    } else await route.continue();
  });
  await action(page, "Revisar designação").click();
  await expect(editor(page).getByRole("textbox")).toHaveCount(0);
  await expect(
    editor(page)
      .getByRole("region", { name: "Conferência da designação" })
      .getByText(reason, { exact: true }),
  ).toBeVisible();
  await action(page, "Confirmar designação").click();
  await expect(action(page, "Recuperar a mesma tentativa")).toBeVisible();
  await expect(action(page, "Fechar edição")).toBeDisabled();
  await expect(action(page, "Voltar")).toBeDisabled();
  await action(page, "Recuperar a mesma tentativa").click();
  await expect(
    editor(page).getByRole("heading", {
      name: "Designação confirmada",
      exact: true,
    }),
  ).toBeFocused();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  expect(attempts[0]).toMatchObject({
    expectedVersion: f.document.version,
    command: {
      action: "assign_recount",
      body: {
        targetShiftId: f.assignment.shift_id,
        targetShiftVersion: target.version,
        reason,
      },
    },
  });
  await action(page, "Consultar acompanhamento atual").click();
  await expect(editor(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Programação do balanço", exact: true }),
  ).toBeFocused();
  const second = await substitute(f),
    current = await workspace(second.client, f.patient);
  expect(current.eligibility.available).toBe(true);
  expect(current.eligibility.assignment.kind).toBe("recount");
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const counter = await context.newPage();
    await login(counter, second.email, f.patient);
    await counter.goto("/balancos");
    await counter
      .getByRole("main")
      .getByRole("link", { name: "Fazer balanço", exact: true })
      .click();
    await expect(
      counter.getByRole("heading", { name: "Balanço de estoque", exact: true }),
    ).toBeVisible();
    const catalogue = (
      await (
        await counter.request.get("/api/catalog?careRecipientId=" + f.patient)
      ).json()
    ).data;
    for (const product of catalogue) {
      const field = counter.getByLabel(`${product.name} · ${product.unit}`, {
        exact: true,
      });
      await expect(field).toHaveValue("");
      await field.fill(product.id === f.products[0] ? "1" : "0");
    }
    await expect(
      counter.getByLabel("Observações da contagem", { exact: true }),
    ).toHaveValue("");
    await counter
      .getByLabel("Observações da contagem", { exact: true })
      .fill(
        "Segunda contagem física registrada pessoalmente por Sheila fictícia.",
      );
    await counter.getByRole("button", { name: "Revisar", exact: true }).click();
    await expect(
      counter.getByText("Referência: 5 unidade", { exact: true }),
    ).toBeVisible();
    await counter
      .getByRole("button", { name: "Confirmar reconto", exact: true })
      .click();
    await expect(
      counter.getByRole("link", { name: "Abrir ficha BAL", exact: true }),
    ).toBeVisible();
    const recounted = (
      await (
        await counter.request.get("/api/documents/" + f.document.id)
      ).json()
    ).data as SupplyDocument;
    expect(recounted.balanceReview?.counter.id).toBe(second.id);
    expect(recounted.balanceReview?.countVersion).toBe(2);
    expect(recounted.created_by).toBe(f.pro.id);
    expect(JSON.parse(recountState(f)).ledger).toEqual(before.ledger);
  } finally {
    await context.close();
  }
  const supervisor = await shiftWorker(f.patient, "supervisor"),
    source = await rpc(supervisor.client, "operational_document", {
      p_id: f.document.id,
    });
  const reviewed = await rpc(supervisor.client, "supply_document_command", {
    p_id: f.document.id,
    p_action: "approve",
    p_body: {
      group: "supervisor",
      comment: "Parecer independente da supervisão sobre a contagem dois",
      reviewReference: source.balanceReview.referenceHash,
    },
    p_key: crypto.randomUUID(),
    p_version: source.version,
  });
  expect(reviewed.status).toBe("submitted");
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability='bal.approve.family';`,
  );
  await page.goto("/fichas/" + f.document.id);
  await page
    .getByRole("button", { name: "Revisão da família", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar contagem do balanço",
    exact: true,
  });
  await review
    .getByRole("textbox", { name: /^Seu parecer sobre a contagem/ })
    .fill("Parecer da família sobre a contagem dois por Sheila fictícia.");
  await review
    .getByRole("button", { name: "Revisar parecer", exact: true })
    .click();
  await review
    .getByRole("button", { name: "Confirmar revisão", exact: true })
    .click();
  await expect(review).toHaveCount(0);
  const document = (
    await (await page.request.get("/api/documents/" + f.document.id)).json()
  ).data as SupplyDocument;
  expect(document.status).toBe("approved");
  expect(document.balanceReview?.reviews).toHaveLength(3);
  const after = JSON.parse(recountState(f));
  expect(after.obligations).toEqual(before.obligations);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  const adjustments = after.ledger.filter(
    (m: { reference_type: string; reference_id: string }) =>
      m.reference_type === "bal" && m.reference_id === f.document.id,
  );
  expect(
    after.cycleEvents.filter(
      (e: { action: string }) => e.action === "bal.cycle.recount_recorded",
    ),
  ).toHaveLength(1);
  expect(adjustments).toHaveLength(1);
  expect(Number(adjustments[0].quantity)).toBe(4);
  const pdf = await page.request.get(`/api/documents/${document.id}/pdf`);
  expect(pdf.ok()).toBe(true);
  const bytes = await pdf.body();
  mkdirSync("output/pdf/phase-d", { recursive: true });
  const base = `output/pdf/phase-d/bal-recount-${document.id}-v${document.version}`;
  writeFileSync(base + ".pdf", bytes);
  writeFileSync(
    base + "-source.json",
    JSON.stringify(
      {
        document,
        before,
        after,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    base + "-database.json",
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(document.id)}),'reviews',(select jsonb_agg(to_jsonb(r)) from public.balance_reviews r where document_id=${sqlLiteral(document.id)}),'renders',(select jsonb_agg(to_jsonb(r)) from public.document_pdf_renders r where document_id=${sqlLiteral(document.id)}));`,
    ),
  );
});

test("BAL reconto sem contador mostra recuperação, preserva motivo no conflito e exige adoção explícita do plantão atual", async ({
  page,
}, info) => {
  const f = await pendingRecount(),
    target = f.initial.targets.find(
      (s: ScheduledShift) => s.id === f.assignment.shift_id,
    );
  expect((await assignRecount(f.family, f, target)).error).toBeNull();
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal.count',false);`,
  );
  await balanceCommand(f.admin, f.patient, "refresh", {});
  const replacement = await shiftWorker(f.patient);
  sql(
    `update public.profiles set full_name='Camila fictícia, proposta de reconto' where id=${sqlLiteral(replacement.id)};`,
  );
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: target.id,
      professionalId: replacement.id,
      reason: "Escolha para recuperar o reconto sem profissional elegível",
    },
    target.version,
  );
  await login(page, fixtures.family.email, f.patient);
  await page.goto("/balancos");
  const recovery = page.getByRole("region", {
    name: "Recontos aguardando designação",
    exact: true,
  });
  await expect(
    recovery.getByText(f.document.code, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^Não há contagem pendente/)).toHaveCount(0);
  await recovery
    .getByRole("link", { name: "Designar novo reconto", exact: true })
    .click();
  const source = (
    await (
      await page.request.get(
        "/api/balances/recount?documentId=" + f.document.id,
      )
    ).json()
  ).data;
  const selected = source.targets.find(
    (s: ScheduledShift) => s.id === target.id,
  );
  await choose(page, selected);
  const reason =
    "Minha justificativa continua após conflito e falha de consulta do plantão.";
  await ownReason(page).fill(reason);
  const third = await shiftWorker(f.patient);
  sql(
    `update public.profiles set full_name='Márcia fictícia, responsável atual do reconto' where id=${sqlLiteral(third.id)};`,
  );
  await shiftCommand(
    f.admin,
    f.patient,
    "change",
    {
      id: target.id,
      professionalId: third.id,
      reason: "Outra substituição legítima durante a preparação da designação",
    },
    selected.version,
  );
  let failRead = true;
  await page.route("**/api/balances/recount?**", async (route) => {
    if (failRead) {
      failRead = false;
      return route.abort("failed");
    }
    return route.continue();
  });
  const before = recountState(f);
  await action(page, "Revisar designação").click();
  await action(page, "Confirmar designação").click();
  await expect(ownReason(page)).toHaveValue(reason);
  await expect(ownReason(page)).toBeFocused();
  await expect(action(page, "Revisar designação")).toBeDisabled();
  expect(recountState(f)).toBe(before);
  await action(page, "Comparar com a situação atual").click();
  const comparison = editor(page).getByRole("region", {
    name: "Comparação do reconto",
    exact: true,
  });
  await expect(
    comparison.getByText(/Plantão escolhido.*Camila fictícia/),
  ).toBeVisible();
  await expect(
    comparison.getByText(/Mesmo plantão.*Márcia fictícia/),
  ).toBeVisible();
  await expect(ownReason(page)).toHaveValue(reason);
  await expect(action(page, "Comparar com a situação atual")).toBeFocused();
  await action(page, "Adotar referência atual").click();
  await expect(ownReason(page)).toHaveValue(reason);
  await expect(
    editor(page).getByRole("combobox", { name: /^Plantão para o reconto/ }),
  ).toHaveValue(/Márcia fictícia/);
  await expect(action(page, "Revisar designação")).toBeEnabled();
  await page.setViewportSize({
    width: info.project.name === "chromium" ? 320 : 390,
    height: 940,
  });
  await ownReason(page).focus();
  await audit(page, "bal-recount-adopted-reference");
  await action(page, "Revisar designação").click();
  await action(page, "Confirmar designação").click();
  await expect(
    editor(page).getByRole("region", { name: "Resultado da designação" }),
  ).toContainText("Márcia fictícia");
  const after = JSON.parse(recountState(f)),
    prior = JSON.parse(before);
  expect(after.document).toEqual(prior.document);
  expect(after.obligations).toEqual(prior.obligations);
  expect(after.ledger).toEqual(prior.ledger);
  expect(
    after.assignments.filter((a: { status: string }) => a.status === "active"),
  ).toHaveLength(1);
  await action(page, "Consultar acompanhamento atual").click();
  await expect(editor(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Programação do balanço", exact: true }),
  ).toBeFocused();
  await expect(recovery).toHaveCount(0);
});
