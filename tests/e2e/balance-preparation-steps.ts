import { expect, type Page, type Locator } from "@playwright/test";
import { formatZonedDate } from "../../src/lib/schedules/time";
export async function chooseBalanceTarget(
  page: Page,
  form: Locator,
  target: {
    professional_name: string;
    type_name: string;
    starts_at: string;
    ends_at: string;
  },
  timezone?: string,
) {
  const label = `${target.professional_name} · ${target.type_name} · ${formatZonedDate(target.starts_at, timezone)} → ${formatZonedDate(target.ends_at, timezone)}`;
  await form
    .getByRole("combobox", { name: "Plantão de destino", exact: true })
    .fill(label);
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(
    form.getByRole("combobox", { name: "Plantão de destino", exact: true }),
  ).toHaveValue(label);
}
