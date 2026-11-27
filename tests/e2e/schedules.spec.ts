import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftCommand } from "../integration/shift-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";
import { openScheduleTypeSettings } from "./schedule-private-area";

test("agenda publica uma programação real, recusa conflito e preserva contexto no mobile", async ({ page }, info) => {
  test.setTimeout(90_000);
  // A private creator slot belongs to the account/patient across devices.
  // Each engine must start with its own patient, without erasing another result.
  const { patient: patientA, admin } = await setup();
  const longName = "Escala" + "Noturna".repeat(12);
  await shiftCommand(admin, patientA, "type", {
    name: longName, startsLocal: "21:00", durationMinutes: 480, active: false,
  });
  await rpc(admin, "set_schedule_residence", {
    p_patient: patientA, p_body: { timezone: "America/Sao_Paulo", dayStart: "07:00", nightStart: "19:00" },
    p_version: null, p_key: randomUUID(),
  });
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patientA);
  await page.goto("/escalas");
  await expect(page.getByRole("heading", { name: "Plantões e balanços", exact: true })).toBeVisible();
  // Unique future date keeps retained local histories from overlapping test runs.
  const date = new Date(Date.UTC(2100, 0, 1 + Math.floor(Math.random() * 30000))).toISOString().slice(0, 10);
  await page.getByLabel("Data de referência", { exact: true }).fill(date);
  await expect(page.getByRole("button", { name: "Novo tipo de plantão", exact: true })).toHaveCount(0);
  await openScheduleTypeSettings(page);
  const suffix = randomUUID().slice(0, 8), name = "Plantão fictício " + suffix;
  await page.getByRole("button", { name: "Novo tipo de plantão", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Tipo de plantão", exact: true });
  await drawer.getByLabel("Nome do plantão", { exact: true }).fill(name);
  await expect(drawer.getByLabel("Início local", { exact: true })).toHaveCount(0);
  const duration = drawer.getByLabel("Horas de trabalho", { exact: true });
  await duration.fill("12.5"); expect(await duration.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false);
  await duration.fill("12"); expect(await duration.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true);
  await drawer.getByLabel("Horas de descanso", { exact: true }).fill("36");
  expect(await drawer.locator('input[name="end"], input[name="endsLocal"]').count()).toBe(0);
  await audit(page,"shift type drawer");
  await expect(drawer.getByLabel("Nome do plantão", { exact: true })).toHaveValue(name);
  await drawer.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await page.getByRole("dialog", { name: "Revisar escala", exact: true }).getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  await expect(page.getByText("Tipo de plantão registrado.", { exact: true })).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Tipos de plantão", exact: true })).toContainText(name);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 900 });
  const longType = page.getByRole("article", { name: longName, exact: true });
  await expect(longType).toContainText("Indisponível");
  await expect(longType.getByRole("button", { name: "Editar tipo", exact: true })).toBeEnabled();
  await auditFromTop(page, "configuração de tipos com nome longo em 320 px");
  await page.setViewportSize(viewport);
  await page.getByRole("link", { name: "Voltar à agenda", exact: true }).click();
  await expect(page.getByLabel("Data de referência", { exact: true })).toHaveValue(date);
  await page.getByRole("button", { name: "Nova programação", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Programação de plantões", exact: true });
  await form.getByLabel("Profissional", { exact: true }).selectOption(fixture.professional.id);
  await form.getByLabel("Tipo de plantão", { exact: true }).selectOption({ label: name + " · 12h × 36h" });
  await form.getByLabel("Período", { exact: true }).selectOption("night");
  await form.getByLabel("Data do plantão", { exact: true }).fill(date);
  await form.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await page.getByRole("dialog", { name: "Revisar escala", exact: true }).getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  await expect(page.getByText("Programação de plantões registrada.", { exact: true })).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Data de referência", { exact: true }).fill(date);
  await page.getByLabel("Visualização", { exact: true }).selectOption("week");
  await expect(page.getByRole("article", { name: name + " · Teste professional", exact: true }).filter({ visible: true })).toContainText("Publicado");
  const end = new Date(date + "T12:00:00Z"); end.setUTCDate(end.getUTCDate() + 1);
  const stored = await page.request.get("/api/schedules?" + new URLSearchParams({ careRecipientId: patientA, from: date, until: end.toISOString().slice(0, 10) }));
  expect(stored.ok()).toBe(true);
  const data = (await stored.json()).data;
  const shift = data.shifts.find((s: { type_name: string }) => s.type_name === name);
  expect(Date.parse(shift.ends_at) - Date.parse(shift.starts_at)).toBe(720 * 60_000);
  expect(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(shift.ends_at))).toBe(end.toISOString().slice(0, 10));
  const shiftTypeVersion = data.types.find((type: { id: string }) => type.id === shift.shift_type_id).version;
  const overlap = await page.request.post("/api/schedules", { data: { careRecipientId: patientA, idempotencyKey: randomUUID(), command: { action: "series", body: { professionalId: fixture.professional.id, shiftTypeId: shift.shift_type_id, shiftTypeVersion, timezone: "America/Sao_Paulo", recurrence: "once", weekdays: [], anchorDate: date, validUntil: date, notes: "Conflito deve ser recusado", residenceHours: { version: 1, period: "night", startsLocal: "19:00", endsLocal: null } } } } });
  expect(overlap.status()).toBe(409);
  await page.setViewportSize({ width: 1366, height: 900 });
  const agenda = page.locator(".hca-agenda-desktop");
  await expect(agenda).toHaveAttribute("tabindex", "0");
  await agenda.focus();await expect(agenda).toBeFocused();
  const scrollBefore = await agenda.evaluate(element => element.scrollLeft);
  await agenda.press("ArrowRight");
  await expect.poll(() => agenda.evaluate(element => element.scrollLeft)).toBeGreaterThan(scrollBefore);
  mkdirSync("output/playwright/fluent", { recursive: true });
  await page.screenshot({ path: `output/playwright/fluent/escalas-desktop-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(agenda).not.toHaveAttribute("tabindex", "0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole("article", { name: name + " · Teste professional", exact: true }).filter({ visible: true })).toBeVisible();
  await page.screenshot({ path: `output/playwright/fluent/escalas-mobile-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  await auditFromTop(page,"daily mobile schedule");
  const cancel = await page.request.post("/api/schedules", { data: { careRecipientId: patientA, idempotencyKey: randomUUID(), expectedVersion: shift.version, command: { action: "cancel", body: { id: shift.id, reason: "Fim da verificação fictícia" } } } });
  expect(cancel.ok()).toBe(true);
});
