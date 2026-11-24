import { openProfileIdentity, openProfilePhoto, selectProfileSection } from "./profile-sections";
import { selectContext } from "./auth-context";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";

test("perfil pessoal salva registro e foto privada e notificações distinguem ciência", async ({
  page,
}) => {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(fixture.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patientA);
  const issued = await page.request.post("/api/requisitions", {
    data: {
      careRecipientId: patientA,
      idempotencyKey: crypto.randomUUID(),
      lines: [
        {
          productId: "fralda",
          currentStock: 0,
          urgent: false,
          repeatReason: "Conferência de ciência da notificação",
        },
      ],
      extraItems: [],
      observations: [],
    },
  });
  expect(issued.ok()).toBeTruthy();
  const receipt = (await issued.json()).receipt;
  await page.goto("/perfil?careRecipientId=" + patientA);
  await selectProfileSection(page, "identity");
  const identity = await openProfileIdentity(page);
  const name = identity.getByRole("textbox", { name: "Nome completo", exact: true });
  const previousName = await name.inputValue();
  await name.fill(" ");
  await identity.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(identity.getByText("Informe seu nome entre 2 e 160 caracteres.", { exact: true })).toBeVisible();
  await name.fill(previousName);
  await page
    .getByLabel("Categoria profissional", { exact: true })
    .fill("Profissional de homologação");
  await page
    .getByLabel("Registro profissional", { exact: true })
    .fill("REG-TESTE");
  await page.getByLabel("UF", { exact: false }).selectOption("SP");
  await page.evaluate(() => {
    const request = window.fetch.bind(window);
    let loseResponse = true;
    window.fetch = async (input, init) => {
      const result = await request(input, init);
      if (loseResponse && input === "/api/profile" && init?.method === "POST" && result.ok) {
        loseResponse = false;
        return new Response("{", { status: 200, headers: { "content-type": "application/json" } });
      }
      return result;
    };
  });
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  const failure = page.getByRole("dialog", { name: "Não foi possível salvar a identificação", exact: true });
  await failure.getByRole("button", { name: "Conferir dados da conta", exact: true }).click();
  await page.getByRole("dialog", { name: "Dados confirmados", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#147b88" },
  })
    .png()
    .toBuffer();
  await selectProfileSection(page, "identity");
  const photo = await openProfilePhoto(page);
  const files = photo.getByLabel("Nova foto", { exact: true });
  await files.setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("arquivo fictício") });
  await page.getByRole("dialog", { name: "Imagem não aceita", exact: true }).getByRole("button", { name: "Voltar", exact: true }).click();
  await files.setInputFiles({
    name: "perfil-ficticio.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(photo.getByRole("img", { name: "Prévia da nova foto", exact: true })).toBeVisible();
  await photo.getByRole("button", { name: "Usar esta foto", exact: true }).click();
  await page.getByRole("dialog", { name: "Foto atualizada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Sua foto de perfil", exact: true }),
  ).toBeVisible();
  await photo.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByLabel("Menu do usuário", { exact: true }).locator("img"),
  ).toBeVisible();
  const profile = (await (await page.request.get("/api/profile")).json()).data;
  expect(profile.professional_registration).toBe("REG-TESTE");
  expect(profile.professional_state).toBe("SP");
  await page.goto("/notificacoes?careRecipientId=" + patientA);
  await page.getByRole("button", { name: "Não vistos", exact: true }).click();
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByText(receipt.code, { exact: true }) });
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications" &&
      response.request().method() === "POST",
  );
  await row
    .getByRole("button", { name: "Marcar como vista", exact: true })
    .click();
  expect((await pending).ok()).toBeTruthy();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: /^Notificações/ }).click();
  await expect(
    page.getByRole("region", { name: "Notificações recentes", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});
