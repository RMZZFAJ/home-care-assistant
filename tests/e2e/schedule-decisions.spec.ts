import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import {
  balanceSetup,
  shiftWorker,
  shiftCommand,
} from "../integration/shift-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function prepared() {
  const base = await setup(),
    first = await shiftWorker(base.patient),
    second = await shiftWorker(base.patient);
  const suffix = randomUUID().slice(0, 8),
    names = {
      first: "Sheila fictícia " + suffix,
      second: "Cíntia fictícia " + suffix,
    };
  sql(
    `update public.profiles set full_name=${sqlLiteral(names.first)} where id=${sqlLiteral(first.id)}; update public.profiles set full_name=${sqlLiteral(names.second)} where id=${sqlLiteral(second.id)};`,
  );
  const type = await shiftCommand(base.admin, base.patient, "type", {
    name: "Noturno fictício " + suffix,
    startsLocal: "19:00",
    durationMinutes: 720,
  });
  const body = {
    professionalId: first.id,
    shiftTypeId: type.id,
    timezone: "America/Sao_Paulo",
    recurrence: "once",
    weekdays: [],
    anchorDate: "2100-06-01",
    validUntil: "2100-06-01",
    notes: "Nota original da programação",
  };
  const series = await shiftCommand(base.admin, base.patient, "series", body);
  const workspace = await rpc(base.admin, "schedule_workspace", {
    p_patient: base.patient,
    p_from: "2100-06-01",
    p_until: "2100-06-02",
  });
  const shift = workspace.shifts.find(
    (item: { series_id: string }) => item.series_id === series.id,
  );
  const proposal = await shiftCommand(
    first.client,
    base.patient,
    "propose_change",
    {
      id: shift.id,
      professionalId: second.id,
      startsAt: new Date(Date.parse(shift.starts_at) + 3600000).toISOString(),
      endsAt: new Date(Date.parse(shift.ends_at) + 3600000).toISOString(),
      notes: "Nota própria da proposta",
      reason: "Substituição combinada antes do plantão",
    },
    shift.version,
  );
  return { ...base, first, second, names, type, body, shift, proposal };
}
async function login(page: Page, patient: string) {
  const fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/escalas");
  await expect(
    page.getByRole("heading", { name: "Propostas pendentes", exact: true }),
  ).toBeVisible();
}

test("C-FINAL023 escala recupera leitura e preserva foco sem validar fuso proposto como input", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await prepared();
  await login(page, f.patient);
  const original = sql(
    `select to_jsonb(s) from public.scheduled_shifts s where id=${sqlLiteral(f.shift.id)};`,
  );
  let writes = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/schedules" &&
      request.method() !== "GET"
    )
      writes++;
  });
  await page.route(
    "**/api/schedules?**",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Consulta fictícia de escala indisponível",
          code: "READ_UNAVAILABLE",
        }),
      }),
    { times: 1 },
  );
  await page
    .getByRole("group", { name: "Período da escala", exact: true })
    .getByRole("button", { name: /Próxima semana|Próximo mês/ })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Consulta fictícia de escala indisponível" }),
  ).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  const refresh = page.getByRole("button", {
    name: "Atualizar escala",
    exact: true,
  });
  await refresh.focus();
  await refresh.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Propostas pendentes", exact: true }),
  ).toBeVisible();
  await expect(refresh).toBeFocused();
  await page
    .getByRole("button", { name: "Aprovar alteração", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Aprovação de alteração",
    exact: true,
  });
  for (const title of ["Antes da alteração", "Depois da alteração proposta"]) {
    const facts = dialog.getByRole("region", { name: title, exact: true });
    await expect(facts).toContainText(f.shift.timezone);
    await expect(
      facts.locator("input,select,textarea,[aria-invalid]"),
    ).toHaveCount(0);
  }
  await dialog
    .getByLabel("Motivo desta decisão", { exact: true })
    .fill("Motivo próprio ainda não confirmado");
  expect(writes).toBe(0);
  expect(
    sql(
      `select to_jsonb(s) from public.scheduled_shifts s where id=${sqlLiteral(f.shift.id)};`,
    ),
  ).toBe(original);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "immutable schedule read " + width);
  }
});

test("decisão de escala mostra antes/depois completos e aplica a versão apresentada", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const f = await prepared();
  await login(page, f.patient);
  await page
    .getByRole("button", { name: "Aprovar alteração", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Aprovação de alteração",
    exact: true,
  });
  const ownDecisionReason =
    "Decisão própria da família sobre a troca de Sheila para Cíntia, sem reescrever a proposta";
  await dialog
    .getByLabel("Motivo desta decisão", { exact: true })
    .fill(ownDecisionReason);
  await dialog
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar escala",
    exact: true,
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      review.getByRole("region", { name: "Antes da alteração" }),
    ).toContainText(f.names.first);
    await expect(
      review.getByRole("region", { name: "Depois da alteração proposta" }),
    ).toContainText(f.names.second);
    for (const fact of [
      "01/06/2100",
      "02/06/2100",
      "19:00",
      "07:00",
      "20:00",
      "08:00",
      "America/Sao_Paulo",
      "Nota original da programação",
      "Nota própria da proposta",
      "Não há atribuição de BAL ativa",
    ])
      await expect(review).toContainText(fact);
    await expect(review.locator("input,select")).toHaveCount(0);
    await audit(page, "D1 schedule decision " + width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(
      review.getByRole("button", { name: "Aprovar proposta", exact: true }),
    ).toBeInViewport({ ratio: 1 });
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/schedule-decision-${info.project.name}.png`,
    animations: "disabled",
  });
  const posted = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname ===
        "/api/schedules/resource-preparations/commit",
  );
  const completed = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname ===
        "/api/schedules/resource-preparations/commit",
  );
  await review
    .getByRole("button", { name: "Aprovar proposta", exact: true })
    .click();
  const confirmation = await completed;
  expect(confirmation.status()).toBe(200);
  expect((await confirmation.json()).data.receipt.nativeResult.status).toBe(
    "approved",
  );
  const payload = (await posted).postDataJSON();
  expect(payload.expectedVersion).toBe(f.proposal.version);
  expect(Object.keys(payload.command.body).sort()).toEqual([
    "approve",
    "id",
    "reason",
  ]);
  expect(payload.command.body.reason).toBe(ownDecisionReason);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    sql(
      `select professional_id::text from public.scheduled_shifts where id=${sqlLiteral(f.shift.id)};`,
    ),
  ).toBe(f.second.id);
  expect(
    sql(
      `select status from public.shift_change_requests where id=${sqlLiteral(f.proposal.id)};`,
    ),
  ).toBe("approved");
  const applied = JSON.parse(
    sql(
      `select to_jsonb(s) from public.scheduled_shifts s where id=${sqlLiteral(f.shift.id)};`,
    ),
  );
  expect(Date.parse(applied.starts_at)).toBe(
    Date.parse(f.shift.starts_at) + 3600000,
  );
  expect(Date.parse(applied.ends_at)).toBe(
    Date.parse(f.shift.ends_at) + 3600000,
  );
  expect(applied.timezone).toBe("America/Sao_Paulo");
  expect(
    sql(
      `select reason from public.shift_change_requests where id=${sqlLiteral(f.proposal.id)};`,
    ),
  ).toBe("Substituição combinada antes do plantão");
  expect(
    sql(
      `select notes from public.shift_change_requests where id=${sqlLiteral(f.proposal.id)};`,
    ),
  ).toBe("Nota própria da proposta");
  expect(
    sql(
      `select reason from public.shift_events where shift_id=${sqlLiteral(f.shift.id)} and action='schedule.change_decided' order by created_at desc limit 1;`,
    ),
  ).toBe(ownDecisionReason);
});

test("conflito mantém a revisão visível e não aprova a nova versão automaticamente", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await prepared();
  await login(page, f.patient);
  await page
    .getByRole("button", { name: "Aprovar alteração", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Aprovação de alteração", exact: true })
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar escala",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Aprovar proposta", exact: true }),
  ).toBeEnabled();
  let changedVersion = 0;
  await page.route(
    "**/api/schedules/resource-preparations/commit",
    async (route) => {
      const changed = await shiftCommand(
        f.admin,
        f.patient,
        "change",
        {
          id: f.shift.id,
          reason: "Alteração concorrente após abertura da revisão",
          notes: "Nota da alteração concorrente válida",
        },
        f.shift.version,
      );
      changedVersion = changed.version;
      await route.continue();
    },
    { times: 1 },
  );
  const response = page.waitForResponse(
    (result) =>
      result.request().method() === "POST" &&
      new URL(result.url()).pathname ===
        "/api/schedules/resource-preparations/commit",
  );
  await dialog
    .getByRole("button", { name: "Aprovar proposta", exact: true })
    .click();
  const recorded = await response;
  expect(recorded.status()).toBe(200);
  expect((await recorded.json()).data.receipt.nativeResult.status).toBe(
    "obsolete",
  );
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Nota original da programação");
  await expect(dialog).toContainText("Nota própria da proposta");
  await expect(
    dialog.getByRole("button", { name: "Aprovar proposta", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "Fechar revisão e atualizar",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    sql(
      `select status from public.shift_change_requests where id=${sqlLiteral(f.proposal.id)};`,
    ),
  ).toBe("obsolete");
  const after = JSON.parse(
    sql(
      `select to_jsonb(s) from public.scheduled_shifts s where id=${sqlLiteral(f.shift.id)};`,
    ),
  );
  expect(after.version).toBe(changedVersion);
  expect(after.professional_id).toBe(f.first.id);
});

test("a vista mensal móvel conserva o período e os plantões de dias diferentes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await prepared();
  await shiftCommand(f.admin, f.patient, "series", {
    ...f.body,
    anchorDate: "2100-06-25",
    validUntil: "2100-06-25",
  });
  await login(page, f.patient);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Data de referência", { exact: true })
    .fill("2100-06-01");
  await page.getByLabel("Visualização", { exact: true }).selectOption("month");
  const period = page.getByRole("group", {
    name: "Período da escala",
    exact: true,
  });
  await expect(period).toContainText("01/06/2100 a 30/06/2100");
  await expect(
    page
      .getByRole("article", {
        name: f.type.name + " · " + f.names.first,
        exact: true,
      })
      .filter({ visible: true }),
  ).toHaveCount(2);
  await period
    .getByRole("button", { name: "Próximo mês", exact: true })
    .click();
  await expect(period).toContainText("01/07/2100 a 31/07/2100");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("a decisão expõe o BAL vigente e exige o processo familiar antes de mudar sua janela", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await balanceSetup();
  const workspace = await rpc(f.admin, "schedule_workspace", {
    p_patient: f.patient,
    p_from: f.today,
    p_until: f.today,
  });
  const shift = workspace.shifts.find(
    (item: { professional_id: string; status: string }) =>
      item.professional_id === f.pro.id && item.status === "published",
  );
  await shiftCommand(
    f.pro.client,
    f.patient,
    "propose_change",
    {
      id: shift.id,
      startsAt: new Date(Date.parse(shift.starts_at) + 3_600_000).toISOString(),
      endsAt: new Date(Date.parse(shift.ends_at) + 3_600_000).toISOString(),
      reason: "Mudança de janela que exige decisão familiar",
    },
    shift.version,
  );
  await login(page, f.patient);
  await page
    .getByRole("button", { name: "Aprovar alteração", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Aprovação de alteração", exact: true })
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar escala",
    exact: true,
  });
  await expect(
    dialog.getByRole("region", { name: "Consequências para o BAL" }),
  ).toContainText("Existe BAL designado com janela vigente");
  await expect(dialog).toContainText("esta aprovação não pode adiar o prazo");
  await expect(
    dialog.getByRole("button", { name: "Aprovar proposta", exact: true }),
  ).toBeDisabled();
  await audit(page, "D1 schedule decision with active BAL");
});
