import { expect, test, type Page } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { balanceSetup, dayOffset, localToday, shiftCommand, shiftWorker } from "../integration/shift-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

test("horários da residência governam plantão isolado, exceção noturna e repetição sem data final", async ({ page }, info) => {
  test.setTimeout(120_000);
  const fixture = await setup();
  const admin = await shiftWorker(fixture.patient, "admin");
  const worker = await shiftWorker(fixture.patient);
  const type = await shiftCommand(admin.client, fixture.patient, "type", {
    name: "Plantão da residência", startsLocal: "08:17", durationMinutes: 720,
  });
  const day = dayOffset(localToday(), 10);
  const recurringDay = dayOffset(day, 7);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(admin.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, fixture.patient);
  await page.goto("/escalas?day=" + day);
  const create = page.getByRole("button", { name: "Nova programação", exact: true });
  const configure = page.getByRole("link", { name: "Configurar horários da residência", exact: true });
  await expect(configure).toBeVisible();
  await expect(create).toBeDisabled();
  await expect(page.getByLabel("Data de referência", { exact: true })).toHaveValue(day);
  const rejected = await page.request.post("/api/schedules", {
    data: {
      careRecipientId: fixture.patient,
      idempotencyKey: crypto.randomUUID(),
      command: { action: "series", body: {
        professionalId: worker.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo",
        recurrence: "once", weekdays: [], anchorDate: day, validUntil: day, notes: "",
      } },
    },
  });
  expect(rejected.status()).toBe(409);
  await expect(configure).toHaveAttribute("href", new RegExp("day=" + day + "#horarios-da-residencia$"));
  await configure.click();
  const settings = page.getByRole("region", { name: "Horários dos plantões", exact: true });
  await settings.getByRole("button", { name: "Editar horários", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Horários da residência", exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox", { name: "Fuso da residência", exact: true }).fill("America/Manaus");
  await editor.getByLabel(/^Início diurno/).fill("06:25");
  await editor.getByLabel(/^Início noturno/).fill("20:40");
  await rpc(admin.client, "set_schedule_residence", {
    p_patient: fixture.patient, p_body: { timezone: "America/Manaus", dayStart: "07:10", nightStart: "19:15" },
    p_version: null, p_key: crypto.randomUUID(),
  });
  await editor.getByRole("button", { name: "Registrar horários", exact: true }).click();
  await expect(editor).toContainText("Diurno 07:10 · Noturno 19:15 · America/Manaus");
  await editor.getByRole("button", { name: "Adotar versão atual e manter meus horários", exact: true }).click();
  await expect(editor.getByLabel(/^Início diurno/)).toHaveValue("06:25");
  await expect(editor.getByLabel(/^Início noturno/)).toHaveValue("20:40");
  const receipt = page.waitForResponse(response => new URL(response.url()).pathname === "/api/schedules/residence"
    && response.request().method() === "POST");
  await editor.getByRole("button", { name: "Registrar horários", exact: true }).click();
  expect((await receipt).ok()).toBe(true);
  await expect(settings).toContainText("Diurno 06:25 · Noturno 20:40 · America/Manaus");

  await page.getByRole("link", { name: "Voltar à agenda", exact: true }).click();
  await expect(page.getByLabel("Data de referência", { exact: true })).toHaveValue(day);
  await expect(configure).toHaveCount(0);
  await expect(create).toBeEnabled();
  await create.click();
  const form = page.getByRole("dialog", { name: "Programação de plantões", exact: true });
  await expect(form.getByLabel("Data do plantão", { exact: true })).toHaveValue(day);
  await form.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(create).toBeFocused();
  await create.click();
  await form.getByLabel("Profissional", { exact: true }).selectOption(worker.id);
  await form.getByLabel("Tipo de plantão", { exact: true }).selectOption(type.id);
  await expect(form.getByLabel("Data do plantão", { exact: true })).toHaveValue(day);
  await expect(form).toContainText("06:25 às 18:25");
  await expect(form.getByLabel("Fuso horário", { exact: true })).toHaveCount(0);
  await form.getByLabel("Período", { exact: true }).selectOption("night");
  await expect(form).toContainText("20:40 às 08:40");
  await form.getByRole("switch", { name: "Horário especial", exact: true }).check();
  await form.getByLabel("Início", { exact: true }).fill("21:45");
  await expect(form.getByRole("button", { name: "Revisar alteração", exact: true })).toBeDisabled();
  await form.getByLabel("Término", { exact: true }).fill("06:15");
  await expect(form).toContainText("Término no dia seguinte.");
  await page.setViewportSize({ width: 390, height: 844 });
  await audit(page, "horário especial de plantão");
  await info.attach("horario-especial", { body: await form.screenshot(), contentType: "image/png" });
  const confirmation = page.getByRole("dialog", { name: "Revisar escala", exact: true });
  await form.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await expect(confirmation).toContainText("21:45 às 06:15 · término no dia seguinte");
  await confirmation.getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  await expect(page.getByText("Programação de plantões registrada.", { exact: true })).toBeVisible();
  await expect(form).toHaveCount(0);

  const read = (from: string) => page.request.get("/api/schedules?" + new URLSearchParams({
    careRecipientId: fixture.patient, from, until: dayOffset(from, 3),
  }));
  const single = await read(day);
  expect(single.ok()).toBe(true);
  const one = (await single.json()).data.shifts;
  expect(one).toHaveLength(1);
  expect(one[0]).toMatchObject({ timezone: "America/Manaus", professional_id: worker.id });
  expect(new Date(one[0].starts_at).toISOString()).toBe(dayOffset(day, 1) + "T01:45:00.000Z");
  expect(new Date(one[0].ends_at).toISOString()).toBe(dayOffset(day, 1) + "T10:15:00.000Z");

  const cycleType = await shiftCommand(admin.client, fixture.patient, "type", {
    name: "Ciclo de 8 por 40", durationMinutes: 480, restHours: 40,
  });
  await page.goto("/escalas?day=" + recurringDay);
  await page.getByRole("button", { name: "Nova programação", exact: true }).click();
  await form.getByRole("button", { name: "Reconhecer resultado e começar outro preenchimento", exact: true }).click();
  await form.getByRole("switch", { name: "Com repetição", exact: true }).check();
  await form.getByLabel("Tipo da escala", { exact: true }).selectOption(cycleType.id);
  await expect(form).toContainText("8h de trabalho e 40h de descanso por ciclo.");
  await expect(form.getByLabel("Regime", { exact: true })).toHaveCount(0);
  await form.getByLabel("Profissional", { exact: true }).selectOption(worker.id);
  await expect(form.getByRole("switch", { name: "Definir data de término", exact: true })).not.toBeChecked();
  await expect(form.getByLabel("Último dia", { exact: true })).toHaveCount(0);
  await form.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await expect(confirmation).toContainText("sem data de término");
  await expect(confirmation).toContainText("8 horas de trabalho / 40 horas de descanso");
  await confirmation.getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  await expect(page.getByText("Programação de plantões registrada.", { exact: true })).toBeVisible();
  const repeated = await read(recurringDay);
  expect(repeated.ok()).toBe(true);
  const data = (await repeated.json()).data;
  expect(data.series.some((row: { open_ended: boolean; recurrence: string }) => row.open_ended && row.recurrence === "cycle")).toBe(true);
  expect(data.shifts).toHaveLength(2);
  expect(Date.parse(data.shifts[0].starts_at)).toBe(Date.parse(`${recurringDay}T10:25:00Z`));
  expect(Date.parse(data.shifts[0].ends_at) - Date.parse(data.shifts[0].starts_at)).toBe(8 * 3_600_000);
  expect(Date.parse(data.shifts[1].starts_at) - Date.parse(data.shifts[0].starts_at)).toBe(48 * 3_600_000);
});

test("cancelar plantão com BAL exige encaminhar a contagem e confirma os dois atos", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await balanceSetup({ stableCurrentWindow: true });
  const admin = await shiftWorker(fixture.patient, "admin");
  const before = await rpc(admin.client, "balance_workspace", { p_patient: fixture.patient });
  const assignment = before.eligibility.assignment;
  const target = before.targets.find((shift: { starts_at: string }) => Date.parse(shift.starts_at) >= Date.parse(assignment.ends_at));

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(admin.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, fixture.patient);
  await page.goto(`/escalas?day=${fixture.today}`);
  const shiftCard = page.locator(`article[data-shift-id="${assignment.shift_id}"]`);
  const linked = shiftCard.getByRole("button", { name: "Balanço neste plantão", exact: true });
  await linked.click();
  const balance = page.getByRole("dialog", { name: /^Balanço de / });
  await expect(balance.getByText("Responsável", { exact: true })).toBeVisible();
  await expect(balance.getByText("Prazo atual", { exact: true })).toBeVisible();
  await expect(balance.getByRole("link", { name: "Iniciar balanço", exact: true })).toHaveCount(0);
  await expect(balance.getByRole("link", { name: "Acompanhar balanços", exact: true })).toBeVisible();
  await balance.getByRole("button", { name: "Fechar detalhes do balanço", exact: true }).click();
  await expect(linked).toBeFocused();
  await shiftCard.getByRole("button", { name: /^Ações do plantão de / }).click();
  await page.getByRole("dialog", { name: /^Plantão de / }).getByRole("button", { name: "Cancelar este plantão", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Cancelar este plantão", exact: true });
  await expect(editor.getByRole("combobox", { name: "Operação", exact: true })).toHaveCount(0);
  await expect(editor.getByText(/O cancelamento vale para esta ocorrência/)).toBeVisible();
  const review = editor.getByRole("button", { name: "Continuar cancelamento", exact: true });
  await expect(review).toBeDisabled();
  await editor.getByRole("textbox", { name: "Justificativa", exact: true }).fill("Ausência confirmada pela família");
  const impact = editor.getByRole("region", { name: "Impacto em balanço", exact: true });
  await expect(impact).toContainText("Ainda não contado");
  await impact.getByRole("combobox", { name: "O que fazer com o balanço", exact: true }).selectOption("defer");
  await impact.getByRole("combobox", { name: "Plantão de destino da contagem", exact: true }).selectOption(target.id);
  const reason = "Cobertura confirmada para o plantão seguinte";
  await impact.getByRole("textbox", { name: "Motivo da decisão sobre o balanço", exact: true }).fill(reason);
  await review.click();
  const confirmation = page.getByRole("dialog", { name: "Revisar escala", exact: true });
  await expect(confirmation).toContainText(reason);
  const response = page.waitForResponse(result => result.request().method() === "POST" &&
    new URL(result.url()).pathname === "/api/schedules/resource-preparations/commit");
  await confirmation.getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  expect((await response).ok()).toBe(true);
  const final = await rpc(admin.client, "balance_workspace", { p_patient: fixture.patient });
  expect(final.eligibility.assignment.shift_id).toBe(target.id);
  expect(final.assignments.find((row: { id: string }) => row.id === assignment.id).status).toBe("deferred");
  await expect(page.getByText("Operação da agenda registrada e conferida.", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(linked).toHaveCount(0);
  const nextDay = new Intl.DateTimeFormat("sv-SE", { timeZone: target.timezone }).format(new Date(target.starts_at));
  await page.getByLabel("Data de referência", { exact: true }).fill(nextDay);
  await expect(page.locator(`article[data-shift-id="${target.id}"]`)
    .getByRole("button", { name: "Balanço neste plantão", exact: true })).toBeVisible();
});

test("atalho do balanço usa a atribuição autorizada e recusa uma referência vencida", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const f = await balanceSetup({ stableCurrentWindow: true });
  const workspace = await rpc(f.pro.client, "balance_workspace", { p_patient: f.patient });
  const expected = workspace.eligibility.assignment;
  const agendaUrl = "/escalas?" + new URLSearchParams({ careRecipientId: f.patient, day: f.today });
  const readUrl = "/api/balances?" + new URLSearchParams({ careRecipientId: f.patient, view: "agenda" });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.pro.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, f.patient);
  await page.goto(agendaUrl);
  const read = await page.request.get(readUrl);
  expect(read.ok()).toBe(true);
  const snapshot = await read.json();
  expect(Object.keys(snapshot.data)).toEqual(["eligibility"]);
  expect(snapshot.data.eligibility.assignment.id).toBe(expected.id);
  const card = page.locator(`article[data-shift-id="${expected.shift_id}"]`);
  await card.getByRole("button", { name: "Balanço neste plantão", exact: true }).click();
  const balance = page.getByRole("dialog", { name: /^Balanço de / });
  await expect(balance.getByText("Disponível para você", { exact: true })).toBeVisible();
  const start = balance.getByRole("link", { name: "Iniciar balanço", exact: true });
  const href = new URL((await start.getAttribute("href"))!, page.url());
  expect(href.searchParams.get("assignmentId")).toBe(expected.id);
  expect(href.searchParams.get("assignmentVersion")).toBe(String(expected.version));
  await page.setViewportSize({ width: 320, height: 860 });
  await audit(page, "L3 balanço vinculado ao plantão");
  const frame = await balance.boundingBox();
  const footer = await balance.locator(".hca-modal-footer").boundingBox();
  expect(frame).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(frame!.y).toBeGreaterThanOrEqual(58);
  expect(frame!.y + frame!.height - footer!.y - footer!.height).toBeLessThanOrEqual(2);
  await balance.screenshot({ path: test.info().outputPath("balanco-no-plantao.png"), animations: "disabled" });
  await start.click();
  await expect(page.getByRole("button", { name: "Iniciar contagem", exact: true })).toBeVisible();
  href.searchParams.set("assignmentVersion", String(expected.version + 1));
  await page.goto(href.href);
  await expect(page.getByRole("alert").filter({ hasText: "A atribuição mudou" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar contagem", exact: true })).toHaveCount(0);

  const coworker = await shiftWorker(f.patient);
  sql(`insert into public.capability_overrides (care_recipient_id,subject_user,capability,enabled) values
    (${q(f.patient)},${q(coworker.id)},'schedule.read.team',false),
    (${q(f.patient)},${q(coworker.id)},'schedule.read.own',true);`);
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto(new URL("/login", page.url()).href);
    await other.getByLabel("E-mail", { exact: true }).fill(coworker.email);
    await other.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await other.getByRole("button", { name: "Entrar", exact: true }).click();
    await selectContext(other, f.patient);
    const endpoint = new URL(readUrl, other.url()).href;
    const limited = await other.request.get(endpoint);
    expect(limited.status()).toBe(200);
    expect((await limited.json()).data.eligibility.assignment).toBeNull();
    sql(`insert into public.capability_overrides (care_recipient_id,subject_user,capability,enabled)
      values(${q(f.patient)},${q(coworker.id)},'bal.read',false);`);
    const denied = await other.request.get(endpoint);
    expect(denied.status()).toBe(403);
    expect((await denied.json()).data).toBeUndefined();
  } finally {
    await otherContext.close();
  }
});

test("ações da agenda separam troca, horário, encerramento e pedido de alteração", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const f = await setup();
  const [admin, worker, substitute] = await Promise.all([
    shiftWorker(f.patient, "admin"), shiftWorker(f.patient), shiftWorker(f.patient),
  ]);
  const firstDay = "2100-07-01", lastDay = dayOffset(firstDay, 3);
  const type = await shiftCommand(admin.client, f.patient, "type", {
    name: "Plantão das ações", startsLocal: "07:00", durationMinutes: 720,
  });
  const series = await shiftCommand(admin.client, f.patient, "series", {
    professionalId: worker.id, shiftTypeId: type.id, timezone: "America/Sao_Paulo",
    recurrence: "weekly", weekdays: [0, 1, 2, 3, 4, 5, 6], anchorDate: firstDay, validUntil: lastDay, notes: "Escala original",
  });
  const agenda = (day: string) => "/escalas?" + new URLSearchParams({ careRecipientId: f.patient, day });
  const shifts = async () => (await rpc(admin.client, "schedule_workspace", {
    p_patient: f.patient, p_from: firstDay, p_until: lastDay,
  })).shifts;
  const before = await shifts();
  expect(before).toHaveLength(4);

  async function login(actorPage: Page, email: string) {
    await actorPage.getByLabel("E-mail", { exact: true }).fill(email);
    await actorPage.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await actorPage.getByRole("button", { name: "Entrar", exact: true }).click();
    await selectContext(actorPage, f.patient);
  }
  async function openActions(actorPage: Page, id: string) {
    await actorPage.locator(`article[data-shift-id="${id}"]`).getByRole("button", { name: /^Ações do plantão de / }).click();
    return actorPage.getByRole("dialog", { name: /^Plantão de / });
  }
  const confirm = async (actorPage: Page) => {
    const review = actorPage.getByRole("dialog", { name: "Revisar escala", exact: true });
    const committed = actorPage.waitForResponse(response => response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/schedules/resource-preparations/commit");
    await review.getByRole("button", { name: "Confirmar gravação", exact: true }).click();
    expect((await committed).status()).toBe(200);
    await expect(actorPage.getByRole("dialog")).toHaveCount(0);
  };
  await page.goto("/login");
  await login(page, admin.email);
  await page.goto(agenda(firstDay));
  const options = await openActions(page, before[0].id);
  await expect(options.locator(".hca-shift-action-list button")).toHaveText([
    "Trocar profissional", "Alterar horário", "Cancelar este plantão", "Encerrar próximos plantões",
  ]);
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 860 });
    const firstAction = options.getByRole("button", { name: "Trocar profissional", exact: true });
    await expect(firstAction).toHaveCSS("display", "grid");
    await expect(firstAction).toHaveCSS("min-height", "58px");
    await audit(page, `L3 ações do plantão ${width}`);
    const path = info.outputPath(`acoes-plantao-${width}.png`);
    await options.screenshot({ path, animations: "disabled" });
    await info.attach(`acoes-plantao-${width}`, { path, contentType: "image/png" });
  }
  await options.getByRole("button", { name: "Trocar profissional", exact: true }).click();
  const replace = page.getByRole("dialog", { name: "Trocar profissional", exact: true });
  await replace.getByLabel("Novo profissional", { exact: true }).selectOption(substitute.id);
  await replace.getByRole("textbox", { name: "Justificativa", exact: true }).fill("Cobertura pontual confirmada");
  await replace.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  let allowCommit!: () => void;
  const commitGate = new Promise<void>(resolve => { allowCommit = resolve; });
  const initiated = page.waitForRequest(request => request.method() === "POST" &&
    new URL(request.url()).pathname === "/api/schedules/resource-preparations/commit");
  await page.route("**/api/schedules/resource-preparations/commit", async route => {
    await commitGate;
    await route.continue();
  }, { times: 1 });
  await Promise.all([confirm(page), (async () => {
    try {
      await initiated;
      await expect(page.locator(".hca-activity-overlay")).toBeVisible();
      await expect(page.getByText("Tentativa de agenda preservada", { exact: true })).toHaveCount(0);
    } finally { allowCommit(); }
  })()]);
  const replaced = await shifts();
  expect(replaced[0]).toMatchObject({ id: before[0].id, series_id: series.id, professional_id: substitute.id, starts_at: before[0].starts_at, ends_at: before[0].ends_at });
  expect(replaced.slice(1)).toEqual(before.slice(1));

  const secondDay = dayOffset(firstDay, 1);
  await page.goto(agenda(secondDay));
  await (await openActions(page, before[1].id)).getByRole("button", { name: "Alterar horário", exact: true }).click();
  const change = page.getByRole("dialog", { name: "Alterar horário", exact: true });
  await expect(change.getByLabel("Profissional de destino", { exact: true })).toHaveCount(0);
  await change.getByLabel("Início do plantão", { exact: true }).fill(secondDay + "T08:00");
  await change.getByLabel("Fim do plantão", { exact: true }).fill(secondDay + "T20:00");
  await change.getByRole("textbox", { name: "Justificativa", exact: true }).fill("Novo horário combinado");
  await change.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await confirm(page);
  const changed = await shifts();
  expect(changed[1]).toMatchObject({ id: before[1].id, professional_id: worker.id });
  expect(new Date(changed[1].starts_at).toISOString()).toBe(secondDay + "T11:00:00.000Z");

  const workerContext = await browser.newContext();
  try {
    const ownPage = await workerContext.newPage();
    await ownPage.goto(new URL("/login", page.url()).href);
    await login(ownPage, worker.email);
    await ownPage.goto(new URL(agenda(dayOffset(firstDay, 2)), page.url()).href);
    const ownActions = await openActions(ownPage, before[2].id);
    await expect(ownActions.locator(".hca-shift-action-list button")).toHaveText(["Pedir alteração"]);
    await ownActions.getByRole("button", { name: "Pedir alteração", exact: true }).click();
    const request = ownPage.getByRole("dialog", { name: "Pedir alteração", exact: true });
    await request.getByLabel("Início do plantão", { exact: true }).fill(dayOffset(firstDay, 2) + "T08:00");
    await request.getByRole("textbox", { name: "Justificativa", exact: true }).fill("Solicitação da equipe para rever o horário");
    await request.getByRole("button", { name: "Revisar alteração", exact: true }).click();
    await confirm(ownPage);
    await expect(ownPage.getByText("Proposta de alteração enviada; aguarda decisão autorizada.", { exact: true })).toBeVisible();
    expect(await shifts()).toEqual(changed);
  } finally { await workerContext.close(); }

  await page.goto(agenda(lastDay));
  await (await openActions(page, before[3].id)).getByRole("button", { name: "Encerrar próximos plantões", exact: true }).click();
  const end = page.getByRole("dialog", { name: "Encerrar próximos plantões", exact: true });
  const cutoff = end.getByLabel("Encerrar a partir de", { exact: true });
  await expect(cutoff).toHaveValue(lastDay);
  await end.getByRole("textbox", { name: "Justificativa", exact: true }).fill("Encerramento das ocorrências restantes");
  await cutoff.fill(dayOffset(localToday(), -1));
  const reviewEnd = end.getByRole("button", { name: "Revisar alteração", exact: true });
  await reviewEnd.click();
  await expect(end.getByRole("alert").filter({ hasText: "Escolha uma data que preserve os plantões já iniciados." })).toBeVisible();
  expect(await shifts()).toEqual(changed);
  await cutoff.fill(lastDay);
  await reviewEnd.click();
  const review = page.getByRole("dialog", { name: "Revisar escala", exact: true });
  await expect(review.getByText(/Encerrar a partir de 04\/07\/2100/)).toBeVisible();
  await confirm(page);
  const ended = await shifts();
  expect(ended.slice(0, 3)).toEqual(changed.slice(0, 3));
  expect(ended[3]).toMatchObject({ id: before[3].id, status: "cancelled" });
});
