import { expect, type Page } from "@playwright/test";

export type ProfileSection = "identity" | "security" | "notices" | "devices" | "help";
const labels: Record<ProfileSection, string> = {
  identity: "Meu perfil", security: "Segurança", notices: "Avisos e aplicativo", devices: "Dispositivos", help: "Ajuda",
};

/** Navigate through the actual account controls, retaining all other panels. */
export async function selectProfileSection(page: Page, section: ProfileSection) {
  const tab = page.getByRole("tab", { name: labels[section], exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
}
