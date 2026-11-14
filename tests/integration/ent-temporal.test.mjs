import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { entTemporalFixture,entTemporalOracle,entTemporalLedger } from "./ent-temporal-fixtures.mjs";
import { rpc,fixtures } from "./v4-fixtures.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
const sameTime=(actual,expected)=>assert.equal(new Date(actual).toISOString(),new Date(expected).toISOString());
const reserve=(f,key=randomUUID())=>rpc(f.owner,"reserve_pdf_issuance",{p_document:f.doc.id,p_version:f.doc.version,p_key:key});

test("retained ENT preparation separates its stored creation day from first issued event, rejects pre-dispatch issuance and preserves its original event",async()=>{
  const f=await entTemporalFixture({dispatch:false}),before=entTemporalLedger(f.patient);
  assert.equal(f.doc.protocol,null);
  assert.equal((await f.owner.rpc("reserve_pdf_issuance",{p_document:f.doc.id,p_version:f.doc.version,p_key:randomUUID()})).error?.code,"22023");
  assert.equal(sql(`select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)};`),"0");
  assert.equal(entTemporalLedger(f.patient),before);
  f.doc=await rpc(f.owner,"supply_document_command",{p_id:f.doc.id,p_version:f.doc.version,p_action:"submit",p_body:{},p_key:randomUUID()});
  const oracle=entTemporalOracle(f.doc.id),ledger=entTemporalLedger(f.patient),a=await reserve(f),b=await reserve(f);
  assert.equal(a.rendererRevision,16);assert.notEqual(a.id,b.id);
  for(const row of [a,b]){
    const facts=row.snapshot.sourceFacts;
    sameTime(facts.documentCreatedAt,oracle.createdAt);sameTime(facts.issuedAt,oracle.issuedAt);
    sameTime(facts.registeredAt,oracle.registeredAt);assert.equal(facts.draftCreatedAt,null);
    assert.equal(facts.issuerId,fixtures.adminA.id);
    assert.ok(facts.historyActors.some(actor=>actor.version===f.doc.version&&actor.id===fixtures.family.id));
    assert.equal(row.sourceHash,sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${row.version};`));
  }
  assert.notEqual(new Date(oracle.createdAt).toISOString().slice(0,10),new Date(oracle.issuedAt).toISOString().slice(0,10));
  assert.equal(a.snapshot.sourceFacts.issuedAt,b.snapshot.sourceFacts.issuedAt);
  assert.equal(entTemporalLedger(f.patient),ledger);
  assert.equal(sql(`select body->>'protocol' is null from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=1;`),"t");
});

test("private ENT clock survives consumption, while an authenticated client cannot rewrite preparation dates or canonical event clocks",async()=>{
  const f=await entTemporalFixture({mode:"private"}),before=entTemporalLedger(f.patient),oracle=entTemporalOracle(f.doc.id);
  const forbidden=await f.owner.from("operational_documents").update({created_at:"2000-01-01T12:00:00Z"}).eq("id",f.doc.id);
  assert.equal(forbidden.error?.code,"42501");
  const event=await f.owner.from("document_events").update({created_at:"2000-01-01T12:00:00Z"}).eq("document_id",f.doc.id);
  assert.equal(event.error?.code,"42501");
  const key=randomUUID(),a=await reserve(f,key),b=await reserve(f,key),facts=a.snapshot.sourceFacts;
  assert.equal(a.id,b.id);assert.deepEqual(a.snapshot,b.snapshot);
  sameTime(facts.draftCreatedAt,f.times.privateAt);sameTime(facts.draftCreatedAt,oracle.draftCreatedAt);
  sameTime(facts.documentCreatedAt,oracle.createdAt);sameTime(facts.issuedAt,oracle.issuedAt);
  assert.ok(new Date(facts.draftCreatedAt)<new Date(facts.issuedAt));
  assert.equal(sql(`select state from private.creation_drafts where id=${sqlLiteral(f.draft.id)};`),"consumed");
  assert.equal(entTemporalLedger(f.patient),before);
});
