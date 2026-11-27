import { expect, test, type Page } from "@playwright/test";
import { pressWorkspaceControl } from "./workspace-controls";

export type ProfileSection = "identity" | "security" | "notices" | "devices" | "help";
const labels: Record<ProfileSection, string> = {
  identity: "Meu perfil", security: "Segurança", notices: "Avisos e aplicativo", devices: "Dispositivos", help: "Ajuda",
};

/** Navigate through the actual account controls, retaining all other panels. */
export async function selectProfileSection(page: Page, section: ProfileSection) {
  const tab = page.getByRole("tab", { name: labels[section], exact: true });
  await page.bringToFront();
  // Resolving the profile read removes the status above the tabs and moves their touch targets.
  await expect(page.getByText(/^(Carregando perfil|Atualizando consulta do perfil)…$/)).toBeHidden();
  // WebKit can reposition the scrolling tab strip on focus between mouse down
  // and mouse up synthesized from a tap. Settle focus before measuring the tap.
  if (test.info().project.use.hasTouch) await tab.focus();
  await pressWorkspaceControl(page, tab);
  const selected = page.locator('[role="tab"][aria-selected="true"]');
  await expect(selected).toHaveText(labels[section]);
  await expect(page.locator('[role="tabpanel"]:not([hidden])')).toHaveCount(1);
}

export function profileIdentityEditor(page: Page) {
  return page.getByRole("dialog", { name: "Editar identificação", exact: true });
}

export async function openProfilePassword(page: Page) {
  await page.getByRole("button", { name: /^Senha Atualize sua senha de acesso/ }).click();
  const editor = page.getByRole("dialog", { name: "Alterar senha", exact: true });
  await expect(editor.getByLabel("Nova senha", { exact: true })).toBeVisible();
  return editor;
}

export async function openProfileIdentity(page: Page) {
  await page.getByRole("region", { name: "Identificação pessoal", exact: true }).getByRole("button", { name: "Editar", exact: true }).click();
  const editor = profileIdentityEditor(page);
  await expect(editor.getByRole("textbox", { name: "Nome completo", exact: true })).toBeEditable();
  return editor;
}

export async function openProfilePhoto(page: Page) {
  await page.getByRole("button", { name: "Alterar minha foto", exact: true }).click();
  const photo = page.getByRole("dialog", { name: "Minha foto", exact: true });
  await expect(photo.getByRole("status")).toHaveCount(0);
  await expect(photo).toBeVisible();
  return photo;
}
