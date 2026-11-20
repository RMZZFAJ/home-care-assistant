import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { loginDecision } from "./l1-decision-policy";
import { openDocumentMore, selectDocumentSection } from "./document-sections";
test.setTimeout(90_000);
let fixture: { patient: string; document: { id: string }; email: string };
test.beforeAll(async () => {
 const f=await setup(), admin=await shiftWorker(f.patient,"admin");
 const document=await rpc(admin.client,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_key:randomUUID(),p_draft:false,p_payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"2"}]}});
 fixture={patient:f.patient,document,email:admin.email};
});
for (const method of ["pointer", "keyboard"] as const) test(`Mais: ${method} abre cancelamento e preserva a aba em consulta`, async ({ page }, info) => {
 const f = fixture, errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
 await loginDecision(page, f.email, f.patient); await page.goto("/fichas/" + f.document.id);
 await selectDocumentSection(page, "progress");
 await openDocumentMore(page); const menu=page.getByRole("menu", {name:"Ações da ficha",exact:true});
 await expect.poll(()=>menu.getByRole("menuitem").evaluateAll(items=>items.every(item=>getComputedStyle(item).borderTopWidth==="0px" && getComputedStyle(item).textAlign==="left"))).toBe(true);
 await menu.screenshot({path:info.outputPath("mais-menu.png")}); const action = page.getByRole("menuitem", { name:"Cancelar ficha", exact:true });
 try { if(method === "pointer") await action.click(); else { await action.focus(); await action.press("Enter"); }
  const review = page.getByRole("dialog", { name: "Revisar e cancelar", exact: true });
  await expect(review.getByRole("textbox", { name: "Motivo do cancelamento", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mais opções da ficha", exact: true })).toBeFocused();
  await expect(page.getByRole("tab",{name:"Andamentos",exact:true})).toHaveAttribute("aria-selected","true");
 } finally { await info.attach("activation",{contentType:"application/json",body:JSON.stringify({errors,url:page.url()})}); }
});
