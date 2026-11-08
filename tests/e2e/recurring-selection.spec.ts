import {expect,test,type Page} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {privateDraftFixture,reqContent,savePacket,draftContext,officialState,rpc,fixtures} from "../integration/private-draft-fixtures.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
import {sql,sqlLiteral} from "../../scripts/test-environment.mjs";
import {selectContext} from "./auth-context";
import {audit} from "./accessibility-audit";
test.setTimeout(180000);
test.afterEach(async({page})=>{await page.unrouteAll({behavior:"wait"});});
const drawer=(page:Page)=>page.getByRole("dialog",{name:"Usar lista frequente",exact:true});
const panel=(page:Page)=>page.getByRole("region",{name:"Rascunho privado",exact:true});
async function login(page:Page,patient:string){
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.professional.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);await page.goto("/fichas/req");await expect(panel(page)).toBeVisible();await expect(panel(page).getByText("Consultando seu rascunho no servidor…",{exact:true})).toHaveCount(0);
}
async function open(page:Page){await page.getByRole("button",{name:"Usar lista frequente",exact:true}).click();await expect(drawer(page)).toBeVisible();await expect(drawer(page).getByText("Consultando suas listas neste paciente…",{exact:true})).toHaveCount(0);await expect(drawer(page).getByText("Atualizando disponibilidade dos materiais…",{exact:true})).toHaveCount(0);await expect(drawer(page).getByRole("combobox")).toBeVisible();}
async function choose(page:Page,name:string){const combo=drawer(page).getByRole("combobox");await combo.fill(name);await combo.press("ArrowDown");await expect(page.getByRole("option",{name,exact:true})).toBeVisible();await combo.press("Enter");await expect(drawer(page).getByRole("region",{name:"Materiais da lista escolhida",exact:true})).toBeVisible();}
async function seeded(){const f=await privateDraftFixture(),content=reqContent(f);content.lines=f.products.slice(0,2).map((id:string,i:number)=>({...content.lines[0],productId:id,productName:`Material fictício V4 ${i}`,currentStock:"7",urgent:true,repeatReason:"Motivo antigo não reutilizável"}));const saved=await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",content));return {f,saved};}

test("lista frequente cruza sessões, copia só materiais e nunca estoque7, urgência ou justificativa antiga",async({page,browser})=>{
 const {f,saved}=await seeded(),before=officialState(f);
 await login(page,f.patient);await panel(page).getByRole("button",{name:"Continuar rascunho",exact:true}).click();await open(page);
 await drawer(page).getByLabel("Nome da seleção recorrente",{exact:true}).fill("Habitual");await drawer(page).getByRole("button",{name:"Salvar seleção como lista",exact:true}).click();await expect(drawer(page)).toContainText("Lista “Habitual” salva.");
 await rpc(f.pro,"creation_draft_command",{...savePacket(f),p_id:saved.id,p_expected:saved.revision,p_body:{action:"discard"},p_key:randomUUID()});
 const device=await browser.newContext();try{const peer=await device.newPage();await login(peer,f.patient);await open(peer);await choose(peer,"Habitual");const checks=drawer(peer).getByRole("checkbox");await expect(checks).toHaveCount(2);for(const checkbox of await checks.all()){await expect(checkbox).not.toBeChecked();await checkbox.check();}
  for(const width of [320,390,768,1440]){await peer.setViewportSize({width,height:900});await audit(peer,"REQ frequent selection "+width);}
  await drawer(peer).getByRole("button",{name:"Adicionar materiais selecionados",exact:true}).click();await expect(drawer(peer)).toHaveCount(0);await expect(peer.getByRole("button",{name:"Usar lista frequente",exact:true})).toBeFocused();
  await peer.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(panel(peer)).toContainText("Revisão 1");const actual=await draftContext(f);expect(actual.content.lines).toHaveLength(2);for(const line of actual.content.lines){expect(line.currentStock).toBeNull();expect(line.stockObservation).toBe("unfilled");expect(line.stockObservationAt).toBeNull();expect(line.urgent).toBe(false);expect(line.repeatReason).toBeUndefined();}expect(actual.content.observations).toEqual([]);expect(officialState(f)).toBe(before);
  const countBefore=Number(sql(`select count(*) from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)};`));
  const issued=peer.waitForResponse(response=>response.request().method()==="POST"&&new URL(response.url()).pathname==="/api/requisitions");
  for(let i=0;i<6;i++)await peer.getByRole("button",{name:/^Avançar$|^Revisar$/}).click();
  await peer.getByRole("button",{name:"Concluir requisição",exact:true}).click();
  const response=await issued;expect(response.ok(),await response.text()).toBe(true);
  const sent=response.request().postDataJSON();for(const line of sent.lines){expect(line.currentStock).toBeNull();expect(line.urgent).toBe(false);expect(line.repeatReason).toBeUndefined();}
  const receipt=(await response.json()).receipt,id=receipt.requisitionId??receipt.id;expect(typeof id).toBe("string");
  const persisted=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('id',product_id,'stock',current_stock,'observation',stock_observation,'urgent',urgent) order by product_id) from public.requisition_items where requisition_id=${sqlLiteral(id)};`));
  expect(persisted.map((line:{id:string})=>line.id)).toEqual([...f.products].sort());for(const line of persisted){expect(line.stock).toBeNull();expect(line.observation).toBe("unfilled");expect(line.urgent).toBe(false);}
  expect(Number(sql(`select count(*) from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)};`))).toBe(countBefore+1);
 }finally{await device.close();}
});

test("lista frequente recupera o pacote após reload e403, sem expor resumo privado durante a recusa",async({page})=>{
 const {f}=await seeded(),before=officialState(f);await login(page,f.patient);await panel(page).getByRole("button",{name:"Continuar rascunho",exact:true}).click();await open(page);await drawer(page).getByLabel("Nome da seleção recorrente",{exact:true}).fill("Preservada após perda");
 const packets:unknown[]=[];await page.route("**/api/requisitions/selections",async route=>{if(route.request().method()!=="POST")return route.continue();packets.push(route.request().postDataJSON());if(packets.length===1){const result=await route.fetch();expect(result.ok(),await result.text()).toBe(true);return route.abort("failed");}if(packets.length===2)return route.fulfill({status:403,json:{code:"FORBIDDEN",error:"Recuperação temporariamente recusada neste ensaio"}});return route.continue();});
 await drawer(page).getByRole("button",{name:"Salvar seleção como lista",exact:true}).click();await expect(drawer(page).getByRole("button",{name:"Recuperar salvamento da lista",exact:true})).toBeEnabled();await page.reload();await expect(panel(page)).toBeVisible();await open(page);
 await drawer(page).getByRole("button",{name:"Recuperar salvamento da lista",exact:true}).click();await expect(drawer(page)).toContainText("Revalide o acesso");await expect(drawer(page).getByText("Preservada após perda",{exact:true})).toHaveCount(0);
 await drawer(page).getByRole("button",{name:"Consultar listas novamente",exact:true}).click();await expect(drawer(page).getByRole("button",{name:"Recuperar salvamento da lista",exact:true})).toBeEnabled();await drawer(page).getByRole("button",{name:"Recuperar salvamento da lista",exact:true}).click();await expect(drawer(page)).toContainText("Lista “Preservada após perda” salva.");expect(packets).toHaveLength(3);expect(packets[1]).toEqual(packets[0]);expect(packets[2]).toEqual(packets[0]);expect(await rpc(f.pro,"requisition_selections",{p_patient:f.patient})).toHaveLength(1);expect(await page.evaluate(key=>sessionStorage.getItem(key),`hca:recurring-selection:${fixtures.professional.id}:${f.patient}`)).toBeNull();expect(officialState(f)).toBe(before);
});

test("lista frequente atualiza disponibilidade e mantém valores atuais de duplicatas sem incluir material inativo",async({page})=>{
 const f=await privateDraftFixture(),content=reqContent(f);content.lines[0].currentStock="2";content.lines[0].urgent=true;content.lines[0].repeatReason="Motivo atual preservado";
 await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",content));await rpc(f.pro,"save_requisition_selection",{p_patient:f.patient,p_name:"Conferir disponibilidade",p_products:f.products,p_key:randomUUID()});await login(page,f.patient);await panel(page).getByRole("button",{name:"Continuar rascunho",exact:true}).click();
 await open(page);await choose(page,"Conferir disponibilidade");await drawer(page).getByRole("checkbox",{name:/Material fictício V4 1/}).check();await drawer(page).getByRole("button",{name:"Voltar à requisição",exact:true}).click();
 sql(`update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[1])};`);const before=officialState(f);await open(page);
 const preview=drawer(page).getByRole("region",{name:"Materiais da lista escolhida",exact:true});await expect(preview).toContainText("Já selecionado; seus valores atuais serão mantidos.");await expect(preview).toContainText("Material indisponível no catálogo atual");await expect(preview.getByRole("checkbox",{name:/Material fictício V4 0/})).toBeDisabled();await expect(preview.getByRole("checkbox",{name:/Material indisponível/})).toBeDisabled();await expect(preview.getByRole("button",{name:"Adicionar materiais selecionados",exact:true})).toBeDisabled();await drawer(page).getByRole("button",{name:"Voltar à requisição",exact:true}).click();
 await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(panel(page)).toContainText("Revisão 2");const actual=await draftContext(f);expect(actual.content.lines.map((line:{productId:string})=>line.productId)).toEqual([f.products[0]]);expect(actual.content.lines.find((line:{productId:string})=>line.productId===f.products[0])).toMatchObject({currentStock:"2",urgent:true,repeatReason:"Motivo atual preservado"});expect((await rpc(f.pro,"requisition_selections",{p_patient:f.patient}))[0].productIds).toEqual([...f.products].sort());expect(officialState(f)).toBe(before);
});
