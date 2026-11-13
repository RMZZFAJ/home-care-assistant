import { expect, type Page } from "@playwright/test";

export async function selectContext(page: Page, patient: string | null) {
  await expect(page.getByLabel("Menu do usuário", { exact: true })).toBeEnabled();
  const response = await page.request.get("/api/context");
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()).data;
  const shell = page.locator(".hca-workspace");
  if (!data.activeContext || data.activeContext.care_recipient_id !== patient) {
    const chooser = page.getByRole("region", { name: "Mudar perfil", exact: true });
    const person = data.patients.find((row: { id: string }) => row.id === patient);
    const label = patient ? new RegExp("^" + String(person?.display_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " · ") : "Administração global";
    if (await chooser.isVisible()) {
      if (patient) {
        const search = chooser.getByRole("textbox", { name: "Buscar perfil autorizado", exact: true });
        await search.press("ControlOrMeta+A");
        await search.pressSequentially(person.display_name);
        await expect(search).toHaveValue(person.display_name);
      }
      await chooser.getByRole("button", { name: label, exact: !patient }).click();
    } else {
      await page.getByLabel("Menu do usuário", { exact: true }).click();
      await page.getByRole("menuitem", { name: "Mudar paciente ou função", exact: true }).click();
      await page.getByRole("menuitemradio", { name: label, exact: !patient }).click();
    }
    await expect.poll(async () => (await (await page.request.get("/api/context")).json()).data.activeContext?.care_recipient_id).toBe(patient);
  }
  await expect(shell).toHaveAttribute("data-context-mode", patient ? "patient" : "global");
  await expect(shell).toHaveAttribute("data-context-patient", patient ?? "");
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).not.toBeVisible();
}
