import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { purchaseBalanceFixture,purchaseBalanceArrival,purchaseBalanceCommand,otherPurchaseEntry,purchaseBalanceFacts } from "./purchase-entry-balance-fixtures.mjs";
import { rpc,fixtures } from "./v4-fixtures.mjs";
import { sql,sqlLiteral as q } from "../../scripts/test-environment.mjs";
const rows=id=>JSON.parse(sql("select coalesce(jsonb_agg(to_jsonb(b) order by validated_at,receipt_id),'[]') from private.purchase_entry_balances b where document_id="+q(id)));
test("COM keeps the last actual entry of each material, including intervening stock movements and different receipt dates",async()=>{
 const f=await purchaseBalanceFixture(),a=f.document.lines.find(l=>l.product_id===f.products[0]),b=f.document.lines.find(l=>l.product_id===f.products[1]);
 assert.ok(f.document.purchaseEntryBalances.every(l=>l.state==="not_validated"&&l.quantity===null));
 const arrival=await purchaseBalanceArrival(f,f.document,[{lineId:a.id,quantity:"2"},{lineId:b.id,quantity:"4"}]);assert.equal(rows(f.document.id).length,0);
 const first=await purchaseBalanceCommand(f.admin,arrival.document,"validate_receipt",{receiptId:arrival.receipt.id}),frozen=first.purchaseEntryBalances;
 assert.equal(rows(f.document.id).length,1);assert.equal(Number(frozen.find(l=>l.lineId===a.id).quantity),32);assert.equal(Number(frozen.find(l=>l.lineId===b.id).quantity),34);
 await otherPurchaseEntry(f,"5");const read=await rpc(f.family,"operational_document",{p_id:f.document.id});assert.deepEqual(read.purchaseEntryBalances,frozen);
 const later=await purchaseBalanceArrival(f,read,[{lineId:a.id,quantity:"1"}]);
 const second=await purchaseBalanceCommand(f.admin,later.document,"validate_receipt",{receiptId:later.receipt.id}),entries=second.purchaseEntryBalances;
 assert.equal(Number(entries.find(l=>l.lineId===a.id).quantity),38);assert.equal(Number(entries.find(l=>l.lineId===a.id).entry.enteredQuantity),1);
 assert.equal(entries.find(l=>l.lineId===a.id).entry.receiptId,later.receipt.id);assert.equal(entries.find(l=>l.lineId===b.id).entry.receiptId,arrival.receipt.id);assert.deepEqual(entries.find(l=>l.lineId===b.id),frozen.find(l=>l.lineId===b.id));
 await otherPurchaseEntry(f,"1");let current=await rpc(f.family,"operational_document",{p_id:f.document.id});assert.deepEqual(current.purchaseEntryBalances,entries);
 const rejected=await purchaseBalanceArrival(f,current,[{lineId:b.id,quantity:"1"}]);current=await purchaseBalanceCommand(f.admin,rejected.document,"reject_receipt",{receiptId:rejected.receipt.id,reason:"Parcela rejeitada não altera o saldo registrado."});assert.deepEqual(current.purchaseEntryBalances,entries);
 const pending=await purchaseBalanceArrival(f,current,[{lineId:b.id,quantity:"1"}]);assert.deepEqual(pending.document.purchaseEntryBalances,entries);
 assert.equal(rows(f.document.id).length,2);assert.equal(JSON.stringify(pending.document.canonical_snapshot).includes("quantityAfter"),false);
 const before=purchaseBalanceFacts(f),retry=await f.admin.rpc("supply_document_command",{p_id:current.id,p_action:"validate_receipt",p_body:{receiptId:later.receipt.id},p_key:randomUUID(),p_version:pending.document.version});
 if(!retry.error)assert.deepEqual(retry.data.purchaseEntryBalances,entries);
 assert.equal(rows(f.document.id).length,2);assert.deepEqual(JSON.parse(purchaseBalanceFacts(f)).stock,JSON.parse(before).stock);
});
test("COM immediate validation captures once, masks family stock and revalidates read authority",async()=>{
 const f=await purchaseBalanceFixture(),line=f.document.lines[0],key=randomUUID();
 const p={p_id:f.document.id,p_action:"receive",p_body:{lines:[{lineId:line.id,quantity:"1"}]},p_key:key,p_version:f.document.version};
 const [a,b]=await Promise.all([f.admin.rpc("supply_document_command",p),f.admin.rpc("supply_document_command",p)]);assert.ifError(a.error);assert.ifError(b.error);assert.equal(rows(f.document.id).length,1);
 assert.deepEqual(a.data.purchaseEntryBalances,b.data.purchaseEntryBalances);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'stock.family.read',false)");
 const view=await rpc(f.family,"operational_document",{p_id:f.document.id}),entry=view.purchaseEntryBalances.find(l=>l.lineId===line.id);
 assert.equal(entry.state,"restricted");assert.equal(entry.quantity,null);assert.equal(entry.entry.receiptId,a.data.receipts.find(r=>r.submission_key===key).id);
 assert.equal(sql("select has_table_privilege('authenticated','private.purchase_entry_balances','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role','private.purchase_entry_balances','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_function_privilege('authenticated','private.purchase_entry_balance_facts(uuid,integer)','EXECUTE')"),"f");
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'com.read',false)");
 assert.equal((await f.family.rpc("operational_document",{p_id:f.document.id})).error?.code,"42501");
});
test("late validation authority loss rolls back the captured fact together with receipt, stock and event",async()=>{
 const f=await purchaseBalanceFixture(),arrival=await purchaseBalanceArrival(f,f.document,[{lineId:f.document.lines[0].id,quantity:"1"}]),before=purchaseBalanceFacts(f);
 sql("create function private.test_com_capture_authority() returns trigger language plpgsql security definer set search_path='' as $$begin if new.receipt_id="+q(arrival.receipt.id)+"::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.adminA.id)+",'com.validate',false);end if;return new;end;$$;create trigger test_com_capture_authority after insert on private.purchase_entry_balances for each row execute function private.test_com_capture_authority();");
 try{const denied=await f.admin.rpc("supply_document_command",{p_id:f.document.id,p_action:"validate_receipt",p_body:{receiptId:arrival.receipt.id},p_key:randomUUID(),p_version:arrival.document.version});assert.equal(denied.error?.code,"42501");assert.equal(purchaseBalanceFacts(f),before);}
 finally{sql("drop trigger test_com_capture_authority on private.purchase_entry_balances;drop function private.test_com_capture_authority();");}
});
