import { selectContext } from "./auth-context";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { patientA, fixturePassword } from "../../scripts/test-constants.mjs";
import {
  assertLocalProject,
  fixtureFile,
} from "../../scripts/test-environment.mjs";

test.setTimeout(120_000);

async function confirmationLink(page: Page, email: string, subject: string) {
  let id: string | undefined;
  await expect
    .poll(async () => {
      const response = await page.request.get(
        "http://127.0.0.1:54324/api/v1/messages",
      );
      const body = await response.json();
      const message = body.messages.find(
        (item: {
          ID: string;
          Subject: string;
          To: Array<{ Address: string }>;
        }) =>
          item.Subject.includes(subject) &&
          item.To.some((to) => to.Address === email),
      );
      id = message?.ID;
      return Boolean(id);
    })
    .toBeTruthy();
  const message = await (
    await page.request.get(`http://127.0.0.1:54324/api/v1/message/${id}`)
  ).json();
  const link = String(message.HTML)
    .match(/href="([^"]+)"/)?.[1]
    .replaceAll("&amp;", "&");
  if (!link || new URL(link).origin !== "http://127.0.0.1:54321")
    throw new Error(
      "Confirmation must target only the local development Auth service.",
    );
  return link;
}

test("convite → cadastro pessoal → confirmação de e-mail → aceite → recuperação de senha", async ({
  page,
}) => {
  assertLocalProject();
  const fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral" }).first(),
  ).toBeVisible();
  await selectContext(page, patientA);
  const email = `new-${randomUUID()}@example.invalid`;
  const invitation = await page.request.post("/api/admin", {
    data: {
      action: "invitation",
      careRecipientId: patientA,
      email,
      role: "professional",
      canManageStock: false,
      canCountStock: true,
    },
  });
  expect(invitation.ok()).toBeTruthy();
  const { invitationUrl } = await invitation.json();
  expect(new URL(invitationUrl).origin).toBe(process.env.NEXT_PUBLIC_APP_URL);
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(invitationUrl);
  await page.getByText("Ainda não tenho conta", { exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa convidada E2E");
  await page.getByLabel("E-mail do convite", { exact: true }).fill(email);
  await page.getByLabel("Senha pessoal", { exact: true }).fill(fixturePassword);
  const registered = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/invitations/register" &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  expect((await registered).ok()).toBeTruthy();
  await expect(
    page.getByText("Se o cadastro for elegível", { exact: false }),
  ).toBeVisible();
  // An unconfirmed identity must not acquire a patient membership.
  const beforeConfirmation = await page.request.post(
    "/api/invitations/accept",
    {
      data: {
        token: new URLSearchParams(new URL(invitationUrl).hash.slice(1)).get(
          "token",
        ),
      },
    },
  );
  expect(beforeConfirmation.status()).toBe(401);
  expect(
    (await page.context().cookies()).some(
      (cookie) =>
        cookie.name.endsWith("-code-verifier") && Boolean(cookie.value),
    ),
  ).toBe(true);
  await page.goto(await confirmationLink(page, email, "Confirm"));
  await expect(page).toHaveURL(/\/convites\/aceitar$/);
  await page
    .getByRole("button", {
      name: "Aceitar convite com minha conta",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Convite aceito.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Abrir Home Care Assistant", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Pessoa assistida", exact: true }),
  ).toBeVisible();
  await selectContext(page, patientA);
  const context = await (await page.request.get("/api/context")).json();
  expect(context.data.isGlobalAdmin).toBe(false);
  expect(
    context.data.patients.map((patient: { id: string }) => patient.id),
  ).toEqual([patientA]);
  expect(context.data.fullName).toBe("Pessoa convidada E2E");
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Esqueci minha senha", exact: true })
    .click();
  await expect(
    page.getByText("Se o e-mail estiver autorizado", { exact: false }),
  ).toBeVisible();
  await page.goto(await confirmationLink(page, email, "Reset"));
  await expect(
    page.getByRole("heading", { name: "Definir nova senha" }),
  ).toBeVisible();
  const newPassword = "Hca1!" + randomUUID();
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill(newPassword);
  await page
    .getByRole("button", { name: "Salvar nova senha", exact: true })
    .click();
  await expect(
    page.getByText("Senha atualizada.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Acessar o sistema", exact: true })
    .click();
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Pessoa assistida", exact: true }),
  ).toBeVisible();
});
