import { expect, type Page } from "@playwright/test";

export async function selectContext(page: Page, patient: string | null) {
  await expect(page.getByLabel("Menu do usuário", { exact: true })).toBeEnabled({ timeout: 30_000 });
  // Retry a reset connection once on context reads while keeping HTTP errors visible.
  const url = "/api/context?view=entry" + (patient ? "&patientId=" + encodeURIComponent(patient) : "");
  const response = await page.request.get(url, { maxRetries: 1 });
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()).data;
  const shell = page.locator(".hca-workspace");
  if (!data.activeContext || data.activeContext.care_recipient_id !== patient) {
    const chooser = page.getByRole("region", { name: "Mudar perfil", exact: true });
    const person = data.patients.find((row: { id: string }) => row.id === patient);
    const name = String(person?.display_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const label = patient ? new RegExp("^" + name + " · ") : "Administração global";
    let submit: () => Promise<void>;
    if (await chooser.isVisible()) {
      if (patient) {
        const search = chooser.getByRole("textbox", { name: "Buscar perfil autorizado", exact: true });
        await search.fill(person.display_name);
        await expect(search).toHaveValue(person.display_name);
      }
      const choice = chooser.getByRole("button", { name: label, exact: !patient });
      await expect(choice).toBeEnabled();
      await choice.focus(); await expect(choice).toBeFocused();
      submit = () => choice.click();
    } else {
      await page.getByLabel("Menu do usuário", { exact: true }).press("Enter");
      await page.getByRole("menuitem", { name: "Mudar paciente ou função", exact: true }).press("Enter");
      const submenu = page.getByRole("menu", { name: "Contextos autorizados", exact: true });
      const dialog = page.getByRole("dialog", { name: "Contextos autorizados", exact: true });
      await expect(submenu.or(dialog)).toBeVisible();
      const paginated = await dialog.isVisible();
      if (paginated && patient) await dialog.getByRole("searchbox", { name: "Buscar perfil autorizado" }).fill(person.display_name);
      const choice = paginated
        ? dialog.getByRole("button", { name: patient ? new RegExp("^" + name + "\\s") : label, exact: !patient })
        : submenu.getByRole("menuitemradio", { name: label, exact: !patient });
      await expect(choice).toBeEnabled();
      if (paginated) submit = () => choice.click();
      else {
        await choice.focus();
        await expect(choice).toBeFocused();
        submit = () => choice.press("Enter");
      }
    }
    const [result] = await Promise.all([
      page.waitForResponse(response => {
        const request = response.request();
        return request.method() === "POST" && new URL(response.url()).pathname === "/api/context" &&
          request.postDataJSON()?.careRecipientId === patient;
      }),
      submit(),
    ]);
    expect(result.ok()).toBeTruthy();
    expect((await result.json()).data).toMatchObject({
      mode: patient ? "patient" : "global",
      care_recipient_id: patient,
    });
  }
  await expect(shell).toHaveAttribute("data-context-mode", patient ? "patient" : "global");
  await expect(shell).toHaveAttribute("data-context-patient", patient ?? "");
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).not.toBeVisible();
}
