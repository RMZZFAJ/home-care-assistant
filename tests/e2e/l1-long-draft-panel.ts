import type { Page } from "@playwright/test";
/** Current last-draft surface, or the actual exceptional CAS/recovery controls. */
export const lastDraftPanel = (page: Page) => page.getByRole("region", { name: "Rascunho privado", exact: true })
 .or(page.getByRole("dialog", { name: "Continuar o preenchimento?", exact: true }))
 .or(page.getByRole("dialog", { name: "Resultado anterior confirmado", exact: true }))
 .or(page.getByText("Último rascunho salvo.", { exact: true }));
