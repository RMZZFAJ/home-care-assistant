import { startFocusProbe, attachFocusProbe } from "./focus-diagnostics";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  selectedDatesFixture,
  chosenDates,
  datePacket,
  datesState,
  conflictingOtherPatient,
  rpc,
} from "../integration/selected-dates-fixtures.mjs";
import {
  newWindowRecount,
  recountState,
} from "../integration/bal-recount-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { ScheduledShift } from "../../src/types/schedules";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
const edit = (page: Page) =>
  page.getByRole("dialog", { name: "Programação de plantões", exact: true });
const review = (page: Page) =>
  page.getByRole("dialog", { name: "Revisar escala", exact: true });
async function login(
  page: Page,
  patient: string,
  email = fixtures.adminA.email,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function withinDrawer(drawer: Locator, label: string) {
  const outside = await drawer.evaluate((root) => {
    const edge = root.getBoundingClientRect();
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        "button,input,select,textarea,.hca-date-grid,.hca-field,dl,li,p",
      ),
    )
      .filter((element) => {
        if (element.closest("[hidden],[inert],[aria-hidden='true']"))
          return false;
        const box = element.getBoundingClientRect(),
          style = getComputedStyle(element);
        return (
          box.width > 0 &&
          style.visibility !== "hidden" &&
          (box.left < edge.left - 1 || box.right > edge.right + 1)
        );
      })
      .map((element) => ({
        tag: element.tagName,
        label:
          element.getAttribute("aria-label") ??
          element.textContent?.slice(0, 70),
        right: Math.round(element.getBoundingClientRect().right),
        edge: Math.round(edge.right),
      }));
  });
  const brokenDays = await drawer
    .locator(".hca-date-grid button")
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const range = document.createRange();
          range.selectNodeContents(button);
          return range.getClientRects().length > 1;
        })
        .map((button) => button.textContent),
    );
  expect(
    brokenDays,
    label + " calendar day numbers must remain on one line",
  ).toEqual([]);
  expect(
    outside,
    label + " must fit inside the drawer without horizontal clipping",
  ).toEqual([]);
}
async function begin(page: Page, patient: string) {
  await login(page, patient);
  await page.goto("/escalas");
  await page
    .getByLabel("Data de referência", { exact: true })
    .fill("2100-01-15");
}
async function chunks(page: Page, patient: string): Promise<ScheduledShift[]> {
  const results = await Promise.all(
    [
      ["2100-01-15", "2100-02-24"],
      ["2100-02-25", "2100-02-28"],
    ].map(async ([from, until]) => {
      const response = await page.request.get(
        "/api/schedules?" +
          new URLSearchParams({ careRecipientId: patient, from, until }),
      );
      expect(response.ok()).toBe(true);
      return (await response.json()).data.shifts;
    }),
  );
  return results.flat();
}

test("doze datas em45 dias mantêm seleção entre meses e após conflito reservado antes de publicar a prévia19–07", async ({
  page,
}, info) => {
  await startFocusProbe(page);
  const f = await selectedDatesFixture();
  await conflictingOtherPatient(f);
  const before = datesState(f);
  await begin(page, f.patient);
  await page
    .getByRole("button", { name: "Nova programação", exact: true })
    .click();
  await edit(page)
    .getByLabel("Profissional", { exact: true })
    .selectOption(f.worker.id);
  await edit(page)
    .getByLabel("Tipo de plantão", { exact: true })
    .selectOption(f.type.id);
  await edit(page)
    .getByLabel("Repetição", { exact: true })
    .selectOption("dates");
  await edit(page)
    .getByLabel("Primeiro dia / âncora", { exact: true })
    .fill("2100-01-15");
  await edit(page).getByLabel("Válida até", { exact: true }).fill("2100-02-28");
  const label = (date: string) => "Dia " + date.split("-").reverse().join("/");
  for (const date of chosenDates.filter((day) => day.startsWith("2100-01")))
    await edit(page)
      .getByRole("button", { name: label(date), exact: true })
      .click();
  await edit(page)
    .getByRole("button", { name: "Próximo mês das datas", exact: true })
    .click();
  for (const date of chosenDates.filter((day) => day.startsWith("2100-02")))
    await edit(page)
      .getByRole("button", { name: label(date), exact: true })
      .click();
  await edit(page)
    .getByRole("button", { name: "Mês anterior das datas", exact: true })
    .click();
  await expect(
    edit(page).getByRole("button", { name: "Dia 15/01/2100", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await edit(page)
    .getByRole("button", { name: "Próximo mês das datas", exact: true })
    .click();
  await expect(
    edit(page).getByText("12 datas selecionadas", { exact: true }),
  ).toBeVisible();
  await edit(page)
    .getByLabel("Observações", { exact: true })
    .fill(
      "Datas preservadas entre meses e depois da recusa; nenhum dado de outro paciente",
    );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, `selected-dates-calendar-${width}`);
    await withinDrawer(edit(page), `selected-dates-calendar-${width}`);
  }
  await page.setViewportSize({ width: 320, height: 950 });
  await page.screenshot({
    path: `output/playwright/phase-d/selected-dates-calendar-${info.project.name}.png`,
    fullPage: true,
  });
  await edit(page)
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  await expect(page.getByRole("dialog").filter({ visible: true })).toHaveCount(
    1,
  );
  await expect(review(page).getByRole("textbox")).toHaveCount(0);
  await expect(review(page).locator("ol > li")).toHaveCount(12);
  await expect(review(page).locator("ol > li").first()).toContainText(
    "15/01/2100, 19:00 → 16/01/2100, 07:00",
  );
  const rejected = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/schedules" &&
      response.request().method() === "POST",
  );
  await review(page)
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  const denial = await rejected;
  expect(denial.status()).toBe(409);
  expect(await denial.json()).toMatchObject({ code: "SCHEDULE_OVERLAP" });
  expect(datesState(f)).toBe(before);
  await expect(
    page.getByText("DADO_RESERVADO_OUTRO_PACIENTE", { exact: false }),
  ).toHaveCount(0);
  await review(page)
    .getByRole("button", { name: "Voltar", exact: true })
    .click();
  try {
    await expect(
      edit(page).getByRole("button", {
        name: "Revisar alteração",
        exact: true,
      }),
    ).toBeFocused();
  } finally {
    await attachFocusProbe(page);
  }
  await expect(
    edit(page).getByText("12 datas selecionadas", { exact: true }),
  ).toBeVisible();
  await expect(
    edit(page).getByLabel("Observações", { exact: true }),
  ).toHaveValue(
    "Datas preservadas entre meses e depois da recusa; nenhum dado de outro paciente",
  );
  await edit(page)
    .getByRole("button", { name: "Remover data 11/02/2100", exact: true })
    .click();
  await edit(page)
    .getByRole("button", { name: "Dia 12/02/2100", exact: true })
    .click();
  await edit(page)
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, `selected-dates-review-${width}`);
    await withinDrawer(review(page), `selected-dates-review-${width}`);
  }
  await page.setViewportSize({ width: 320, height: 950 });
  await page.screenshot({
    path: `output/playwright/phase-d/selected-dates-review-${info.project.name}.png`,
    fullPage: true,
  });
  const confirmation = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/schedules" &&
      response.request().method() === "POST",
  );
  await review(page)
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  const result = await confirmation;
  expect(result.ok(), await result.text()).toBe(true);
  const series = (await result.json()).data;
  const expected = chosenDates.map((day) =>
    day === "2100-02-11" ? "2100-02-12" : day,
  );
  expect(series.specific_dates).toEqual(expected);
  const shifts = (await chunks(page, f.patient))
    .filter((row) => row.series_id === series.id)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  expect(shifts).toHaveLength(12);
  for (const [i, shift] of shifts.entries()) {
    expect(Date.parse(shift.starts_at)).toBe(
      Date.parse(expected[i] + "T22:00:00Z"),
    );
    expect(Date.parse(shift.ends_at) - Date.parse(shift.starts_at)).toBe(
      12 * 3600000,
    );
  }
});

test("exceção altera um único plantão escolhido e o corte conserva todas as doze ocorrências históricas", async ({
  page,
}, info) => {
  const f = await selectedDatesFixture(),
    series = await rpc(f.admin, "schedule_command", datePacket(f));
  await begin(page, f.patient);
  const before = JSON.parse(datesState(f));
  const first = page
    .getByRole("article", { name: f.type.name + " · " + f.name, exact: true })
    .filter({ hasText: "15/01/2100" })
    .filter({ visible: true });
  await first
    .getByRole("button", { name: "Alterar plantão", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Alteração pontual",
    exact: true,
  });
  await editor
    .getByLabel("Início do plantão", { exact: true })
    .fill("2100-01-15T20:00");
  await editor
    .getByLabel("Fim do plantão", { exact: true })
    .fill("2100-01-16T08:00");
  await editor
    .getByLabel("Observações", { exact: true })
    .fill("Exceção somente em15/01");
  await editor
    .getByLabel("Justificativa", { exact: true })
    .fill("Alteração pontual que não reescreve as outras onze datas");
  await editor
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  await expect(review(page)).toContainText("somente este plantão");
  await expect(review(page).getByRole("textbox")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, `selected-date-exception-${width}`);
  }
  await page.setViewportSize({ width: 320, height: 950 });
  await page.screenshot({
    path: `output/playwright/phase-d/selected-date-exception-${info.project.name}.png`,
    fullPage: true,
  });
  await review(page)
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  const changed = JSON.parse(datesState(f)),
    original = before.shifts.find(
      (row: ScheduledShift) => row.starts_at.slice(0, 10) === "2100-01-15",
    );
  expect(
    changed.shifts.find((row: ScheduledShift) => row.id === original.id),
  ).toMatchObject({ is_exception: true, notes: "Exceção somente em15/01" });
  expect(
    changed.shifts.filter((row: ScheduledShift) => row.id !== original.id),
  ).toEqual(
    before.shifts.filter((row: ScheduledShift) => row.id !== original.id),
  );
  await page.getByText("Tipos e programações", { exact: true }).click();
  // A live refresh used to unmount this disclosure and lose its open state.
  const refreshed = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/schedules",
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event("hca:data-changed")),
  );
  await (await refreshed).finished();
  await expect(
    page.locator("details").filter({
      has: page.locator("summary", { hasText: "Tipos e programações" }),
    }),
  ).toHaveAttribute("open", "");
  await page
    .getByRole("button", { name: "Encerrar série", exact: true })
    .click();
  const end = page.getByRole("dialog", {
    name: "Encerrar programação",
    exact: true,
  });
  await end
    .getByLabel("Encerrar a partir de", { exact: true })
    .fill("2100-02-15");
  await end
    .getByLabel("Justificativa", { exact: true })
    .fill("Corte definitivo das datas futuras desta programação");
  await end
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  await expect(review(page).getByRole("textbox")).toHaveCount(0);
  await expect(review(page)).toContainText(
    "12 plantões na programação completa",
  );
  await expect(review(page)).toContainText("15/02/2100");
  await review(page)
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  await expect(review(page)).toHaveCount(0);
  const ended = JSON.parse(datesState(f));
  expect(
    ended.series.find((row: { id: string }) => row.id === series.id).ended_on,
  ).toBe("2100-02-15");
  expect(ended.shifts).toHaveLength(12);
  for (const shift of ended.shifts)
    expect(shift.status).toBe(
      shift.starts_at.slice(0, 10) >= "2100-02-15" ? "cancelled" : "published",
    );
});

test("BAL em janela nova mostra a contagem de Sheila17 e conserva Juliana18 e seus pareceres anteriores", async ({
  page,
}, info) => {
  const f = await newWindowRecount(),
    before = JSON.parse(recountState(f));
  await login(page, f.patient, f.second.email);
  await page.goto(`/fichas/bal?documentId=${f.document.id}&recount=true`);
  await expect(
    page.getByText(f.target.type_name, { exact: false }),
  ).toBeVisible();
  for (const [i] of f.products.entries())
    await page
      .getByLabel(`Material fictício V4 ${i} · unidade`, { exact: true })
      .fill(i ? "0" : "17");
  await page
    .getByLabel("Observações da contagem", { exact: true })
    .fill("Contagem2 de Sheila, realizada em outra janela de plantão");
  await page.getByRole("button", { name: "Revisar", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByText("Referência: 20 unidade", { exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, `new-window-balance-${width}`);
  }
  await page.setViewportSize({ width: 320, height: 950 });
  await page.screenshot({
    path: `output/playwright/phase-d/new-window-balance-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirmar reconto", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Abrir ficha BAL", exact: true }),
  ).toBeVisible();
  const doc = (
    await (await page.request.get("/api/documents/" + f.document.id)).json()
  ).data;
  expect(doc.created_by).toBe(f.pro.id);
  expect(doc.balanceReview.counter.id).toBe(f.second.id);
  expect(doc.balanceReview.countVersion).toBe(2);
  expect(doc.balanceReview.reviews).toHaveLength(1);
  expect(doc.balanceReview.reviews[0].count_version).toBe(1);
  expect(doc.payload.balanceContext.startsAt).toBe(f.target.starts_at);
  const after = JSON.parse(recountState(f));
  expect(after.ledger).toEqual(before.ledger);
  expect(after.obligations).toEqual(before.obligations);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
});
