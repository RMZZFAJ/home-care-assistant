import { expect, test, type Locator, type Page } from "@playwright/test";

export type DocumentSection =
  | "overview"
  | "materials"
  | "progress"
  | "workflow"
  | "communications"
  | "reviews"
  | "counts"
  | "files"
  | "attachments"
  | "history"
  | "audit";
const labels = {
  overview: "Visão geral",
  materials: "Materiais",
  progress: "Andamentos",
  workflow: "Materiais",
  communications: "Comunicações",
  reviews: "Revisões",
  counts: "Contagens",
  files: "Arquivos",
  attachments: "Arquivos",
  history: "Identificação e registros preservados",
  audit: "Auditoria",
};
/** Follow the real navigation; hidden panels must never be forced open by tests. */
export async function selectDocumentSection(
  page: Page,
  section: DocumentSection,
) {
  await page.bringToFront();
  if (section === "history") { await openDocumentMore(page); await page.getByRole("menuitem", {name:"Identificação e registros preservados",exact:true}).click(); await expect(page.getByRole("tab", { name: "Identificação e registros preservados", exact: true })).toHaveAttribute("aria-selected", "true"); return; }
  const tab = page.getByRole("tab", { name: labels[section], exact: true });
  await pressSectionControl(page, tab);
  try {
    await expect(tab).toHaveAttribute("aria-selected", "true");
  } catch (error) {
    try {
      await test.info().attach("document-tab-failure", {
        contentType: "application/json",
        body: JSON.stringify(await page.evaluate(() => ({
          url: location.pathname + location.search,
          tabs: Array.from(document.querySelectorAll('[role="tab"]')).map(node => ({
            text: node.textContent,
            selected: node.getAttribute("aria-selected"),
            focused: node === document.activeElement,
          })),
        }))),
      });
    } catch {
      /* Preserve the original failure if the page already closed. */
    }
    throw error;
  }
  if (section === "files" || section === "attachments") {
    const destination = page.getByRole("navigation", { name: "Arquivos da ficha", exact: true })
      .getByRole("button", { name: section === "files" ? "Gerados" : "Anexos", exact: true });
    if ((await destination.getAttribute("aria-pressed")) !== "true")
      await pressSectionControl(page, destination);
    await expect(destination).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
}

async function pressSectionControl(page: Page, control: Locator) {
  if (test.info().project.use.hasTouch) {
    await expect(page.locator(".hca-activity-overlay")).toBeHidden();
    await control.evaluate(element => element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }));
    const receivesTouch = () => control.evaluate(element => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(left + width / 2, top + height / 2));
    });
    if (!await receivesTouch()) {
      await control.evaluate(element => element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
    }
    await expect.poll(receivesTouch).toBe(true);
    await control.tap();
    return;
  }
  await control.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await control.click();
}

export async function openBalanceComparison(page: Page) {
  await selectDocumentSection(page, "counts");
  const summary = page.locator("summary").filter({ hasText: /^Comparar contagem e referência$/ });
  const table = page.getByRole("table", { name: "Materiais da contagem", exact: true });
  if (await summary.locator("..").getAttribute("open") === null) await summary.click();
  await expect(table).toBeVisible();
  return table;
}

export async function openDocumentMore(page: Page) {
  const popup = page.getByRole("menu", { name: "Ações da ficha", exact: true });
  if (!(await popup.isVisible()))
    await page.getByRole("button", { name: "Mais opções da ficha", exact: true }).click();
  await expect(popup).toBeVisible();
}
export async function closeDocumentMore(page: Page) {
  const popup = page.getByRole("menu", { name: "Ações da ficha", exact: true });
  if (await popup.isVisible()) await popup.press("Escape");
  await expect(popup).toHaveCount(0);
}

export async function openDocumentAction(page: Page, name: string) {
  await openDocumentMore(page);
  await page.getByRole("menuitem", { name, exact: true }).click();
}

function operationalMenu(page: Page) {
  return page.getByRole("menu", { name: "Ações operacionais", exact: true });
}

export async function openOperationalDocumentAction(page: Page, name: string) {
  const menu = operationalMenu(page);
  if (!(await menu.isVisible())) await page.getByRole("button", { name: "Ações da ficha", exact: true }).click();
  await menu.getByRole("menuitem", { name, exact: true }).click();
}

export async function expectNoOperationalDocumentAction(page: Page, name: string) {
  const menu = operationalMenu(page);
  const trigger = page.getByRole("button", { name: /^(Ações da ficha|Fechar ações da ficha)$/ });
  if (await trigger.isVisible()) {
    if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
    await expect(menu).toBeVisible();
  }
  await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name, exact: true })).toHaveCount(0);
  if (await menu.isVisible()) await menu.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.locator(".hca-document-fab-backdrop")).toBeHidden();
}

export async function confirmCompleteDeliveryReceipt(page: Page) {
  await openOperationalDocumentAction(page, "Conferir recebimento");
  const editor = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  await editor.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Recebimento confirmado", exact: true });
  await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
}

/** Open the collapsed, user-facing macro progress before inspecting its steps. */
export async function expandDocumentMilestones(page: Page) {
  const summary = page.locator("details.hca-document-macro > summary");
  const details = page.locator("details.hca-document-macro");
  if (await details.getAttribute("open") === null) { await summary.focus(); await summary.press("Enter"); }
  await expect(page.getByRole("list", { name: "Marcos da ficha", exact: true })).toBeVisible();
}
