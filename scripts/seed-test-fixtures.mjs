import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { getTestEnvironment, waitForLocalDataApi, sql, sqlLiteral, testDataRoot, fixtureFile } from "./test-environment.mjs";

import { fixturePassword, patientA, patientB, legacyRequisition } from "./test-constants.mjs";
export { fixturePassword, patientA, patientB, legacyRequisition };
export { fixtureFile };

export async function seedFixtures({ legacy = false } = {}) {
  const env = getTestEnvironment();
  mkdirSync(testDataRoot, { recursive: true });
  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt++) {
    try { ready = !(await admin.auth.admin.listUsers({ page: 1, perPage: 1 })).error; } catch { /* local reset can restart Auth and its DB connections */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Local Auth did not become healthy after reset.");
  const fixtures = existsSync(fixtureFile) ? JSON.parse(readFileSync(fixtureFile, "utf8")) : {};
  const roles = { global: "admin", global2: "admin", adminA: "admin", adminB: "admin", supervisor: "supervisor", professional: "professional", family: "family", reader: "reader", revoked: "professional", shared: "professional", unlinked: "professional" };
  for (const [name, role] of Object.entries(roles)) {
    if (!fixtures[name]) {
      const email = `hca-${name.toLowerCase()}@example.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: fixturePassword, email_confirm: true });
      if (error || !data.user) throw new Error(`Cannot create local fixture ${name}: ${error?.message}`);
      fixtures[name] = { id: data.user.id, email, role };
      writeFileSync(fixtureFile, JSON.stringify(fixtures));
    }
    const isGlobal = name.startsWith("global");
    sql(`insert into public.profiles(id,full_name,role,status,global_scope) values(${sqlLiteral(fixtures[name].id)},${sqlLiteral(`Teste ${name}`)},${sqlLiteral(isGlobal ? "admin" : "professional")},'active',${isGlobal}) on conflict(id) do nothing;`);
  }
  sql(`insert into public.care_recipients(id,display_name,is_development) values('${patientA}','Paciente fictício A',true),('${patientB}','Paciente fictício B',true) on conflict(id) do nothing;`);
  for (const [name, role] of Object.entries(roles)) {
    if (name.startsWith("global") || name === "unlinked") continue;
    const patient = name === "adminB" ? patientB : patientA;
    sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock) values('${patient}',${sqlLiteral(fixtures[name].id)},${sqlLiteral(role)},${role === "admin"},${["admin", "professional"].includes(role)}) on conflict(care_recipient_id,user_id) do nothing;`);
  }
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_count_stock) values('${patientB}',${sqlLiteral(fixtures.shared.id)},'reader',false) on conflict(care_recipient_id,user_id) do nothing; update public.profiles set status='revoked' where id=${sqlLiteral(fixtures.revoked.id)};`);
  if (legacy) {
    sql(`insert into public.requisitions(id,protocol,created_by,care_recipient_id,status,idempotency_key,created_at) values('${legacyRequisition}','HC-20260101-A1B2C3D4',${sqlLiteral(fixtures.professional.id)},'${patientA}','submitted','30000000-0000-4000-8000-000000000099','2026-01-01T12:00:00Z') on conflict(id) do nothing;
      insert into public.requisition_items(id,requisition_id,product_id,current_stock,urgent) values('30000000-0000-4000-8000-000000000002','${legacyRequisition}','fralda',2,false) on conflict(id) do nothing;
      insert into public.stock_movements(id,product_id,quantity,movement_type,performed_by,justification,care_recipient_id,destination_location) values
      ('40000000-0000-4000-8000-000000000001','fralda',10,'inbound',${sqlLiteral(fixtures.global.id)},'Fixture legado A','${patientA}','FAMILY'),
      ('40000000-0000-4000-8000-000000000002','fralda',7,'inbound',${sqlLiteral(fixtures.global.id)},'Fixture legado B','${patientB}','CARE_TEAM'),
      ('40000000-0000-4000-8000-000000000003','gaze',3,'inbound',${sqlLiteral(fixtures.global.id)},'Fixture sem origem comprovada',null,null)
      on conflict(id) do nothing;`);
  }
  writeFileSync(fixtureFile, JSON.stringify(fixtures));
  await waitForLocalDataApi();
  return fixtures;
}

if (process.argv[1]?.endsWith("seed-test-fixtures.mjs")) {
  await seedFixtures({ legacy: process.argv.includes("--legacy") });
  console.log("Fictional Auth users, two patients and scoped fixtures ready in the local development database.");
}
