import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { env, setup, issue, actor } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("independent service workers remind an eligible REQ only once", async () => {
  const { patient, products } = await setup();
  const req = await issue(patient, products);
  sql(`update public.requisition_lifecycle set next_reminder_at='1900-01-01' where requisition_id=${sqlLiteral(req.id)};`);
  const workers = [0, 1].map(() => createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }));
  const results = await Promise.all(workers.map((worker) => worker.rpc("run_operational_schedule")));
  for (const result of results) {
    assert.ifError(result.error);
    assert.ok(result.data.lifecycleCandidates <= 100);
    assert.ok(result.data.lifecyclePatients <= 25);
  }
  const professional = await actor("professional", patient);
  const state = await professional.from("requisition_lifecycle").select("reminders,next_reminder_at").eq("requisition_id", req.id).single();
  assert.ifError(state.error);
  assert.equal(state.data.reminders, 1);
  assert.equal(Number(sql(`select count(*) from public.document_events where document_id=${sqlLiteral(req.id)} and action='req.reminder';`)), 1);
  const denied = await professional.rpc("run_operational_schedule");
  assert.ok(denied.error, "operational users cannot invoke the service scheduler");
});
