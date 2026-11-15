import { expect, test, type Page } from "@playwright/test";

export type DocumentSection =
  | "overview"
  | "materials"
  | "workflow"
  | "communications"
  | "files"
  | "attachments"
  | "history"
  | "audit";
const labels = {
  overview: "Visão geral",
  materials: "Materiais",
  workflow: "Materiais",
  communications: "Comunicações",
  files: "Arquivos gerados",
  attachments: "Anexos",
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
  await tab.click();
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
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
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

/** Open the collapsed, user-facing macro progress before inspecting its steps. */
export async function expandDocumentMilestones(page: Page) {
  const summary = page.locator("details.hca-document-macro > summary");
  const details = page.locator("details.hca-document-macro");
  if (await details.getAttribute("open") === null) { await summary.focus(); await summary.press("Enter"); }
  await expect(page.getByRole("list", { name: "Marcos da ficha", exact: true })).toBeVisible();
}
