import {expect,test,type Page} from "@playwright/test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import sharp from "sharp";
import {fixtureFile,assertLocalProject,sql,sqlLiteral} from "../../scripts/test-environment.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
test.setTimeout(240_000);
function fixtures(){assertLocalProject();return JSON.parse(readFileSync(fixtureFile,"utf8")) as Record<string,{id:string;email:string}>;}
async function login(page:Page,role="global"){await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures()[role].email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await expect(page.getByRole("combobox",{name:"Pessoa assistida",exact:true})).toBeVisible();}
async function logout(page:Page){await page.getByLabel("Menu do usuário",{exact:true}).click();await page.getByRole("button",{name:"Sair",exact:true}).click();await expect(page).toHaveURL(/\/login$/);}
async function post(page:Page,path:string,data:unknown){const response=await page.request.post(path,{data});expect(response.ok(),await response.text()).toBeTruthy();return response.json();}
async function prepare(page:Page,count=1){
 const patient=(await post(page,"/api/admin",{action:"recipient",id:null,displayName:"Homologação E2E "+randomUUID().slice(0,8),isActive:true,isDevelopment:true})).data.id as string;
 for(const role of ["adminA","adminB","family","professional","reader"])await post(page,"/api/admin",{action:"membership",careRecipientId:patient,userId:fixtures()[role].id,role:role.startsWith("admin")?"admin":role,canManageStock:false,canCountStock:false});
 const products:{id:string;name:string}[]=[];
 for(let index=0;index<count;index++){const product=(await post(page,"/api/admin",{action:"product",careRecipientId:patient,id:null,name:"Material "+String(index+1).padStart(2,"0"),category:"higiene",unit:"unidade",aliases:[],isActive:true,sortOrder:index})).data;products.push({id:product.product_id,name:product.name});}
 return {patient,products};
}
async function next(page:Page){await page.getByRole("button",{name:/^Avançar$|^Revisar$/}).click();}
async function confirm(page:Page){await page.getByRole("button",{name:"Revisar operação",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Confirmar operação",exact:true}).click();await expect(page.getByRole("dialog")).not.toBeVisible();await expect(page.getByText("Operação confirmada e registrada na ficha.",{exact:false})).toBeVisible();}
async function issueReq(page:Page,patient:string,productName:string){
 await page.goto("/fichas/req?careRecipientId="+patient);await next(page);await next(page);await page.getByRole("checkbox",{name:new RegExp("^"+productName)}).check();await page.getByLabel("Estoque observado com a equipe",{exact:false}).fill("2");for(let step=0;step<4;step++)await next(page);
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/requisitions"&&r.request().method()==="POST");await page.getByRole("button",{name:"Concluir requisição",exact:true}).click();const response=await pending;expect(response.ok(),await response.text()).toBeTruthy();return (await response.json()).receipt;
}
async function issueSupply(page:Page,type:string,patient:string,productName:string,amount:string,requestId?:string){
 await page.goto("/fichas/"+type.toLowerCase()+"?careRecipientId="+patient+(requestId?"&requisitionId="+requestId:""));
 if(type==="ENT")await page.getByLabel("Destinatário designado",{exact:false}).selectOption(fixtures().professional.id);
 if(type==="COM")await page.getByLabel("Forma de aquisição").selectOption("donation");
 await next(page);await next(page);
 if(type!=="BAL"&&!requestId)await page.getByRole("checkbox",{name:new RegExp("^"+productName)}).check();
 await page.getByLabel("Quantidade — "+productName,{exact:true}).fill(amount);
 for(let step=0;step<3;step++)await next(page);
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/documents"&&r.request().method()==="POST"&&!r.request().postDataJSON().draft || /\/revise$/.test(new URL(r.url()).pathname)&&r.request().method()==="POST");
 await page.getByRole("button",{name:"Confirmar e concluir",exact:true}).click();const response=await pending;expect(response.ok(),await response.text()).toBeTruthy();return (await response.json()).data;
}

test("REQ → COM doação → validação → estoque familiar → ENT parcial → BAL real",async({page})=>{
 await login(page);const {patient,products}=await prepare(page);const product=products[0];
 await logout(page);await login(page,"professional");
 const req=await issueReq(page,patient,product.name);expect(req.code).toBe("REQ-0001");
 await logout(page);await login(page,"family");const purchase=await issueSupply(page,"COM",patient,product.name,"10",req.requisitionId);expect(purchase.code).toBe("COM-0001");expect(purchase.status).toBe("pending_approval");
 await page.goto("/fichas/"+purchase.id+"?careRecipientId="+patient);await expect(page.getByRole("button",{name:"Aprovar itens",exact:true})).toHaveCount(0);
 await logout(page);await login(page,"adminA");await page.goto("/fichas/"+purchase.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Aprovar itens",exact:true}).click();await confirm(page);
 await logout(page);await login(page,"family");await page.goto("/fichas/"+purchase.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Registrar aquisição",exact:true}).click();await confirm(page);await page.getByRole("button",{name:"Confirmar recebimento",exact:true}).click();await confirm(page);
 let stock=await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json();expect(Number(stock.overview[0].family.confirmed)).toBe(0);
 await logout(page);await login(page,"adminA");await page.goto("/fichas/"+purchase.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Validar recebimento",exact:true}).click();await confirm(page);
 stock=await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json();expect(Number(stock.overview[0].family.confirmed)).toBe(10);
 await logout(page);await login(page,"family");const delivery=await issueSupply(page,"ENT",patient,product.name,"10",req.requisitionId);expect(delivery.code).toBe("ENT-0001");expect(delivery.status).toBe("pending_receipt");
 await logout(page);await login(page,"professional");await page.goto("/fichas/"+delivery.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Informar divergência",exact:true}).click();await page.getByRole("checkbox",{name:new RegExp("^"+product.name)}).check();await page.getByLabel("Efetivamente recebido").fill("6");await confirm(page);
 await expect(page.getByText("0/1 linhas integralmente conferidas",{exact:true})).toBeVisible();
 stock=await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json();expect(Number(stock.overview[0].team.confirmed)).toBe(6);expect(Number(stock.overview[0].team.incoming)).toBe(4);expect(stock.overview[0].family).toBeNull();
 await page.goto("/historico/"+req.requisitionId+"?careRecipientId="+patient);await expect(page.getByRole("heading",{name:/1\/1 itens atendidos/})).toBeVisible();
 const png=await sharp({create:{width:4,height:4,channels:3,background:"#ffffff"}}).png().toBuffer();
 await page.getByLabel("Adicionar foto ou PDF").setInputFiles({name:"ficha-fisica.png",mimeType:"image/png",buffer:png});await page.getByRole("button",{name:"Enviar anexo",exact:true}).click();await expect(page.getByRole("link",{name:"ficha-fisica.png",exact:true})).toBeVisible();
 const pdf=await page.request.get("/api/documents/"+req.requisitionId+"/pdf");expect(pdf.ok(),await pdf.text()).toBeTruthy();expect(pdf.headers()["content-type"]).toContain("application/pdf");expect((await pdf.body()).subarray(0,5).toString()).toBe("%PDF-");
 await logout(page);await login(page,"adminA");let current=(await(await page.request.get("/api/documents/"+delivery.id)).json()).data;
 await post(page,"/api/documents/"+delivery.id,{action:"resolve",body:{lineId:current.lines[0].id,quantity:"4",resolution:"missing",reason:"Falta definitiva reconciliada no E2E"},idempotencyKey:randomUUID(),expectedVersion:current.version});
 await logout(page);await login(page,"professional");const balance=await issueSupply(page,"BAL",patient,product.name,"5");expect(balance.status).toBe("approved");expect(balance.code).toBe("BAL-0001");
 stock=await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json();expect(Number(stock.overview[0].team.confirmed)).toBe(5);
 await page.goto("/historico?careRecipientId="+patient);await page.getByRole("button",{name:/Pesquisar e filtrar/}).click();await page.getByLabel("Ficha",{exact:true}).selectOption("ENT");await page.getByRole("button",{name:"Aplicar filtros",exact:true}).click();await expect(page.getByRole("link").filter({hasText:"ENT-0001"})).toBeVisible();
});

test("dez linhas: 5/10 REQ, 8/10 ENT e permissões negativas na interface e API",async({page})=>{
 await login(page);const {patient,products}=await prepare(page,10);
 for(const product of products)await post(page,"/api/stock/movements",{careRecipientId:patient,productId:product.id,quantity:"20",action:"inbound",reason:"Estoque de homologação",idempotencyKey:randomUUID()});
 const req=(await post(page,"/api/requisitions",{careRecipientId:patient,lines:products.map(product=>({productId:product.id,currentStock:0,urgent:false})),extraItems:[],observations:[],idempotencyKey:randomUUID()})).receipt;
 const detail=(await(await page.request.get("/api/requisitions/"+req.requisitionId)).json()).data;
 const first=await post(page,"/api/documents",{careRecipientId:patient,type:"ENT",payload:{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures().professional.id,lines:detail.requisition_items.slice(0,5).map((line:{id:string;product_id:string})=>({productId:line.product_id,quantity:"10",requisitionItemIds:[line.id]}))},idempotencyKey:randomUUID(),draft:false});
 const second=await post(page,"/api/documents",{careRecipientId:patient,type:"ENT",payload:{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures().professional.id,lines:products.map(product=>({productId:product.id,quantity:"10"}))},idempotencyKey:randomUUID(),draft:false});
 await logout(page);await login(page,"professional");await page.goto("/fichas/"+first.data.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Confirmar recebimento",exact:true}).click();await confirm(page);
 await page.goto("/historico/"+req.requisitionId+"?careRecipientId="+patient);await expect(page.getByRole("heading",{name:/5\/10 itens atendidos — atendimento parcial/})).toBeVisible();
 await page.goto("/fichas/"+second.data.id+"?careRecipientId="+patient);await page.getByRole("button",{name:"Informar divergência",exact:true}).click();const editor=page.locator("form");await editor.getByRole("checkbox").nth(8).check();await editor.getByRole("checkbox").nth(9).check();await editor.getByLabel("Efetivamente recebido").nth(0).fill("0");await editor.getByLabel("Efetivamente recebido").nth(1).fill("0");await confirm(page);await expect(page.getByText("8/10 linhas integralmente conferidas",{exact:true})).toBeVisible();
 expect((await page.request.get("/api/documents/"+first.data.id)).ok()).toBeTruthy();expect((await page.request.post("/api/documents",{data:{careRecipientId:patient,type:"COM",payload:{lines:[{productId:products[0].id,quantity:"1"}]},idempotencyKey:randomUUID(),draft:false}})).status()).toBe(403);
 await page.getByRole("button",{name:"Abrir navegação",exact:true}).click();await expect(page.getByRole("link",{name:"COM · Compra da família",exact:true})).toHaveCount(0);await page.getByRole("button",{name:"Fechar menu",exact:true}).click();
 await logout(page);await login(page,"reader");await page.goto("/fichas?careRecipientId="+patient);await expect(page.getByRole("link",{name:"Abrir ficha",exact:false})).toHaveCount(0);expect((await page.request.post("/api/stock/movements",{data:{careRecipientId:patient,productId:products[0].id,quantity:"1",action:"inbound",reason:"Operação proibida",idempotencyKey:randomUUID()}})).status()).toBe(403);
});

test("resposta perdida e recarga recuperam a mesma REQ e seu protocolo",async({page})=>{
 await login(page);const {patient,products}=await prepare(page);
 await page.goto("/fichas/req?careRecipientId="+patient);await next(page);await next(page);await page.getByRole("checkbox",{name:/^Material 01/}).check();for(let step=0;step<4;step++)await next(page);
 let savedId="";await page.route("**/api/requisitions",async(route)=>{if(route.request().method()!=="POST")return route.continue();const response=await route.fetch();savedId=(await response.json()).receipt.requisitionId;await route.abort("failed");});
 await page.getByRole("button",{name:"Concluir requisição",exact:true}).click();await expect(page.getByRole("button",{name:"Recuperar esta tentativa",exact:true})).toBeVisible();await page.unroute("**/api/requisitions");await page.reload();await page.getByRole("button",{name:"Recuperar esta tentativa",exact:true}).click();await expect(page.getByRole("heading",{name:"Comprovante oficial",exact:true})).toBeVisible();
 const listing=await(await page.request.get("/api/documents?careRecipientId="+patient+"&type=REQ")).json();expect(listing.total).toBe(1);expect(listing.data[0].id).toBe(savedId);expect(listing.data[0].code).toBe("REQ-0001");expect(products).toHaveLength(1);
});

test("histórico filtra código e período e conserva o documento de paciente renomeado e inativo",async({page})=>{
 await login(page);const {patient,products}=await prepare(page);
 const req=(await post(page,"/api/requisitions",{careRecipientId:patient,lines:[{productId:products[0].id,currentStock:2,urgent:false}],extraItems:[],observations:["Observação original"],idempotencyKey:randomUUID()})).receipt;
 await post(page,"/api/admin",{action:"recipient",id:patient,displayName:"Paciente renomeado E2E",isActive:false,isDevelopment:true});await page.goto("/historico?careRecipientId="+patient);await page.getByRole("button",{name:/Pesquisar e filtrar/}).click();await page.getByLabel("Código ou protocolo").fill("REQ-0001");await page.getByRole("button",{name:"Aplicar filtros",exact:true}).click();await expect(page.getByRole("link").filter({hasText:"REQ-0001"})).toBeVisible();await page.getByRole("link").filter({hasText:"REQ-0001"}).click();await expect(page.locator("p").filter({hasText:"Paciente: "+req.recipientName})).toBeVisible();await expect(page.getByText("Observação original",{exact:true})).toBeVisible();
 const denied=await page.request.post("/api/requisitions",{data:{careRecipientId:patient,lines:[{productId:products[0].id,currentStock:0,urgent:false}],extraItems:[],observations:[],idempotencyKey:randomUUID()}});expect(denied.status()).toBe(409);
});

test("estoque familiar: revisão, paginação, filtro e correção compensatória auditável",async({page})=>{
 await login(page);const {patient,products}=await prepare(page);const product=products[0];
 for(let index=0;index<22;index++)await post(page,"/api/stock/movements",{careRecipientId:patient,productId:product.id,quantity:"1",action:"inbound",reason:"Entrada número "+index,idempotencyKey:randomUUID()});
 await page.goto("/estoque?careRecipientId="+patient);await expect(page.getByRole("heading",{name:"Saldos e previsões",exact:true})).toBeVisible();await page.getByRole("button",{name:"Próxima",exact:true}).click();await expect(page.getByText("2 / 2",{exact:true})).toBeVisible();
 const history=await(await page.request.get("/api/stock/movements?careRecipientId="+patient+"&pageSize=1")).json();const reference=history.data[0].id;
 await page.getByLabel("Operação",{exact:true}).selectOption("correction_out");await page.getByLabel("Produto",{exact:true}).selectOption(product.id);await page.getByLabel("Quantidade",{exact:true}).fill("1");await page.getByLabel("Movimento original a compensar").fill(reference);await page.getByLabel("Motivo",{exact:true}).fill("Correção auditável E2E");await page.getByRole("button",{name:"Revisar movimentação",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Confirmar",exact:true}).click();await expect(page.getByText("Movimentação familiar confirmada.",{exact:false})).toBeVisible();
 const after=await(await page.request.get("/api/stock/balances?careRecipientId="+patient)).json();expect(Number(after.overview[0].family.confirmed)).toBe(21);
 await post(page,"/api/admin",{action:"product",careRecipientId:patient,id:product.id,name:product.name,category:"higiene",unit:"unidade",aliases:[],isActive:false,sortOrder:0});await page.reload();await expect(page.getByText(product.name+" (inativo)",{exact:true})).toBeVisible();
});

test("BAL obrigatório reconta após alteração de estoque e preserva versões antes de cancelamento",async({page})=>{
 await login(page);const {patient,products}=await prepare(page);const product=products[0];
 sql("update public.patient_settings set settings=settings||'{\"balReview\":\"required\",\"balApprovers\":[\"family\"],\"balRequirement\":\"any\"}'::jsonb where care_recipient_id="+sqlLiteral(patient));
 const bal=await issueSupply(page,"BAL",patient,product.name,"0");expect(bal.status).toBe("submitted");await page.goto("/fichas/"+bal.id+"?careRecipientId="+patient);await expect(page.getByRole("link",{name:"Recontar com nova referência de estoque",exact:true})).toBeVisible();await page.getByRole("link",{name:"Recontar com nova referência de estoque",exact:true}).click();await next(page);await next(page);await page.getByLabel("Quantidade — "+product.name,{exact:true}).fill("1");for(let step=0;step<3;step++)await next(page);await page.getByRole("button",{name:"Confirmar e concluir",exact:true}).click();await page.getByRole("link",{name:"Acompanhar ficha",exact:false}).click();
 await page.getByRole("button",{name:"Solicitar cancelamento",exact:true}).click();await page.getByLabel("Motivo / justificativa").fill("Contagem descartada após revisão operacional");await confirm(page);const detail=(await(await page.request.get("/api/documents/"+bal.id)).json()).data;expect(detail.status).toBe("cancelled");expect(detail.events.some((event:{action:string})=>event.action==="bal.recount")).toBeTruthy();expect(detail.events.length).toBeGreaterThan(2);
});

