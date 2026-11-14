import { test, expect, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { setup, issue, delivery, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";

test.setTimeout(150_000);
async function login(page:Page,patient:string,email=fixtures.family.email){
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(email);
 await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
function totp(secret:string){
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bits=[...secret.replaceAll("=","")].map(c=>alphabet.indexOf(c).toString(2).padStart(5,"0")).join("");
 const key=Buffer.from((bits.match(/.{8}/g)??[]).map(part=>parseInt(part,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const mac=createHmac("sha1",key).update(counter).digest(),offset=mac[mac.length-1]&15;
 return String((mac.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,"0");
}

test("L1 continuidade exige MFA com Auth real e conserva o destino seguro",async({page})=>{
 const f=await setup(),person=await shiftWorker(f.patient,"family");await login(page,f.patient,person.email);
 const enrolled=await person.client.auth.mfa.enroll({factorType:"totp",friendlyName:"L1 continuação fictícia"});expect(enrolled.error).toBeNull();
 const factor=enrolled.data!.id;
 try{
  expect((await person.client.auth.mfa.challengeAndVerify({factorId:factor,code:totp(enrolled.data!.totp.secret)})).error).toBeNull();
  // Activating a factor invalidates the earlier AAL1 session. Enter again,
  // then exercise the OAuth continuation with a live AAL1 session and factor.
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(person.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page).toHaveURL(/\/perfil\?mfa=required&next=/);
  await page.goto("/acesso/continuar?next="+encodeURIComponent("/historico?careRecipientId="+f.patient));
  await expect(page).toHaveURL(/\/perfil\?mfa=required&next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/historico?careRecipientId="+f.patient);
 }finally{expect((await person.client.auth.mfa.unenroll({factorId:factor})).error).toBeNull();}
});

test("L1 resultado de autenticação antigo não redireciona após sair da continuação",async({page})=>{
 let release!:()=>void,seen!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;}),requested=new Promise<void>(resolve=>{seen=resolve;});
 let first=true;
 await page.route("**/auth/v1/user",async route=>{
  if(!first)return route.continue();first=false;seen();await gate;
  await route.fulfill({status:401,json:{message:"Sessão fictícia encerrada"}});
 });
 await page.goto("/acesso/continuar?next=/historico");
 // Without a session the SDK can settle locally, so provide a real login
 // before the continuation whose deferred response is being exercised.
 if(first){
  await page.unroute("**/auth/v1/user");const f=await setup();await login(page,f.patient);
  await page.route("**/auth/v1/user",async route=>{if(!first)return route.continue();first=false;seen();await gate;await route.fulfill({status:401,json:{message:"Sessão fictícia encerrada"}});});
  await page.goto("/acesso/continuar?next=/historico");
 }
 await requested;await page.goto("/convites/aceitar");
 await expect(page).toHaveURL(/\/convites\/aceitar/);release();
 await expect(page.getByRole("heading",{name:/convite/i})).toBeVisible();
 await expect(page).toHaveURL(/\/convites\/aceitar/);
});

test("L1 seletor permite escolher o único paciente disponível quando a seleção global está vazia",async({page})=>{
 const f=await setup(),person=await shiftWorker(f.patient,"family");
 sql(`update public.profiles set role='admin',global_scope=true where id=${q(person.id)};update public.care_recipient_memberships set status='revoked' where user_id=${q(person.id)};`);
 await rpc(person.client,"select_active_context",{p_patient:null});
 // Keep only one of this real administrator's authorized patients in the UI
 // read to reproduce a one-choice installation without deleting other data.
 await page.route("**/api/context",async route=>{
  if(route.request().method()!=="GET")return route.continue();
  const response=await route.fetch(),body=await response.json();expect(response.ok()).toBe(true);
  body.data.patients=body.data.patients.filter((row:{id:string})=>row.id===f.patient);
  await route.fulfill({response,json:body});
 });
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(person.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();
 const picker=page.getByRole("combobox",{name:"Pessoa assistida",exact:true});
 await expect(picker).toHaveValue("");await expect(picker).toBeEnabled();await picker.selectOption(f.patient);await expect(picker).toHaveValue(f.patient);
});

test("L1 ciência antiga preserva a referência sem acesso e libera nova ciência após ausência comprovada",async({page})=>{
 const f=await setup(),req=await issue(f.patient,f.products);await login(page,f.patient);
 const key=`hca:science:${fixtures.family.id}:${req.id}`,attempt={mode:"express",expectedVersion:1,materialIdentity:"0".repeat(64)};
 await page.evaluate(({key,attempt})=>sessionStorage.setItem(key,JSON.stringify(attempt)),{key,attempt});
 await page.route(`**/api/requisitions/${req.id}/science?*`,route=>route.fulfill({status:403,json:{code:"FORBIDDEN",error:"Consulta indisponível na contraprova"}}));
 await page.goto(`/documentos/${req.id}`);await selectDocumentSection(page,"materials");
 await page.getByRole("button",{name:"Verificar ciência pendente",exact:true}).click();
 await expect(page.getByRole("dialog")).toContainText("continua preservada");
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBe(JSON.stringify(attempt));
 await page.unroute(`**/api/requisitions/${req.id}/science?*`);
 await page.getByRole("button",{name:"Verificar resultado",exact:true}).click();
 await expect(page.getByRole("dialog")).toContainText("não foi registrada");
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
 await page.getByRole("button",{name:"Fechar por enquanto",exact:true}).click();
 await page.getByRole("button",{name:"Dar ciência",exact:true}).click();await page.getByRole("button",{name:"Confirmar minha ciência",exact:true}).click();
 await expect(page.getByText("Ciência registrada para o conteúdo confirmado.",{exact:true})).toBeVisible();
 expect(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)} and user_id=${q(fixtures.family.id)} and mode='express'`)).toBe("1");
});

test("L1 pré-vínculo oferece só a necessidade em aberto e descarte exige nova avaliação familiar",async({page})=>{
 const f=await setup(),req=await issue(f.patient,f.products),receiver=await actor("professional",f.patient);
 const ent=await delivery(f.patient,req,[f.products[0]],{requestFulfillment:"complete"});
 await rpc(receiver,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[]},p_key:randomUUID(),p_version:ent.version});
 await login(page,f.patient);await page.goto(`/fichas/ent?careRecipientId=${f.patient}&requisitionId=${req.id}`);
 const links=page.locator("details").filter({has:page.getByText("Vincular requisições pendentes",{exact:true})});
 await links.locator("summary").click();
 await expect(links.getByRole("checkbox")).toHaveCount(1);await expect(links.getByRole("checkbox")).toBeChecked();
 const choice=links.getByRole("combobox");await expect(choice).toHaveCount(1);await choice.selectOption("complete");
 await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();
 const discard=page.getByRole("button",{name:"Descartar e começar nova",exact:true});await expect(discard).toBeEnabled();await discard.click();
 await page.getByRole("button",{name:"Confirmar descarte do rascunho",exact:true}).click();
 await expect(choice).toHaveValue("");
 expect(sql("select count(*) from public.operational_documents where care_recipient_id="+q(f.patient)+" and type='ENT'")).toBe("1");
});

test("L1 avaliação restaurada rejeitada libera nova escolha; resposta perdida recupera uma única avaliação",async({page})=>{
 const f=await setup(),req=await issue(f.patient,[f.products[0]]),receiver=await actor("professional",f.patient);
 let ent=await delivery(f.patient,req,[f.products[0]],{quantity:"4",requestFulfillment:"complete"});
 ent=await rpc(receiver,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[{lineId:ent.lines[0].id,acceptedQuantity:"2",notes:"Diferença fictícia"}]},p_key:randomUUID(),p_version:ent.version});
 await login(page,f.patient);
 const key=`hca:fulfillment-review:${fixtures.family.id}:${ent.id}`,packet={key:randomUUID(),lineId:ent.lines[0].id,decision:"complete",reason:"Referência anterior fictícia",version:ent.version-1};
 await page.evaluate(({key,packet})=>sessionStorage.setItem(key,JSON.stringify(packet)),{key,packet});
 await page.goto(`/documentos/${ent.id}`);
 const dialog=page.getByRole("dialog");await dialog.getByRole("button",{name:"Verificar mesma avaliação",exact:true}).click();
 await expect(dialog).toContainText("referência do recebimento mudou");
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
 await dialog.getByRole("combobox").selectOption("complete");
 await page.route(`**/api/documents/${ent.id}/fulfillment-review`,async route=>{
  const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort("failed");
 });
 await dialog.getByRole("button",{name:"Registrar avaliação familiar",exact:true}).click();
 await expect(dialog).toContainText("conteúdo e a identidade desta avaliação foram preservados");
 await expect(dialog.getByRole("button",{name:"Verificar mesma avaliação",exact:true})).toBeEnabled();
 await page.unroute(`**/api/documents/${ent.id}/fulfillment-review`);await page.reload();
 await dialog.getByRole("button",{name:"Verificar mesma avaliação",exact:true}).click();
 await expect(dialog).toHaveCount(0);
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
 expect(sql("select count(*) from private.requisition_fulfillment_reviews where document_id="+q(ent.id))).toBe("1");
 expect(sql("select count(*) from private.requisition_fulfillment_reviews where idempotency_key="+q(packet.key))).toBe("0");
});
