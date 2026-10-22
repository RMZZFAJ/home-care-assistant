import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { assertLocalProject, fixtureFile } from "../../scripts/test-environment.mjs";

test.describe("integração completa no ambiente local de desenvolvimento", () => {
  test.skip(process.env.HCA_E2E_LOCAL !== "1", "Execute pelo runner, que valida a origem local do banco e configura o servidor de teste.");
  test.setTimeout(120_000);
  function fixtures() {
    assertLocalProject();
    return JSON.parse(readFileSync(fixtureFile,"utf8")) as Record<string,{id:string;email:string}>;
  }
  async function login(page: Page,name = "global") {
    await page.goto("/login");
    await page.getByLabel("E-mail",{exact:true}).fill(fixtures()[name].email);
    await page.getByLabel("Senha",{exact:true}).fill("Hca-fixture-only-2026!");
    await page.getByRole("button",{name:"Entrar",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Requisição de insumos"}).first()).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Pessoa assistida",exact:true})).toBeVisible();
  }
  async function createPatient(page: Page) {
    const response = await page.request.post("/api/admin",{data:{action:"recipient",id:null,displayName:`Paciente E2E ${randomUUID().slice(0,8)}`,isActive:true,isDevelopment:true}});
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.id).toBeTruthy(); return result.data.id as string;
  }

  test("catálogo → requisição → comprovante imutável → estoque → inventário aprovado",async({page}) => {
    await login(page); const patientId = await createPatient(page);
    expect((await page.request.post("/api/admin",{data:{action:"membership",careRecipientId:patientId,userId:fixtures().reader.id,role:"reader",canManageStock:false,canCountStock:false}})).ok()).toBeTruthy();
    expect((await page.request.post("/api/admin",{data:{action:"notificationRecipient",careRecipientId:patientId,recipientUserId:fixtures().reader.id,recipientGroup:"family",channel:"internal",destination:"",isEnabled:true}})).ok()).toBeTruthy();
    await page.goto(`/admin?careRecipientId=${patientId}`);
    await page.getByRole("button",{name:"Catálogo",exact:true}).click();
    await page.getByLabel("Nome",{exact:true}).fill("Material de teste E2E");
    await page.getByRole("combobox",{name:"Categoria",exact:true}).selectOption("higiene");
    const saved = page.waitForResponse((response) => response.url().endsWith("/api/admin") && response.request().method() === "POST");
    await page.getByRole("button",{name:"Salvar item",exact:true}).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(page.getByText("Alteração salva e auditada.")).toBeVisible();
    const catalogResponse = await page.request.get(`/api/catalog?careRecipientId=${patientId}`);
    const catalog = await catalogResponse.json(); const productId = catalog.data[0].id as string;
    await page.goto(`/?careRecipientId=${patientId}`);
    await page.getByRole("button",{name:"Continuar",exact:true}).click();
    await page.getByRole("button",{name:"Continuar",exact:true}).click();
    await page.getByRole("checkbox",{name:"Material de teste E2E",exact:true}).check();
    await page.getByLabel("Estoque atual",{exact:true}).fill("2");
    for (let step = 0; step < 4; step++) await page.getByRole("button",{name:"Continuar",exact:true}).click();
    const submitted = page.waitForResponse((response) => response.url().endsWith("/api/requisitions") && response.request().method() === "POST");
    await page.getByRole("button",{name:"Confirmar e registrar",exact:true}).click();
    const submission = await submitted; expect(submission.ok()).toBeTruthy();
    const receipt = (await submission.json()).receipt;
    await expect(page.getByRole("heading",{name:"Comprovante oficial"})).toBeVisible();
    await expect(page.getByText(receipt.protocol,{exact:true})).toBeVisible();
    const notification = page.getByRole("listitem").filter({hasText:"Família · Teste reader · internal"});
    await expect(notification).toBeVisible();
    await expect(notification).toContainText("Família · Teste reader · internal · Pendente");
    await expect(notification.getByText("0 tentativa(s) · Ainda não processada",{exact:true})).toBeVisible();
    expect((await page.request.post("/api/admin/notifications",{data:{action:"process",limit:50}})).ok()).toBeTruthy();
    await expect(notification).toContainText("Família · Teste reader · internal · Entregue",{timeout:15_000});
    await expect(notification.getByText(/^1 tentativa\(s\) · Última tentativa:/)).toBeVisible();
    const renamed = await page.request.post("/api/admin",{data:{action:"product",careRecipientId:patientId,id:productId,name:"Nome alterado após requisição",category:"higiene",unit:"unidade",aliases:[],description:null,sortOrder:0,isActive:true}});
    expect(renamed.ok()).toBeTruthy();
    await page.getByRole("link",{name:"Consultar registro e notificações"}).click();
    await expect(page.getByRole("heading",{name:receipt.protocol,exact:true})).toBeVisible();
    await expect(page.getByText("Material de teste E2E",{exact:true})).toBeVisible();
    await expect(page.getByText("Nome alterado após requisição",{exact:true})).toHaveCount(0);
    await page.getByRole("combobox",{name:"Próximo estado",exact:true}).selectOption("under_review");
    await page.getByLabel("Justificativa",{exact:true}).fill("Revisão operacional E2E");
    await page.getByRole("button",{name:"Salvar alteração",exact:true}).click();
    await expect(page.getByText("Estado atualizado e registrado na auditoria.")).toBeVisible();
    await page.goto(`/estoque?careRecipientId=${patientId}`);
    await expect(page.getByRole("heading",{name:"Registrar movimentação"})).toBeVisible();
    await page.getByRole("combobox",{name:"Item",exact:true}).selectOption(productId);
    await page.getByLabel("Quantidade",{exact:true}).fill("5");
    await page.getByLabel("Justificativa",{exact:true}).fill("Entrada E2E para conciliação");
    await page.getByRole("button",{name:"Confirmar movimentação",exact:true}).click();
    await expect(page.getByText("Movimentação registrada. Saldos atualizados.")).toBeVisible();
    await page.goto(`/inventarios?careRecipientId=${patientId}`);
    await page.getByRole("button",{name:"Abrir inventário",exact:true}).click();
    await expect(page.getByText("Contagem aberta com referência de estoque registrada.")).toBeVisible();
    await page.getByLabel("Contagem",{exact:true}).first().fill("4");
    await page.getByLabel("Justificativa da divergência",{exact:true}).fill("Uma unidade consumida antes da conferência");
    await page.getByRole("button",{name:"Salvar contagem",exact:true}).click();
    await expect(page.getByText("Contagem salva. O saldo oficial permanece sujeito à aprovação.")).toBeVisible();
    await page.getByRole("button",{name:"Submeter contagem para revisão",exact:true}).click();
    await expect(page.getByText("Contagem enviada para revisão.")).toBeVisible();
    await page.getByRole("button",{name:"Aprovar e ajustar estoque",exact:true}).click();
    await expect(page.getByText("Inventário aprovado e ajustes registrados uma única vez.")).toBeVisible();
    const stock = await (await page.request.get(`/api/stock/movements?careRecipientId=${patientId}`)).json();
    expect(stock.balances.find((balance: {product_id:string;location:string}) => balance.product_id === productId && balance.location === "CARE_TEAM").balance).toBe(4);
    const history = await (await page.request.get(`/api/requisitions?careRecipientId=${patientId}&protocol=${receipt.protocol}`)).json();
    expect(history.total).toBe(1); expect(history.data[0].status).toBe("under_review");
  });

  test("leitor consulta dados e tem escrita negada também pela API",async({page}) => {
    await login(page); const patientId = await createPatient(page);
    const membership = await page.request.post("/api/admin",{data:{action:"membership",careRecipientId:patientId,userId:fixtures().reader.id,role:"reader",canManageStock:true,canCountStock:true}});
    expect(membership.ok()).toBeTruthy();
    await page.getByRole("button",{name:"Sair",exact:true}).click();
    await login(page,"reader");
    await page.goto(`/?careRecipientId=${patientId}`);
    await expect(page.getByText("Seu vínculo permite consultar este paciente.",{exact:false})).toBeVisible();
    await expect(page.getByRole("button",{name:"Continuar",exact:true})).toHaveCount(0);
    await page.goto(`/estoque?careRecipientId=${patientId}`);
    await expect(page.getByRole("heading",{name:"Saldos atuais"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Registrar movimentação"})).toHaveCount(0);
    const denied = await page.request.post("/api/stock/inventory",{data:{action:"create",careRecipientId:patientId,location:"CARE_TEAM"}});
    expect(denied.status()).toBe(403);
    const deniedAdmin = await page.request.get(`/api/admin?careRecipientId=${patientId}&section=memberships`);
    expect(deniedAdmin.status()).toBe(403);
  });

  test("retry após resposta perdida recupera a mesma requisição sem duplicação",async({page}) => {
    await login(page); const patientId = await createPatient(page);
    const adopted = await page.request.post("/api/admin",{data:{action:"adoptProduct",careRecipientId:patientId,productId:"fralda"}}); expect(adopted.ok()).toBeTruthy();
    await page.goto(`/?careRecipientId=${patientId}`);
    await page.getByRole("button",{name:"Continuar",exact:true}).click(); await page.getByRole("button",{name:"Continuar",exact:true}).click();
    await page.getByRole("checkbox",{name:"Fralda",exact:true}).check();
    for(let step=0;step<4;step++) await page.getByRole("button",{name:"Continuar",exact:true}).click();
    let lost = false;
    await page.route("**/api/requisitions",async(route) => { if(route.request().method() === "POST" && !lost) { lost = true; await route.fetch(); await route.abort("failed"); } else await route.continue(); });
    await page.getByRole("button",{name:"Confirmar e registrar",exact:true}).click();
    await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeVisible();
    let releaseCatalog!: () => void;
    const delayedCatalog = new Promise<void>((resolve) => { releaseCatalog = resolve; });
    let catalogFailed = false;
    await page.route("**/api/catalog?**", async (route) => {
      if (!catalogFailed) {
        catalogFailed = true;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Catálogo temporariamente indisponível para o teste." }) });
        return;
      }
      await delayedCatalog;
      await route.continue();
    });
    await page.reload();
    await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Recarregar catálogo",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeDisabled();
    await page.getByRole("button",{name:"Recarregar catálogo",exact:true}).click();
    await expect(page.getByText("Carregando catálogo do paciente…",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeDisabled();
    releaseCatalog();
    await page.getByRole("button",{name:"Recuperar esta tentativa",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Comprovante oficial"})).toBeVisible();
    const history = await (await page.request.get(`/api/requisitions?careRecipientId=${patientId}`)).json();
    expect(history.total).toBe(1);
  });

  test("paciente renomeado e inativo preserva histórico paginado, filtros e impressão", async ({ page }) => {
    await login(page);
    const patientId = await createPatient(page);
    const originalName = (await (await page.request.get("/api/context")).json()).data.patients.find((patient: { id: string }) => patient.id === patientId).display_name as string;
    expect((await page.request.post("/api/admin", { data: { action: "adoptProduct", careRecipientId: patientId, productId: "fralda" } })).ok()).toBeTruthy();
    const receipts: Array<{ id: string; protocol: string }> = [];
    for (let index = 0; index < 21; index++) {
      const response = await page.request.post("/api/requisitions", { data: { careRecipientId: patientId, idempotencyKey: randomUUID(), lines: [{ productId: "fralda", currentStock: index, urgent: false }], extraItems: [], observations: [`Consulta paginada ${index}`] } });
      expect(response.ok()).toBeTruthy();
      const receipt = (await response.json()).receipt;
      receipts.push({ id: receipt.requisitionId, protocol: receipt.protocol });
    }
    const first = receipts[0];
    expect((await page.request.patch(`/api/requisitions/${first.id}/status`, { data: { status: "under_review", reason: "Revisão para verificar filtro e trilha" } })).ok()).toBeTruthy();
    await page.goto(`/historico?careRecipientId=${patientId}`);
    await expect(page.getByText("21 registro(s)", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
    await expect(page.getByText(first.protocol, { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("under_review");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText("1 registro(s)", { exact: true })).toBeVisible();
    await expect(page.getByText(first.protocol, { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("");
    await page.getByLabel("Protocolo", { exact: true }).fill(receipts[20].protocol);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText(receipts[20].protocol, { exact: true })).toBeVisible();
    await expect(page.getByText(first.protocol, { exact: true })).toHaveCount(0);
    await page.getByLabel("Protocolo", { exact: true }).fill("");
    await page.getByLabel("De", { exact: true }).fill("2099-01-01");
    await page.getByLabel("Até", { exact: true }).fill("2099-01-02");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText("Nenhuma requisição encontrada para os filtros selecionados.", { exact: true })).toBeVisible();
    await page.goto(`/admin?careRecipientId=${patientId}`);
    const renamed = `Paciente renomeado ${randomUUID().slice(0, 8)}`;
    await page.getByLabel("Nome de exibição", { exact: true }).fill(renamed);
    await page.getByRole("checkbox", { name: "Paciente ativo", exact: true }).uncheck();
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Salvar paciente", exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(page.getByText("Paciente inativo.", { exact: false })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Pessoa assistida", exact: true }).getByRole("option", { name: `${renamed} (inativo)`, exact: true })).toHaveAttribute("value", patientId);
    await page.goto(`/historico/${first.id}?careRecipientId=${patientId}`);
    await expect(page.getByRole("heading", { name: first.protocol, exact: true })).toBeVisible();
    await expect(page.getByText(`Paciente: ${originalName}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Revisão para verificar filtro e trilha", { exact: true })).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("heading", { name: first.protocol, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Imprimir / salvar como PDF", exact: true })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Navegação principal", exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "Salvar alteração", exact: true })).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await page.goto(`/?careRecipientId=${patientId}`);
    await expect(page.getByText("Seu vínculo permite consultar este paciente.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0);
    const denied = await page.request.post("/api/requisitions", { data: { careRecipientId: patientId, idempotencyKey: randomUUID(), lines: [{ productId: "fralda", currentStock: 0, urgent: false }], extraItems: [], observations: [] } });
    expect(denied.status()).toBe(409);
  });

  test("histórico de estoque pagina, filtra período e preserva saldo de item inativo",async({page}) => {
    await login(page); const patientId = await createPatient(page);
    expect((await page.request.post("/api/admin",{data:{action:"adoptProduct",careRecipientId:patientId,productId:"fralda"}})).ok()).toBeTruthy();
    for (let index=0;index<21;index++) {
      const movement = await page.request.post("/api/stock/movements",{data:{careRecipientId:patientId,productId:"fralda",quantity:1,movementType:"inbound",sourceLocation:null,destinationLocation:"CARE_TEAM",justification:`Entrada paginada ${index}`,idempotencyKey:randomUUID()}});
      expect(movement.ok()).toBeTruthy();
    }
    await page.goto(`/estoque?careRecipientId=${patientId}`);
    await expect(page.getByText("21 movimentação(ões) encontrada(s).",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Próxima",exact:true}).click();
    await expect(page.getByText("Página 2 de 2",{exact:true})).toBeVisible();
    await expect(page.getByText("Entrada paginada 0",{exact:true})).toBeVisible();
    await page.getByLabel("De",{exact:true}).fill("2099-01-01");
    await page.getByLabel("Até",{exact:true}).fill("2099-01-02");
    await page.getByRole("button",{name:"Buscar movimentações",exact:true}).click();
    await expect(page.getByText("Nenhuma movimentação encontrada para os filtros selecionados.",{exact:true})).toBeVisible();
    const archive = await page.request.post("/api/admin",{data:{action:"product",careRecipientId:patientId,id:"fralda",name:"Fralda arquivada",category:"higiene",unit:"unidade",aliases:[],description:null,sortOrder:0,isActive:false}});
    expect(archive.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("rowheader",{name:"Fralda arquivada (inativo) unidade",exact:true})).toBeVisible();
    const row = page.getByRole("row").filter({has:page.getByRole("rowheader",{name:"Fralda arquivada (inativo) unidade",exact:true})});
    await expect(row.getByRole("cell").first()).toHaveText("21");
    await expect(page.getByRole("combobox",{name:"Item",exact:true}).getByRole("option",{name:"Fralda arquivada",exact:false})).toHaveCount(0);
    const denied = await page.request.post("/api/stock/movements",{data:{careRecipientId:patientId,productId:"fralda",quantity:1,movementType:"inbound",sourceLocation:null,destinationLocation:"CARE_TEAM",justification:"Não operar produto inativo",idempotencyKey:randomUUID()}});
    expect(denied.ok()).toBe(false);
  });

  test("revisão de inventário rejeita, reconta e cancela preservando as contagens",async({page}) => {
    await login(page); const patientId = await createPatient(page);
    expect((await page.request.post("/api/admin",{data:{action:"adoptProduct",careRecipientId:patientId,productId:"fralda"}})).ok()).toBeTruthy();
    await page.goto(`/inventarios?careRecipientId=${patientId}`);
    await page.getByRole("button",{name:"Abrir inventário",exact:true}).click();
    await expect(page.getByText("Contagem aberta com referência de estoque registrada.")).toBeVisible();
    await page.getByLabel("Contagem",{exact:true}).fill("0");
    await page.getByRole("button",{name:"Salvar contagem",exact:true}).click();
    await expect(page.getByText("Contagem salva.",{exact:false})).toBeVisible();
    await page.getByRole("button",{name:"Submeter contagem para revisão",exact:true}).click();
    await expect(page.getByText("Contagem enviada para revisão.")).toBeVisible();
    await page.getByRole("button",{name:"Iniciar revisão",exact:true}).click();
    await expect(page.getByText("Contagem em revisão administrativa.")).toBeVisible();
    await page.getByRole("combobox",{name:"Ação de revisão",exact:true}).selectOption("reject");
    await page.getByLabel("Motivo",{exact:true}).fill("Necessário repetir conferência física");
    await page.getByRole("button",{name:"Confirmar revisão",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Equipe de cuidado · Rejeitado",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Iniciar nova contagem com referência atual",exact:true}).click();
    await expect(page.getByText("Nova contagem aberta com referência atualizada.",{exact:false})).toBeVisible();
    await page.getByLabel("Motivo",{exact:true}).fill("Contagem suspensa por revisão administrativa");
    await page.getByRole("button",{name:"Confirmar revisão",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Equipe de cuidado · Cancelado",exact:true})).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Selecionar inventário",exact:true}).getByRole("option")).toHaveCount(3);
    const inventory = await (await page.request.get(`/api/stock/inventory?careRecipientId=${patientId}`)).json();
    expect(inventory.total).toBe(2);
    expect(inventory.data.every((item:{status:string})=>item.status === "cancelled")).toBe(true);
  });
});
