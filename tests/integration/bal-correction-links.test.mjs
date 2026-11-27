import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { correctionFixture,applyCorrection,designatedCorrection,extraCorrectionFixture } from "./bal-correction-fixtures.mjs";
import { actor,balCommand,legacyBalance,rpc,receiveBalanceMaterials } from "./bal-review-fixtures.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { sql,sqlLiteral as q } from "../../scripts/test-environment.mjs";
const reserve=(f,version=null,key=randomUUID(),entry="reserve_pdf_issuance")=>f.family.rpc(entry,{p_document:f.document.id,p_version:version,p_key:key});
const facts=f=>sql("select jsonb_build_object('events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id="+q(f.document.id)+"),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(f.patient)+"))");
test("BAL correction links identify exact native recount, material and separate application without rewriting earlier facts",async()=>{
 const f=await correctionFixture(),entry=f.recount.balanceReview.corrections[0];
 assert.equal(entry.reviewId,f.reviewed.balanceReview.reviews[0].id);assert.equal(entry.sourceLineId,f.line.id);assert.equal(entry.sourceState,"known");assert.equal(entry.acts.length,1);
 const act=entry.acts[0],counted=f.recount.lines.find(l=>l.product_id===f.line.product_id);
 assert.equal(act.eventId,f.recount.events.find(e=>e.action==="bal.recount").id);assert.equal(act.countVersion,2);assert.equal(act.version,f.recount.version);assert.equal(act.actorId,fixtures.adminA.id);
 assert.equal(act.line.id,counted.id);assert.equal(Number(act.line.quantity),2);assert.deepEqual(act.application,{state:"not_applied",lines:[]});
 const before=facts(f),old=await reserve(f,f.reviewed.version),pending=await reserve(f,f.recount.version);assert.ifError(old.error);assert.ifError(pending.error);
 assert.deepEqual(old.data.snapshot.balanceReviewCorrections[0].acts,[]);assert.equal(pending.data.snapshot.balanceReviewCorrections[0].acts[0].application.state,"not_applied");assert.equal(facts(f),before);
 const applied=await applyCorrection(f),effect=applied.balanceReview.corrections[0].acts[0].application;
 assert.equal(effect.state,"applied");assert.equal(effect.documentVersion,applied.version);assert.equal(effect.actorId,fixtures.family.id);assert.equal(effect.lines.length,1);assert.equal(effect.lines[0].lineId,counted.id);assert.equal(Number(effect.lines[0].quantity),2);
 assert.deepEqual(applied.balanceReview.reviews[0],f.reviewed.balanceReview.reviews[0]);assert.equal(Number(applied.balanceReview.reviews[0].reviewed_snapshot.lines.find(l=>l.id===f.line.id).quantity),1);
 await receiveBalanceMaterials(f);
 const latest=await rpc(f.family,"operational_document",{p_id:f.document.id});assert.deepEqual(latest.balanceReview.corrections[0].acts[0].application,effect);
 const frozen=await reserve(f);assert.ifError(frozen.error);assert.equal(frozen.data.rendererRevision,16);assert.deepEqual(frozen.data.snapshot.balanceReviewCorrections,latest.balanceReview.corrections);
 assert.deepEqual((await reserve(f,f.recount.version)).data.snapshot.balanceReviewCorrections,pending.data.snapshot.balanceReviewCorrections);
 assert.equal(Object.hasOwn(frozen.data.snapshot,"corrections"),false);assert.equal(Object.hasOwn(latest.canonical_snapshot,"corrections"),false);
 const key=randomUUID(),v11=await reserve(f,null,key,"reserve_pdf_issuance");assert.ifError(v11.error);const replay=await reserve(f,null,key);assert.ifError(replay.error);assert.equal(replay.data.rendererRevision,16);assert.deepEqual(replay.data.snapshot,v11.data.snapshot);
});
test("correction projection excludes unrelated documents and preserves every later recount without claiming each one applied",async()=>{
 const f=await correctionFixture();const source=f.recount.balanceReview.corrections;
 await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"BAL",p_key:randomUUID(),p_draft:false,p_payload:{notes:"Outra ficha, não é correção vinculada.",lines:f.products.map(productId=>({productId,quantity:"9"}))}});
 const d=await rpc(f.family,"operational_document",{p_id:f.document.id});assert.deepEqual(d.balanceReview.corrections,source);
 const next=await rpc(f.admin,"revise_supply_document",{p_id:d.id,p_version:d.version,p_key:randomUUID(),p_recount:true,p_payload:{lines:f.products.map(productId=>({productId,quantity:"4"})),notes:"Terceira contagem da mesma ficha."}});
 assert.deepEqual(next.balanceReview.corrections[0].acts.map(a=>a.countVersion),[2,3]);assert.ok(next.balanceReview.corrections[0].acts.every(a=>a.application.state==="not_applied"));
 assert.equal(sql("select has_function_privilege('authenticated','private.bal_correction_facts(uuid,integer)','EXECUTE') or has_function_privilege('anon','public.reserve_pdf_issuance(uuid,uuid,integer)','EXECUTE')"),"f");
});
test("stock masking and revocation protect a prior correction even while the current count is not applied",async()=>{
 const f=await correctionFixture();await applyCorrection(f);
 const current=await designatedCorrection(f);
 assert.equal(current.balanceReview.application.state,"not_applied");const known=await reserve(f);assert.ifError(known.error);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'stock.team.read',false)");
 assert.equal((await f.family.rpc("pdf_issuance",{p_id:known.data.id})).error?.code,"42501");
 const masked=await reserve(f);assert.ifError(masked.error);const effect=masked.data.snapshot.balanceReviewCorrections[0].acts[0].application;
 assert.equal(effect.state,"applied");assert.deepEqual(effect.lines.map(l=>[l.state,l.quantity]),[["restricted",null]]);
 const view=await rpc(f.family,"operational_document",{p_id:f.document.id});assert.deepEqual(view.balanceReview.corrections,masked.data.snapshot.balanceReviewCorrections);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'bal.read',false)");
 assert.equal((await f.family.rpc("operational_document",{p_id:f.document.id})).error?.code,"42501");assert.equal((await reserve(f)).error?.code,"42501");
});

test("an extra difference follows the exact recount and the recorded catalogue identity after renaming", async () => {
  const f = await extraCorrectionFixture();
  const previous = f.incorporated.balanceReview.corrections.find(entry => entry.sourceLineId === f.extra.id);
  assert.equal(previous.sourceState, "known");
  assert.deepEqual(previous.acts.map(act => [act.version, Number(act.line.quantity), act.line.id === f.extra.id]), [
    [f.retained.version, 3, true], [f.incorporated.version, 4, false],
  ]);
  assert.equal(previous.acts[0].line.id, f.extra.id);
  assert.equal(previous.acts[0].application.state, "not_applied");
  const productLine = f.incorporated.lines.find(line => line.product_id === f.product.product_id);
  assert.equal(previous.acts[1].line.id, productLine.id);
  assert.equal(previous.acts[1].application.state, "not_applied");
  assert.deepEqual((await reserve(f, f.reviewed.version)).data.snapshot.balanceReviewCorrections[0].acts, []);
  assert.deepEqual((await reserve(f, f.retained.version)).data.snapshot.balanceReviewCorrections[0].acts, previous.acts.slice(0, 1));

  const reused = f.revise(f.incorporated, f.catalogueLines, [{ ...f.extra, name: "Identidade diferente" }]);
  const before = facts(f);
  assert.match((await f.admin.rpc("revise_supply_document", reused)).error?.message, /extra cannot be reused/);
  assert.equal(facts(f), before);
  const replay = await rpc(f.admin, "revise_supply_document", f.incorporate);
  assert.equal(replay.version, f.incorporated.version);
  assert.deepEqual(replay.balanceReview.corrections[0], previous);
  assert.equal(facts(f), before);

  const renamed = await rpc(f.admin, "admin_upsert_recipient_product", {
    ...f.productArgs, p_product_id: f.product.product_id, p_name: "Espátula individual",
  });
  assert.equal(renamed.product_id, f.product.product_id);
  const current = await rpc(f.admin, "revise_supply_document", f.revise(f.incorporated, f.catalogueLines, []));
  const entries = current.balanceReview.corrections[0].acts;
  assert.deepEqual(entries.slice(0, 2), previous.acts);
  assert.equal(entries[2].line.name, "Espátula individual");
  assert.equal(entries[2].line.id, current.lines.find(line => line.product_id === f.product.product_id).id);
  assert.deepEqual(current.balanceReview.reviews[0], f.reviewed.balanceReview.reviews[0]);
  const applied = await applyCorrection(f);
  assert.equal(applied.balanceReview.corrections[0].acts[0].application.state, "not_applied");
  assert.equal(applied.balanceReview.corrections[0].acts[1].application.state, "not_applied");
  assert.equal(applied.balanceReview.corrections[0].acts[2].application.lines[0].lineId, entries[2].line.id);
  assert.equal(applied.balanceReview.corrections[0].acts[2].application.state, "applied");
  assert.deepEqual((await reserve(f)).data.snapshot.balanceReviewCorrections, applied.balanceReview.corrections);
});

test("two counted catalogue matches do not establish one historical extra identity", async () => {
  const extra = { id: randomUUID(), name: "Espátula descrita no parecer", unit: "caixa", quantity: "2" };
  const f = await legacyBalance({ balanceExtras: [extra] });
  const family = await actor("family", f.patient);
  const reviewed = await balCommand(family, f.document, {
    group: "family", comment: "Conferir qual espátula corresponde ao item.",
    items: [{ lineId: extra.id, result: "difference", forwarding: "recount", comment: "Nome genérico na contagem." }],
  });
  assert.ifError(reviewed.error);
  const products = [...f.products];
  for (const name of ["Espátula pequena", "Espátula grande"]) {
    const product = await rpc(f.admin, "admin_upsert_recipient_product", {
      p_care_recipient_id: f.patient, p_product_id: null, p_name: name,
      p_category: "higiene", p_unit: "caixa", p_aliases: [], p_is_active: true,
    });
    // Seed ambiguous source rows directly because the admin command rejects overlapping aliases.
    sql(`update public.care_recipient_products set aliases=array[${q(extra.name)}] where care_recipient_id=${q(f.patient)} and product_id=${q(product.product_id)};`);
    products.push(product.product_id);
  }
  const counted = await rpc(f.admin, "revise_supply_document", {
    p_id: f.document.id, p_version: reviewed.data.version, p_key: randomUUID(), p_recount: true,
    p_payload: { lines: products.map(productId => ({ productId, quantity: "0" })), balanceExtras: [] },
  });
  assert.deepEqual(counted.balanceReview.corrections, [{
    reviewId: reviewed.data.balanceReview.reviews[0].id,
    sourceLineId: extra.id, sourceState: "known", acts: [],
  }]);
  assert.deepEqual(counted.balanceReview.reviews[0].reviewed_snapshot.extras, [extra]);
});
