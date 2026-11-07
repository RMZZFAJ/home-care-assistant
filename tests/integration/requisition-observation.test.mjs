import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { setup, actor, rpc, request } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("REQ stores observed zero, explicit unknown and unfilled separately under real Auth and idempotency", async () => {
  const f = await setup(), pro = await actor("professional", f.patient);
  const at = "2026-11-04T15:12:30-03:00";
  for (const [mode, value] of [["observed", "0"], ["observed", "7"], ["unknown", null], ["unfilled", null]]) {
    const args = { ...request(f.patient, [f.products[0]]), p_lines: [{ productId: f.products[0], currentStock: value, stockObservation: mode, stockObservationAt: at, urgent: false, repeatReason: "Outra necessidade fictícia controlada" }], p_extra_items: [{ customName: "Extra fictício " + randomUUID(), currentStock: value, stockObservation: mode, stockObservationAt: at, urgent: false }] };
    const first = (await rpc(pro, "submit_requisition", args))[0];
    assert.equal((await rpc(pro, "submit_requisition", args))[0].requisition_id, first.requisition_id);
    const rows = JSON.parse(sql(`select jsonb_agg(jsonb_build_object('quantity',current_stock::text,'mode',stock_observation) order by id) from public.requisition_items where requisition_id=${sqlLiteral(first.requisition_id)};`));
    assert.equal(rows.length, 2);
    for (const row of rows) assert.deepEqual(row, { quantity: mode === "observed" ? Number(value).toFixed(6) : null, mode });
    const times = JSON.parse(sql(`select jsonb_agg(jsonb_build_object('at',stock_observation_at,'source',stock_observation_time_source)) from public.requisition_items where requisition_id=${sqlLiteral(first.requisition_id)};`));
    for (const row of times) { assert.equal(new Date(row.at).toISOString(), new Date(at).toISOString()); assert.equal(row.source, "client_draft"); }
    const sameInstant = { ...args, p_lines: args.p_lines.map(line => ({ ...line, stockObservationAt: "2026-11-04T18:12:30.000000Z" })) };
    assert.equal((await rpc(pro, "submit_requisition", sameInstant))[0].requisition_id, first.requisition_id, "Canonical time compares instants, not the device timezone representation");
    const changedTime = await pro.rpc("submit_requisition", { ...args, p_lines: args.p_lines.map(line => ({ ...line, stockObservationAt: "2026-11-04T18:13:30Z" })) });
    assert.equal(changedTime.error?.code, "23505");
    const changed = mode === "unknown" ? "unfilled" : "unknown";
    const conflict = await pro.rpc("submit_requisition", { ...args, p_lines: [{ ...args.p_lines[0], currentStock: null, stockObservation: changed }] });
    assert.equal(conflict.error?.code, "23505", "A different observation cannot recover the previous request key");
  }
  const fluid = await rpc(f.admin, "admin_upsert_recipient_product", { p_care_recipient_id: f.patient, p_product_id: null, p_name: "Observação fracionada fictícia", p_category: "higiene", p_unit: "mL", p_aliases: [], p_is_active: true });
  await rpc(f.admin, "configure_catalogue_unit", { p_patient: f.patient, p_product: fluid.product_id, p_unit: "mL", p_decimals: 6, p_barcode: null, p_presentation: null, p_base_quantity: null });
  const fraction = (await rpc(pro, "submit_requisition", { ...request(f.patient, [fluid.product_id]), p_lines: [{ productId: fluid.product_id, currentStock: "1.234567", stockObservation: "observed", stockObservationAt: at, urgent: false }] }))[0];
  assert.equal(sql(`select current_stock::text||':'||stock_observation from public.requisition_items where requisition_id=${sqlLiteral(fraction.requisition_id)};`), "1.234567:observed");
});

test("an original pre-observation intent recovers through HTTP without rewriting its hash or zero provenance", async () => {
  const f = await setup(), pro = await actor("professional", f.patient), args = request(f.patient, [f.products[0]]);
  const session = (await pro.auth.getSession()).data.session;
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString());
  const historicalSource = readFileSync("supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql", "utf8");
  const match = historicalSource.match(/create or replace function public\.submit_requisition\(p_care_recipient_id[\s\S]*?end;\$\$;/i);
  assert.ok(match, "The immutable baseline function must be available for the controlled legacy fixture");
  const source = match[0].replace("public.submit_requisition", "pg_temp.hca_legacy_requisition_fixture");
  const signature = "pg_temp.hca_legacy_requisition_fixture(uuid,uuid,text,jsonb,jsonb,jsonb)";
  // Controlled SQL fixture creation uses the original function and an actually
  // issued Auth session/context. No public endpoint/grant or historical row is
  // changed; the subsequent recovery is a real authenticated HTTP request.
  sql(`begin; ${source}
    revoke all on function ${signature} from public,anon,authenticated,service_role;
    select set_config('request.jwt.claims',${sqlLiteral(JSON.stringify({ sub: claims.sub, session_id: claims.session_id, role: "authenticated", aal: claims.aal }))},true);
    select * from pg_temp.hca_legacy_requisition_fixture(${sqlLiteral(f.patient)},${sqlLiteral(args.p_idempotency_key)},'ignored',${sqlLiteral(JSON.stringify(args.p_lines))}::jsonb,'[]'::jsonb,'[]'::jsonb);
    drop function ${signature}; commit;`);
  const before = JSON.parse(sql(`select jsonb_build_object('id',id,'intent',request_intent,'hash',payload_hash) from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)} and idempotency_key=${sqlLiteral(args.p_idempotency_key)};`));
  assert.equal(Object.hasOwn(before.intent.lines[0], "stockObservation"), false);
  const recovered = (await rpc(pro, "submit_requisition", args))[0];
  assert.equal(recovered.requisition_id, before.id);
  const after = JSON.parse(sql(`select jsonb_build_object('id',id,'intent',request_intent,'hash',payload_hash) from public.requisitions where id=${sqlLiteral(before.id)};`));
  assert.deepEqual(after, before);
  assert.equal(sql(`select stock_observation from public.requisition_items where requisition_id=${sqlLiteral(before.id)};`), "legacy_unclassified");
  const reinterpretation = await pro.rpc("submit_requisition", { ...args, p_lines: args.p_lines.map(line => ({ ...line, stockObservation: "observed" })) });
  assert.equal(reinterpretation.error?.code, "23505");
});

test("REQ rejects contradictory observations without a partial document and labels old client values honestly", async () => {
  const f = await setup(), pro = await actor("professional", f.patient);
  for (const line of [
    { stockObservation: "observed", currentStock: null },
    { stockObservation: "unknown", currentStock: "0" },
    { stockObservation: "unfilled", currentStock: "7" },
    { stockObservation: "legacy_unclassified", currentStock: "0" },
    { stockObservation: null, currentStock: "0" },
    { stockObservation: "observed", currentStock: "1.0000004" },
    ...["tomorrow", "infinity", "2026-11-04T15:12:30", "2026-11-04T18:12:30.1234567Z", 42].map(stockObservationAt => ({ stockObservation: "observed", currentStock: "7", stockObservationAt })),
  ]) {
    const args = { ...request(f.patient, [f.products[0]]), p_lines: [{ productId: f.products[0], urgent: false, ...line }] };
    const response = await pro.rpc("submit_requisition", args);
    assert.ok(response.error, JSON.stringify(line));
    assert.equal(Number(sql(`select count(*) from public.operational_documents where idempotency_key=${sqlLiteral(args.p_idempotency_key)};`)), 0);
  }
  const older = (await rpc(pro, "submit_requisition", request(f.patient, [f.products[0]])))[0];
  const stored = JSON.parse(sql(`select jsonb_build_object('quantity',current_stock::text,'mode',stock_observation) from public.requisition_items where requisition_id=${sqlLiteral(older.requisition_id)};`));
  assert.deepEqual(stored, { quantity: "0.000000", mode: "legacy_unclassified" });
  assert.equal(sql(`select stock_observation_time_source||':'||(stock_observation_at is not distinct from r.created_at)::text from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where r.id=${sqlLiteral(older.requisition_id)};`), "server_submission:true");
});

test("a mode-only pre-time intent recovers without inventing an observation time", async () => {
  const f = await setup(), pro = await actor("professional", f.patient), args = request(f.patient, [f.products[0]]);
  args.p_lines = args.p_lines.map(line => ({ ...line, currentStock: null, stockObservation: "unknown" }));
  args.p_extra_items = ["unknown", "unfilled"].map(stockObservation => ({ customName: "Extra histórico fictício", currentStock: null, stockObservation, urgent: false }));
  const session = (await pro.auth.getSession()).data.session;
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString());
  const historical = readFileSync("supabase/migrations/20261105145537_phase_d1_requisition_observation_modes.sql", "utf8");
  const source = historical.slice(historical.indexOf("CREATE OR REPLACE FUNCTION public.submit_requisition")).replace("public.submit_requisition", "pg_temp.hca_mode_only_fixture");
  const signature = "pg_temp.hca_mode_only_fixture(uuid,uuid,text,jsonb,jsonb,jsonb)";
  sql(`begin; ${source} revoke all on function ${signature} from public,anon,authenticated,service_role;
    select set_config('request.jwt.claims',${sqlLiteral(JSON.stringify({ sub: claims.sub, session_id: claims.session_id, role: "authenticated", aal: claims.aal }))},true);
    select * from pg_temp.hca_mode_only_fixture(${sqlLiteral(f.patient)},${sqlLiteral(args.p_idempotency_key)},'ignored',${sqlLiteral(JSON.stringify(args.p_lines))}::jsonb,${sqlLiteral(JSON.stringify(args.p_extra_items))}::jsonb,'[]'::jsonb);
    drop function ${signature};commit;`);
  const before = sql(`select request_intent::text||':'||payload_hash from public.requisitions where idempotency_key=${sqlLiteral(args.p_idempotency_key)} and created_by=${sqlLiteral(claims.sub)};`);
  const oldIntent = JSON.parse(sql(`select request_intent from public.requisitions where idempotency_key=${sqlLiteral(args.p_idempotency_key)} and created_by=${sqlLiteral(claims.sub)};`));
  const modernIntent = { ...oldIntent, lines: oldIntent.lines.map(line => ({ ...line, stockObservationAt: null })), extraItems: oldIntent.extraItems.map(line => ({ ...line, stockObservationAt: null })).sort((a, b) => a.stockObservation.localeCompare(b.stockObservation)) };
  assert.equal(sql(`select (private.requisition_intent_without_time(${sqlLiteral(JSON.stringify(modernIntent))}::jsonb) is distinct from ${sqlLiteral(JSON.stringify(oldIntent))}::jsonb)::text;`), "true", "Removing time alone cannot recover the older order of tied extras");
  assert.equal(sql(`select (private.requisition_mode_only_intent(${sqlLiteral(JSON.stringify(modernIntent))}::jsonb,${sqlLiteral(JSON.stringify(args.p_extra_items))}::jsonb) is not distinct from ${sqlLiteral(JSON.stringify(oldIntent))}::jsonb)::text;`), "true");
  const row = (await rpc(pro, "submit_requisition", args))[0];
  assert.equal(sql(`select request_intent::text||':'||payload_hash from public.requisitions where id=${sqlLiteral(row.requisition_id)};`), before);
  assert.equal(sql(`select count(*)||':'||bool_and(stock_observation_at is null and stock_observation_time_source='legacy_unknown')::text from public.requisition_items where requisition_id=${sqlLiteral(row.requisition_id)};`), "3:true");
  const reinterpretation = await pro.rpc("submit_requisition", { ...args, p_lines: args.p_lines.map(line => ({ ...line, stockObservationAt: "2026-11-04T18:12:30Z" })) });
  assert.equal(reinterpretation.error?.code, "23505");
});
