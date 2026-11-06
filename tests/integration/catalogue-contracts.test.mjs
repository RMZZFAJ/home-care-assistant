import test from "node:test";
import assert from "node:assert/strict";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

async function subject() {
  const f = await setup();
  const product = await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient,
    p_product_id: null,
    p_name: "Apresentação fictícia fracionária",
    p_category: "higiene",
    p_unit: "mL",
    p_aliases: [],
    p_is_active: true,
  });
  await rpc(f.admin, "configure_catalogue_unit", {
    p_patient: f.patient,
    p_product: product.product_id,
    p_unit: "mL",
    p_decimals: 1,
  });
  return { ...f, product: product.product_id };
}
const configure = (f, overrides = {}) => ({
  p_patient: f.patient,
  p_product: f.product,
  p_unit: "mL",
  p_decimals: 1,
  p_barcode: "0123456789012",
  p_presentation: "Embalagem fictícia",
  p_base_quantity: "1.5",
  ...overrides,
});
function snapshot(f) {
  return sql(`select jsonb_build_object(
    'catalogue',(select jsonb_agg(to_jsonb(c) order by product_id) from public.care_recipient_products c where care_recipient_id=${sqlLiteral(f.patient)}),
    'presentations',(select jsonb_agg(to_jsonb(p) order by id) from public.product_presentations p where care_recipient_id=${sqlLiteral(f.patient)}),
    'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),
    'audit',(select count(*) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)})
  );`);
}

test("catalogue rejects nonfinite, nonpositive and unrepresentable presentation factors without partial changes", async () => {
  const f = await subject(),
    before = snapshot(f);
  for (const value of [
    "NaN",
    "Infinity",
    "-Infinity",
    "0",
    "-1",
    null,
    "1.5000001",
    "1000000001",
  ]) {
    const result = await f.admin.rpc(
      "configure_catalogue_unit",
      configure(f, { p_base_quantity: value }),
    );
    assert.ok(result.error, `Accepted forbidden factor ${value}`);
    assert.equal(
      snapshot(f),
      before,
      `Invalid factor ${value} left partial changes`,
    );
  }
  for (const overrides of [
    { p_decimals: null },
    { p_presentation: null },
    { p_barcode: "invalid" },
    { p_barcode: null },
  ]) {
    assert.ok(
      (await f.admin.rpc("configure_catalogue_unit", configure(f, overrides)))
        .error,
    );
    assert.equal(snapshot(f), before);
  }
});

test("catalogue preserves fractional factors and textual barcodes and refuses another product's barcode atomically", async () => {
  const f = await subject();
  const result = await rpc(f.admin, "configure_catalogue_unit", configure(f));
  assert.ok(result.presentationId);
  const presentation = JSON.parse(
    sql(
      `select jsonb_build_object('factor',base_quantity::text,'barcode',barcode,'product',product_id) from public.product_presentations where id=${sqlLiteral(result.presentationId)};`,
    ),
  );
  assert.deepEqual(presentation, {
    factor: "1.500000",
    barcode: "0123456789012",
    product: f.product,
  });
  const before = snapshot(f);
  assert.ok(
    (
      await f.admin.rpc(
        "configure_catalogue_unit",
        configure(f, {
          p_product: f.products[0],
          p_unit: "unidade",
          p_decimals: 0,
          p_base_quantity: "2",
        }),
      )
    ).error,
  );
  assert.equal(snapshot(f), before);
  const updated = await rpc(f.admin, "catalogue_presentation_command", {
    p_patient: f.patient,
    p_id: result.presentationId,
    p_version: 1,
    p_key: crypto.randomUUID(),
    p_body: {
      productId: f.product,
      name: "Embalagem fictícia",
      barcode: "0123456789012",
      baseQuantity: "2.5",
      active: true,
    },
  });
  assert.equal(updated.result.id, result.presentationId);
  assert.equal(
    sql(
      `select base_quantity::text from public.product_presentations where id=${sqlLiteral(result.presentationId)};`,
    ),
    "2.500000",
  );
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where product_id=${sqlLiteral(f.product)};`,
    ),
    "0",
  );
});

test("catalogue delegated capability never grants access management or a different patient", async () => {
  const f = await subject(),
    other = await setup();
  const delegated = await actor("professional", f.patient);
  assert.ok(
    (await delegated.rpc("configure_catalogue_unit", configure(f))).error,
  );
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
  );
  const capabilities = await rpc(delegated, "patient_capabilities", {
    p_patient: f.patient,
  });
  assert.equal(capabilities["catalog.manage"], true);
  assert.equal(capabilities["access.manage"], false);
  await rpc(delegated, "configure_catalogue_unit", configure(f));
  assert.ok(
    (
      await delegated.rpc(
        "configure_catalogue_unit",
        configure(f, { p_patient: other.patient }),
      )
    ).error,
  );
  sql(
    `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
  );
  assert.ok(
    (
      await delegated.rpc(
        "configure_catalogue_unit",
        configure(f, { p_base_quantity: "2.5" }),
      )
    ).error,
  );
});

for (const wait of ["stock", "catalogue", "presentation"]) {
  test(
    `catalogue revalidates delegated authority after an observed ${wait} wait`,
    { timeout: 45_000 },
    async () => {
      const f = await subject();
      const existing = await rpc(
        f.admin,
        "configure_catalogue_unit",
        configure(f),
      );
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
      );
      const delegated = await actor("professional", f.patient);
      const before = snapshot(f);
      const send = () =>
        wait === "presentation"
          ? delegated.rpc("catalogue_presentation_command", {
              p_patient: f.patient,
              p_id: existing.presentationId,
              p_version: 1,
              p_key: crypto.randomUUID(),
              p_body: {
                productId: f.product,
                name: "Embalagem fictícia",
                barcode: "0123456789012",
                baseQuantity: "2.5",
                active: true,
              },
            })
          : delegated.rpc(
              "configure_catalogue_unit",
              configure(f, { p_base_quantity: "2.5" }),
            );
      const revoke = () =>
        sql(
          `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
        );
      const result =
        wait === "presentation"
          ? await whileRowWaits(
              "product_presentations",
              existing.presentationId,
              "catalogue_presentation_command",
              send,
              revoke,
            )
          : await whileAdvisoryWaits(`${wait}:${f.patient}`, send, revoke);
      assert.equal(result.error?.code, "42501");
      assert.equal(snapshot(f), before);
    },
  );
}

for (const wait of ["stock", "catalogue-row"]) {
  test(
    `catalogue identity edits revalidate after an observed ${wait} wait`,
    { timeout: 45_000 },
    async () => {
      const f = await subject();
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
      );
      const delegated = await actor("professional", f.patient),
        before = snapshot(f);
      const send = () =>
        delegated.rpc("admin_upsert_recipient_product", {
          p_care_recipient_id: f.patient,
          p_product_id: f.product,
          p_name: "Nome que não deve persistir",
          p_category: "higiene",
          p_unit: "mL",
          p_aliases: [],
          p_is_active: true,
        });
      const revoke = () =>
        sql(
          `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
        );
      const result =
        wait === "stock"
          ? await whileAdvisoryWaits(`stock:${f.patient}`, send, revoke)
          : await whileRowWaits(
              "catalogue",
              { patient: f.patient, product: f.product },
              "admin_upsert_recipient_product",
              send,
              revoke,
            );
      assert.equal(result.error?.code, "42501");
      assert.equal(snapshot(f), before);
    },
  );
}

test("catalogue factors retain narrow grants and table writes cannot bypass the RPC", async () => {
  const f = await subject();
  for (const name of ["professional", "reader"]) {
    const client = await actor(name, f.patient);
    assert.ok(
      (
        await client.from("product_presentations").insert({
          care_recipient_id: f.patient,
          product_id: f.product,
          barcode: "0123456789012",
          name: "Tentativa direta",
          base_quantity: "NaN",
        })
      ).error,
    );
  }
  const privileges = JSON.parse(
    sql(
      `select jsonb_build_object('anonymous',has_function_privilege('anon','public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)','execute'),'service',has_function_privilege('service_role','public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)','execute'),'authenticated',has_function_privilege('authenticated','public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)','execute'),'write',has_table_privilege('authenticated','public.product_presentations','insert,update,delete'));`,
    ),
  );
  assert.deepEqual(privileges, {
    anonymous: false,
    service: false,
    authenticated: true,
    write: false,
  });
});
