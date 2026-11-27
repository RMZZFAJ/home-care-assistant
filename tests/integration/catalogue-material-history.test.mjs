import assert from "node:assert/strict";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { catalogueHistoryFixture } from "./catalogue-history-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const history = "catalogue_material_history";

test("L4 material history combines official events without changing inventory or including attempts", async () => {
  const f = await catalogueHistoryFixture();
  const scope = { p_patient: f.patient, p_product: f.productId, p_page: 1 };
  try {
    const first = await rpc(f.admin, history, scope);
    assert.equal(first.material.name, f.currentName);
    assert.equal(first.material.active, true);
    assert.equal(first.hasMore, false);
    assert.equal(first.data.length, 6);
    assert.equal(first.data[0].action, "reactivate");
    const registration = first.data.find(event => event.kind === "registration" && event.before);
    assert.equal(registration.before.name, f.originalName);
    assert.equal(registration.after.name, f.currentName);
    assert.deepEqual(registration.after.aliases, ["Nome de busca"]);
    assert.ok(registration.actorName);
    const presentation = first.data.find(event => event.kind === "presentation" && event.version === 2);
    assert.equal(Number(presentation.before.quantity), 10);
    assert.equal(Number(presentation.after.quantity), 8);
    assert.equal(presentation.after.code, "0123456789012");
    const payload = JSON.stringify(first);
    assert.ok(!payload.includes(f.edited.request.p_key));
    assert.doesNotMatch(payload, /ownerId|referenceHash|custody|stock|preparation|outcome/i);

    const command = await rpc(f.admin, "reviewed_catalogue_command", {
      ...f.edited.request, p_fields: null, p_reference_hash: null,
    });
    assert.deepEqual(command, f.edited.result);
    assert.deepEqual(await rpc(f.admin, history, scope), first);
    assert.equal(sql("select count(*) from public.stock_movements where care_recipient_id=" + q(f.patient) + " and product_id=" + q(f.productId)), "0");
    assert.equal(sql("select count(*) from private.catalogue_preparations where patient_id=" + q(f.patient)), "0");
  } finally {
    sql("update public.care_recipients set is_active=false where id=" + q(f.patient));
  }
});

test("L4 material history enforces patient and capability scope, pages immutable facts and keeps private grants narrow", async () => {
  const f = await catalogueHistoryFixture();
  const other = await setup();
  const scope = { p_patient: f.patient, p_product: f.productId };
  try {
    assert.equal((await f.admin.rpc(history, scope)).error?.code, "42501");
    assert.equal((await f.admin.rpc(history, { ...scope, p_patient: other.patient })).error?.code, "PT404");
    await actor("adminA", f.patient);
    sql("update public.care_recipient_products set name=name where care_recipient_id=" + q(f.patient) + " and product_id=" + q(f.productId));
    assert.equal((await rpc(f.admin, history, scope)).data.length, 6);
    sql("do $$ begin for i in 1..17 loop update public.care_recipient_products set sort_order=i where care_recipient_id=" +
      q(f.patient) + " and product_id=" + q(f.productId) + "; end loop; end $$;");
    const first = await rpc(f.admin, history, scope);
    const second = await rpc(f.admin, history, { ...scope, p_page: 2 });
    assert.equal(first.hasMore, true);
    assert.equal(first.data.length, 20);
    assert.equal(second.hasMore, false);
    assert.equal(second.data.length, 3);
    assert.equal(new Set([...first.data, ...second.data].map(event => event.reference)).size, 23);
    assert.equal((await f.admin.rpc(history, { ...scope, p_patient: other.patient })).error?.code, "42501");
    assert.equal((await f.admin.rpc(history, { ...scope, p_page: 0 })).error?.code, "22023");

    const professional = await actor("professional", f.patient);
    assert.equal((await professional.rpc(history, scope)).error?.code, "42501");
    sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" +
      q(f.patient) + "," + q(fixtures.professional.id) + ",'catalog.manage',true)");
    assert.deepEqual(await rpc(professional, history, scope), first);
    sql("update public.capability_overrides set enabled=false where care_recipient_id=" +
      q(f.patient) + " and subject_user=" + q(fixtures.professional.id) + " and capability='catalog.manage'");
    assert.equal((await professional.rpc(history, scope)).error?.code, "42501");
    assert.equal(sql(`select
      has_table_privilege('authenticated','private.catalogue_registration_events','insert,update,delete')
      or has_function_privilege('authenticated','private.capture_catalogue_registration()','execute')
      or has_function_privilege('anon','public.catalogue_material_history(uuid,text,integer)','execute')
      or has_function_privilege('service_role','public.catalogue_material_history(uuid,text,integer)','execute');`), "f");
  } finally {
    sql("update public.care_recipients set is_active=false where id in (" + q(f.patient) + "," + q(other.patient) + ")");
  }
});
