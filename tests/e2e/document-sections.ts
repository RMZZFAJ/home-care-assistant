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
  if (section === "history") { await openDocumentMore(page); await page.getByRole("button", {name:"Identificação e registros preservados",exact:true}).click(); }
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
  const popup = page.locator(".hca-document-identifiers");
  if (!(await popup.isVisible()))
    await page.getByRole("button", { name: "Mais opções da ficha", exact: true }).click();
  await expect(popup).toBeVisible();
}
export async function closeDocumentMore(page: Page) {
  const popup = page.locator(".hca-document-identifiers");
  if (await popup.isVisible()) await popup.press("Escape");
  await expect(popup).toHaveCount(0);
}
