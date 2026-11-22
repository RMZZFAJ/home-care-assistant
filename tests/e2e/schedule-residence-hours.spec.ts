import { expect, test } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup } from "../integration/v4-fixtures.mjs";
import { dayOffset, localToday, shiftCommand, shiftWorker } from "../integration/shift-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

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
  await page.goto("/configuracoes");
  const settings = page.getByRole("region", { name: "Horários dos plantões", exact: true });
  await settings.getByRole("button", { name: "Editar horários", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Horários da residência", exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox", { name: "Fuso da residência", exact: true }).fill("America/Manaus");
  await editor.getByLabel(/^Início diurno/).fill("06:25");
  await editor.getByLabel(/^Início noturno/).fill("20:40");
  const receipt = page.waitForResponse(response => new URL(response.url()).pathname === "/api/schedules/residence"
    && response.request().method() === "POST");
  await editor.getByRole("button", { name: "Registrar horários", exact: true }).click();
  expect((await receipt).ok()).toBe(true);
  await expect(settings).toContainText("Diurno 06:25 · Noturno 20:40 · America/Manaus");

  await page.goto("/escalas?day=" + day);
  const create = page.getByRole("button", { name: "Nova programação", exact: true });
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

  await page.goto("/escalas?day=" + recurringDay);
  await page.getByRole("button", { name: "Nova programação", exact: true }).click();
  await form.getByRole("button", { name: "Reconhecer resultado e começar outro preenchimento", exact: true }).click();
  await form.getByRole("switch", { name: "Com repetição", exact: true }).check();
  await form.getByLabel("Tipo da escala", { exact: true }).selectOption(type.id);
  await form.getByLabel("Profissional", { exact: true }).selectOption(worker.id);
  await expect(form.getByRole("switch", { name: "Definir data de término", exact: true })).not.toBeChecked();
  await expect(form.getByLabel("Último dia", { exact: true })).toHaveCount(0);
  await form.getByRole("button", { name: "Revisar alteração", exact: true }).click();
  await expect(confirmation).toContainText("sem data de término");
  await confirmation.getByRole("button", { name: "Confirmar gravação", exact: true }).click();
  await expect(page.getByText("Programação de plantões registrada.", { exact: true })).toBeVisible();
  const repeated = await read(recurringDay);
  expect(repeated.ok()).toBe(true);
  const data = (await repeated.json()).data;
  expect(data.series.some((row: { open_ended: boolean; recurrence: string }) => row.open_ended && row.recurrence === "cycle")).toBe(true);
  expect(data.shifts).toHaveLength(2);
  expect(Date.parse(data.shifts[1].starts_at) - Date.parse(data.shifts[0].starts_at)).toBe(48 * 3_600_000);
});
