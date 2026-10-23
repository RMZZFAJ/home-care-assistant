import { expect, type Page } from "@playwright/test";

export async function selectContext(page: Page, patient: string | null) {
  const response = await page.request.get("/api/context");
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()).data;
  if (data.activeContext && data.activeContext.care_recipient_id === patient)
    return;
  const chooser = page.getByRole("region", {
    name: "Mudar perfil",
    exact: true,
  });
  if (!(await chooser.isVisible())) {
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await page
      .getByRole("button", { name: "Mudar perfil", exact: true })
      .click();
  }
  const person = data.patients.find(
    (row: { id: string }) => row.id === patient,
  );
  const label = patient
    ? new RegExp(
        "^" +
          String(person?.display_name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          " · ",
      )
    : "Administração global";
  await chooser.getByRole("button", { name: label, exact: !patient }).click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/context")).json()).data
          .activeContext?.care_recipient_id,
    )
    .toBe(patient);
  await expect(chooser).not.toBeVisible();
}
