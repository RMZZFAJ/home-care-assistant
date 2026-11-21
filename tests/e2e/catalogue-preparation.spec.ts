import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures, setup } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";

test("catalogue restores partial input and recovers a lost confirmation without replay after reload", async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await setup();
  const patient = fixture.patient;
  const item = "Material retomado " + randomUUID().slice(0, 8);
  const count = () => Number(sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(patient)};`));
  const before = count();

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
  await page.goto(`/admin?careRecipientId=${patient}&section=catalog`);

  const opener = page.getByRole("button", { name: "Novo item", exact: true });
  const editor = page.getByRole("dialog", { name: "Adicionar item exclusivo deste paciente" });
  const open = async () => { await opener.click(); await expect(editor.getByLabel("Nome", { exact: true })).toBeVisible(); };
  await open();
  await editor.getByLabel("Descrição operacional").fill("Descrição em andamento");
  await editor.getByLabel("Nomes alternativos, separados por vírgula").fill("Primeiro, , segundo,");
  await editor.getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  await expect(editor.getByText("Preenchimento privado salvo.", { exact: false })).toBeVisible();
  expect(count()).toBe(before);
  await editor.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.reload();
  await open();
  await expect(editor.getByLabel("Nome", { exact: true })).toHaveValue("");
  await expect(editor.getByLabel("Descrição operacional")).toHaveValue("Descrição em andamento");
  await expect(editor.getByLabel("Nomes alternativos, separados por vírgula")).toHaveValue("Primeiro, , segundo,");

  const scope = { patientId: patient, mode: "patient", purpose: "create" };
  const preparationUrl = "/api/admin/catalogue-preparations";
  const read = await page.request.get(preparationUrl + "?" + new URLSearchParams(scope));
  expect(read.status()).toBe(200);
  expect(read.headers()["cache-control"]).toContain("no-store");
  const { draft } = await read.json();
  const otherEditor = await page.request.post(preparationUrl, { data: {
    ...scope, targetId: null, action: "save", id: draft.id, revision: draft.revision,
    key: randomUUID(), referenceHash: draft.referenceHash,
    fields: { ...draft.fields, description: "Descrição na outra revisão" },
  } });
  expect(otherEditor.status()).toBe(200);
  await editor.getByLabel("Nome", { exact: true }).fill(item);
  await editor.getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  await editor.getByRole("button", { name: "Comparar com a revisão salva", exact: true }).click();
  await expect(editor.getByText("Descrição na outra revisão", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Manter meus campos", exact: true }).click();
  await expect(editor.getByLabel("Nome", { exact: true })).toHaveValue(item);
  await expect(editor.getByLabel("Descrição operacional")).toHaveValue("Descrição em andamento");

  let sent = 0;
  await page.route("**/api/admin", async route => {
    if (route.request().method() !== "POST" || route.request().postDataJSON().action !== "product") {
      await route.continue();
      return;
    }
    sent += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  });
  await editor.getByRole("button", { name: "Salvar item", exact: true }).click();
  const consult = editor.getByRole("button", { name: "Consultar comprovante", exact: true });
  await expect(consult).toBeEnabled();
  expect(count()).toBe(before + 1);
  await page.reload();
  await opener.click();
  await expect(consult).toBeVisible();
  await consult.click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("cell").filter({ has: page.getByText(item, { exact: true }) })).toBeVisible();
  expect(sent).toBe(1);
  expect(count()).toBe(before + 1);
});
