import { expect, test, type Page, type Locator, type Request } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { selectDocumentSection } from "./document-sections";

test.setTimeout(150_000);
const owned = new Set<string>();
async function fixture() { const f = await setup(); owned.add(f.patient); return f; }
test.afterEach(() => { if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(q).join(",")}]::uuid[])`); owned.clear(); });
async function login(page: Page, patient: string, role: "professional" | "adminA" | "global" = "adminA", email = fixtures[role].email, destination?: string) {
  await page.goto(destination ? "/login?next=" + encodeURIComponent(destination) : "/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  if (destination) {
    await expect(page).toHaveURL(url => url.pathname === destination);
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", patient);
    return;
  }
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, role === "global" ? null : patient);
}
const next = (page: Page) => page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const state = (patient: string) => JSON.parse(sql(`select coalesce((select jsonb_build_object('version',version,'settings',settings) from public.patient_settings where care_recipient_id=${q(patient)}),'{"version":1,"settings":{}}'::jsonb)`));
const count = (patient: string) => sql(`select count(*) from public.access_change_requests where care_recipient_id=${q(patient)}`);
async function errorAt(field: Locator, text: string) {
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const described = await field.evaluate(element => (element.getAttribute("aria-describedby") ?? "").split(/\s+/).map(id => document.getElementById(id)?.textContent ?? "").join(" "));
  expect(described).toContain(text);
}
async function capture(page: Page, name: string, project: string) {
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({ path: `output/playwright/phase-d/${name}-${project}.png`, fullPage: true });
}
async function fieldGeometry(scope: Locator, label: string) {
  const overflow = await scope.locator("input,select,textarea").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { name: element.getAttribute("name"), left: box.left, right: box.right, width: box.width, viewport: window.innerWidth };
  }).filter(box => box.width > 0 && (box.left < -1 || box.right > box.viewport + 1)));
  expect(overflow, label).toEqual([]);
}

test("C026 REQ anuncia erro no campo e conserva extra e observação de 1001 caracteres até corrigir e emitir 1000", async ({ page }, info) => {
  const f = await fixture();
  const writer = await shiftWorker(f.patient);
  let commands = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/requisitions" && request.method() === "POST") commands++; });
  await login(page, f.patient, "professional", writer.email, "/fichas/req");
  await expect(page.getByText("Carregando catálogo e pendências…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Nova requisição", exact: true })).toBeVisible();
  const location = page.getByRole("navigation", { name: "Localização da ficha" });
  await expect(location.getByRole("link", { name: "Fichas", exact: true })).toHaveAttribute("href", "/fichas");
  const help = page.getByRole("button", { name: "Ajuda sobre esta ficha", exact: true });
  await help.click();
  const wizardHelp = page.getByRole("dialog", { name: "Uma ficha, com seu contexto", exact: true });
  await expect(wizardHelp).toBeVisible();
  await wizardHelp.getByRole("button", { name: "Entendi", exact: true }).click();
  await expect(wizardHelp).toBeHidden();
  await expect(help).toBeFocused();
  await expect(page.getByRole("button", { name: "Sair por agora", exact: true })).toBeVisible();
  await next(page);
  await page.getByRole("button", { name: "Item extra", exact: true }).click();
  const extra = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
  const name = extra.getByRole("textbox", { name: "Nome do material", exact: true });
  const unit = extra.getByRole("combobox", { name: "Unidade de medida", exact: true });
  const addMaterial = extra.getByRole("button", { name: "Adicionar material", exact: true });
  await addMaterial.click();
  await errorAt(name, "Informe o nome do material.");
  expect(commands).toBe(0);
  await name.fill("Item extra fictício mantido");
  await addMaterial.click();
  await errorAt(unit, "Escolha uma unidade de medida.");
  await unit.selectOption("tubo");
  const details = "Apresentação longa, de uso exclusivo do teste.";
  await extra.getByRole("textbox", { name: "Detalhes para identificar", exact: true }).fill(details);
  await addMaterial.click();
  await expect(extra).toHaveCount(0);
  await next(page);
  const extraName = page.getByText("Item extra fictício mantido", { exact: true });
  await expect(extraName).toHaveCount(1);
  await page.getByRole("button", { name: "Editar Item extra fictício mantido", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Editar item extra", exact: true });
  await expect(edit.getByRole("combobox", { name: "Unidade de medida", exact: true })).toHaveValue("tubo");
  await expect(edit.getByRole("textbox", { name: "Detalhes para identificar", exact: true })).toHaveValue(details);
  await expect(edit.getByRole("combobox", { name: "Informação do estoque da equipe" })).toHaveCSS("appearance", "none");
  await info.attach("extra-req", { body: await edit.screenshot(), contentType: "image/png" });
  await edit.getByRole("button", { name: "Salvar alteração", exact: true }).click();
  await next(page);
  await expect(page.getByText("Nenhuma observação adicionada.", { exact: true })).toBeVisible();
  const addObservation = page.getByRole("button", { name: "Adicionar observação", exact: true });
  await addObservation.click();
  const observation = page.getByRole("textbox", { name: "Observação 1", exact: true });
  await expect(observation).toBeFocused();
  const card = page.locator(".hca-supply-wizard-card");
  const footer = card.locator(".hca-supply-wizard-footer");
  await expect(card.getByRole("navigation", { name: "Etapas da requisição" })).toBeVisible();
  const originalViewport = page.viewportSize();
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await observation.scrollIntoViewIfNeeded();
    await expect.poll(() => footer.evaluate(element => {
      const box = element.getBoundingClientRect();
      const navigation = document.querySelector(".hca-bottom-navigation")?.getBoundingClientRect();
      const point = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.width > 0 && box.x >= 0 && box.right <= innerWidth &&
        box.bottom <= (navigation?.height ? navigation.top : innerHeight) && element.contains(point);
    })).toBe(true);
    await info.attach(`req-observacoes-${width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
  if (originalViewport) await page.setViewportSize(originalViewport);
  await addObservation.click();
  await expect(page.getByRole("textbox", { name: "Observação 2", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Remover observação 2", exact: true }).click();
  await expect(observation).toBeFocused();
  await observation.fill("x".repeat(1001));
  await next(page);
  await errorAt(observation, "A observação deve ter até 1.000 caracteres.");
  await expect(page.getByText("A observação deve ter até 1.000 caracteres.", { exact: true })).toHaveCount(1);
  await expect.poll(() => observation.evaluate(element => {
    const box = element.getBoundingClientRect();
    const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { belowHeader: box.top > 150, aboveNavigation: box.bottom < innerHeight - 64,
      exposed: center === element || element.contains(center) };
  })).toEqual({ belowHeader: true, aboveNavigation: true, exposed: true });
  await expect(observation).toHaveValue("x".repeat(1001));
  await expect(page.getByRole("heading", { name: "Observações", exact: true })).toBeVisible();
  expect(commands).toBe(0);
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "C026-observacao-" + width); }
  await capture(page, "C026-observacao", info.project.name);
  const validNote = "x".repeat(1000);
  const saveBody = (request: Request) => request.method() === "POST" &&
    new URL(request.url()).pathname === "/api/drafts" && request.postDataJSON().content?.observations?.[0] === validNote;
  let resumeSave!: () => void;
  const gate = new Promise<void>(resolve => { resumeSave = resolve; });
  await page.route("**/api/drafts", async route => {
    if (saveBody(route.request())) await gate;
    await route.continue();
  });
  const pendingSave = page.waitForRequest(saveBody);
  const confirm = page.getByRole("button", { name: "Emitir requisição", exact: true });
  try {
    await observation.fill(validNote);
    await pendingSave;
    await expect(footer.getByRole("status")).toHaveText("Salvando rascunho…");
    await next(page);
    await expect(page.getByRole("heading", { name: "Revisão", exact: true })).toBeVisible();
    await expect(confirm).toBeDisabled();
  } finally { resumeSave(); }
  await page.getByRole("button", { name: "Editar observações", exact: true }).click();
  await expect(observation).toBeFocused();
  await expect(observation).toHaveValue("x".repeat(1000));
  await next(page);
  await expect(extraName).toHaveCount(1);
  await expect(page.getByText("Cadastro pendente · tubo", { exact: true })).toBeVisible();
  const before = sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
  await confirm.click();
  const issued = page.getByRole("dialog", { name: "Requisição emitida", exact: true });
  await expect(issued).toBeVisible();
  await page.setViewportSize(info.project.name === "mobile" ? { width: 320, height: 720 } : { width: 390, height: 844 });
  const heading = page.locator("[data-document-heading]");
  await expect(heading).toBeVisible();
  const download = issued.getByRole("link", { name: "Baixar PDF", exact: true });
  const share = issued.getByRole("button", { name: "Compartilhar link", exact: true });
  const follow = issued.getByRole("button", { name: "Acompanhar ficha", exact: true });
  const pdf = await page.request.get((await download.getAttribute("href"))!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect(Math.abs((await download.boundingBox())!.y - (await share.boundingBox())!.y)).toBeLessThan(1);
  expect((await follow.boundingBox())!.y).toBeGreaterThan((await share.boundingBox())!.y);
  await info.attach("emissao-confirmada", { body: await issued.screenshot(), contentType: "image/png" });
  await share.click();
  const sharing = page.getByRole("dialog", { name: "Compartilhar ficha", exact: true });
  await expect(sharing.getByRole("textbox", { name: "Link da ficha" })).toHaveValue(new URL(page.url()).origin + new URL(page.url()).pathname);
  await sharing.getByRole("button", { name: "Fechar", exact: true }).click();
  await follow.click();
  await expect(issued).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Cadastro pendente", { exact: true })).toBeVisible();
  await selectDocumentSection(page, "files");
  await page.locator("summary").filter({ hasText: "Comprovante oficial" }).click();
  await expect(page.getByRole("button", { name: "Imprimir / salvar como PDF", exact: true })).toBeVisible();
  expect(commands).toBe(1);
  expect(sql(`select count(*) from public.requisitions where care_recipient_id=${q(f.patient)}`)).toBe("1");
  expect(JSON.parse(sql(`select jsonb_build_object('product',i.product_id,'category',i.category_snapshot,'unit',i.unit_snapshot,'details',i.extra_details) from public.requisition_items i where i.care_recipient_id=${q(f.patient)}`)))
    .toEqual({ product: null, category: "higiene", unit: "tubo", details });
  expect(sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)}`)).toBe(before);
  expect(sql(`select o.body from public.requisition_observations o join public.requisitions r on r.id=o.requisition_id where r.care_recipient_id=${q(f.patient)}`)).toBe("x".repeat(1000));
});

test("C026 apresentação incompleta aponta material, nome, código e fator sem perder dados nem mover estoque", async ({ page }, info) => {
  const f = await fixture(), ledger = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
  let commands = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/catalog/presentations" && request.method() === "POST") commands++; });
  await login(page, f.patient);
  await page.goto("/unidades?careRecipientId=" + f.patient);
  await page.getByRole("button", { name: "Nova apresentação", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Nova apresentação", exact: true });
  const review = drawer.getByRole("button", { name: "Revisar apresentação", exact: true });
  const material = drawer.getByRole("combobox", { name: "Material da apresentação", exact: true });
  await review.click();
  await errorAt(material, "Escolha o material da apresentação.");
  await material.fill("Material fictício V4 0");
  await material.press("ArrowDown");
  await page.getByRole("option", { name: /Material fictício V4 0/ }).click();
  await review.click();
  const name = drawer.getByLabel("Nome da apresentação", { exact: false });
  await errorAt(name, "Informe um nome de pelo menos dois caracteres.");
  await name.fill("Pacote preservado");
  await review.click();
  const barcode = drawer.getByLabel("Código da apresentação", { exact: false });
  await errorAt(barcode, "Informe um código de 8 a 14 algarismos, preservando os zeros iniciais.");
  await barcode.fill("0012345678901");
  await review.click();
  const factor = drawer.getByLabel("Fator na unidade base", { exact: false });
  await expect(factor).toBeFocused(); await expect(factor).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveValue("Pacote preservado"); await expect(barcode).toHaveValue("0012345678901"); expect(commands).toBe(0);
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "C026-apresentacao-" + width); }
  await capture(page, "C026-apresentacao", info.project.name);
  await factor.fill("10"); await review.click();
  await expect(drawer.getByRole("heading", { name: "Revisar apresentação", exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Confirmar apresentação", exact: true }).click();
  await expect(drawer).toHaveCount(0); expect(commands).toBe(1);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`)).toBe(ledger);
});

test("C031 política diferencia manter, alterar, branco, espaços e remover sem contaminar outro paciente", async ({ page }, info) => {
  const other = await fixture(), otherBefore = state(other.patient), f = await fixture();
  await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: "Nome anterior" }, p_key: randomUUID(), p_version: 1 });
  await login(page, f.patient);
  await page.goto("/configuracoes?careRecipientId=" + f.patient);
  const packets: { change: Record<string, unknown> }[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/patient-settings" && request.method() === "POST") packets.push(request.postDataJSON()); });
  const open = () => page.getByRole("button", { name: "Editar Comunicação e lembretes", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Comunicação e lembretes", exact: true });
  const mode = drawer.getByRole("combobox", { name: "O que fazer com o nome curto", exact: true });
  const name = drawer.getByRole("textbox", { name: "Nome curto nas mensagens", exact: true });
  const save = drawer.getByRole("button", { name: "Registrar política", exact: true });
  await open(); await expect(mode).toHaveValue("keep"); await expect(name).toBeDisabled(); await save.click();
  await expect(drawer).toHaveCount(0); expect(state(f.patient).settings.patientShortName).toBe("Nome anterior");
  await expect(page.getByRole("button", { name: "Editar Comunicação e lembretes", exact: true })).toBeFocused();
  expect(Object.hasOwn(packets[0].change, "patientShortName")).toBe(false);
  await open(); await mode.selectOption("change");
  const before = count(f.patient);
  for (const value of ["", "   "]) {
    await name.fill(value); await save.click();
    await errorAt(name, "Informe um nome curto de 1 a 60 caracteres, ou escolha remover.");
    await expect(name).toHaveValue(value); expect(count(f.patient)).toBe(before);
  }
  expect(packets).toHaveLength(1);
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await fieldGeometry(drawer, "C031-controles-" + width); await audit(page, "C031-nome-curto-" + width); }
  await capture(page, "C031-nome-curto", info.project.name);
  await name.fill("  Nome novo  "); await save.click(); await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar Comunicação e lembretes", exact: true })).toBeFocused();
  expect(state(f.patient).settings.patientShortName).toBe("Nome novo");
  expect(packets[1].change.patientShortName).toBe("Nome novo");
  await open(); await mode.selectOption("remove"); await expect(name).toBeDisabled(); await save.click(); await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar Comunicação e lembretes", exact: true })).toBeFocused();
  expect(state(f.patient).settings.patientShortName).toBeNull();
  expect(packets).toHaveLength(3); expect(packets[2].change.patientShortName).toBeNull();
  expect(state(other.patient)).toEqual(otherBefore);
});

test("C031 comparação anuncia remoção proposta e mantém o nome vigente até aprovação local", async ({ page }) => {
  const f = await fixture();
  await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: "Nome vigente" }, p_key: randomUUID(), p_version: 1 });
  const global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: null }, p_key: randomUUID(), p_version: 2 });
  await login(page, f.patient);
  await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people`);
  const row = page.getByRole("article", { name: "Proposta " + proposal.id.slice(0, 8), exact: true });
  await row.getByText("Comparar configuração vigente e proposta", { exact: true }).click();
  const comparison = row.getByRole("row").filter({ hasText: "Nome curto" });
  await expect(comparison).toContainText("Nome vigente");
  await expect(comparison).toContainText("Sem nome curto · usar o nome do cadastro");
  expect(state(f.patient).settings.patientShortName).toBe("Nome vigente");
  await row.getByRole("button", { name: "Aprovar proposta", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Configuração aplicada no paciente." })).toBeVisible();
  expect(state(f.patient).settings.patientShortName).toBeNull();
});
