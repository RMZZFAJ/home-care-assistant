import { expect, type Page } from "@playwright/test";

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
  workflow: /^(Atendimento|Aquisição|Contagem e revisão)$/,
  communications: "Comunicações",
  files: "Arquivos gerados",
  attachments: "Anexos",
  history: "Versões e integridade",
  audit: "Auditoria",
};
/** Follow the real navigation; hidden panels must never be forced open by tests. */
export async function selectDocumentSection(
  page: Page,
  section: DocumentSection,
) {
  const tab = page.getByRole("tab", { name: labels[section], exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
}

export async function openDocumentMore(page: Page) {
  const popup = page.locator(".hca-document-identifiers");
  if (!(await popup.isVisible()))
    await page.getByRole("button", { name: "Mais", exact: true }).click();
  await expect(popup).toBeVisible();
}
export async function closeDocumentMore(page: Page) {
  const popup = page.locator(".hca-document-identifiers");
  if (await popup.isVisible()) await popup.press("Escape");
  await expect(popup).toHaveCount(0);
}
