import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, rpc, actor, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";

async function subject() {
  const f = await setup();
  const p = await rpc(f.admin, "configure_catalogue_unit", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_unit: "unidade",
    p_decimals: 0,
    p_barcode: "0123456789012",
    p_presentation: "Pacote fictício com dez unidades",
    p_base_quantity: "10",
  });
  return { ...f, presentation: p.presentationId };
}
const line = (f, overrides = {}) => ({
  productId: f.products[0],
  quantity: "20",
  manualQuantity: "0",
  presentations: [{ id: f.presentation, version: 1, packages: "2" }],
  ...overrides,
});
const intent = (f, overrides = {}) => ({
  p_patient: f.patient,
  p_type: "ENT",
  p_payload: {
    source: "FAMILY",
    destination: "CARE_TEAM",
    recipientId: fixtures.professional.id,
    recipientReason: "Recebedor explícito da prova de equivalência",
    lines: [line(f)],
  },
  p_key: randomUUID(),
  ...overrides,
});

test("presentation provenance is captured by the database rather than lost behind the base quantity", async () => {
  const f = await subject(),
    args = intent(f);
  const doc = await rpc(f.admin, "create_supply_document", args);
  const conversion = doc.lines[0].metadata.presentationConversions;
  assert.ok(
    conversion,
    "The official line lost the package factor and textual barcode",
  );
  assert.deepEqual(conversion, [
    {
      id: f.presentation,
      version: 1,
      barcode: "0123456789012",
      name: "Pacote fictício com dez unidades",
      packages: "2",
      baseQuantity: "10",
      unit: "unidade",
      convertedQuantity: "20",
    },
  ]);
  assert.deepEqual(doc.lines[0].presentation_conversions, conversion);
  assert.equal(doc.lines[0].quantity, 20);
  assert.equal(
    sql(
      `select sum(quantity)::text from public.stock_movements where reference_type='document' and reference_id=${sqlLiteral(doc.id)} and destination_location='TRANSIT';`,
    ),
    "20.000000",
  );
});

const edit = (f, version, factor = "12", key = randomUUID()) => ({
  p_patient: f.patient,
  p_id: f.presentation,
  p_version: version,
  p_key: key,
  p_body: {
    productId: f.products[0],
    barcode: "0123456789012",
    name: "Pacote fictício revisto",
    baseQuantity: factor,
    active: true,
  },
});

test("issued conversions keep 2x10=20 after factor12 and same-key recovery never reinterprets the movement", async () => {
  const f = await subject(),
    args = intent(f),
    doc = await rpc(f.admin, "create_supply_document", args);
  const changed = await rpc(
    f.admin,
    "catalogue_presentation_command",
    edit(f, 1),
  );
  assert.equal(changed.result.version, 2);
  assert.equal(changed.current.base_quantity, 12);
  const recovered = await rpc(f.admin, "create_supply_document", args);
  assert.equal(recovered.id, doc.id);
  assert.equal(
    recovered.lines[0].metadata.presentationConversions[0].baseQuantity,
    "10",
  );
  assert.equal(recovered.lines[0].quantity, 20);
  const pro = await actor("professional", f.patient);
  await rpc(pro, "supply_document_command", {
    p_id: doc.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: doc.version,
  });
  const balances = JSON.parse(
    sql(
      `select jsonb_object_agg(location,balance::text) from (select location,sum(delta) balance from public.stock_movements m cross join lateral (values(m.destination_location,m.quantity),(m.source_location,-m.quantity)) v(location,delta) where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])} and location is not null group by location) q;`,
    ),
  );
  assert.equal(balances.FAMILY, "10.000000");
  assert.equal(balances.CARE_TEAM, "20.000000");
  assert.equal(
    sql(
      `select count(*) from public.stock_movements where reference_type='document' and reference_id=${sqlLiteral(doc.id)};`,
    ),
    "2",
  );
  const versions = await f.admin
    .from("product_presentation_versions")
    .select("version,definition")
    .eq("presentation_id", f.presentation)
    .order("version");
  assert.ifError(versions.error);
  assert.equal(versions.data.length, 2);
  assert.equal(versions.data[0].definition.base_quantity, 10);
  assert.equal(versions.data[1].definition.base_quantity, 12);
});

test("presentation selections reject forged totals, factors, versions and foreign identities without documents or movements", async () => {
  const f = await subject(),
    other = await subject();
  await actor("adminA", f.patient);
  const validControl = await rpc(
    f.admin,
    "create_supply_document",
    intent(f, { p_draft: true }),
  );
  assert.equal(
    validControl.lines[0].presentation_conversions[0].convertedQuantity,
    "20",
  );
  const before = sql(
    `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  const bad = [
    { quantity: "24" },
    { manualQuantity: "1" },
    { metadata: { presentationConversions: "forged" } },
    ...["0", "1.5", "NaN", null].map((packages) => ({
      presentations: [{ id: f.presentation, version: 1, packages }],
    })),
    { presentations: [{ id: f.presentation, version: null, packages: "2" }] },
    { presentations: [{ id: other.presentation, version: 1, packages: "2" }] },
    { productId: f.products[1] },
    {
      presentations: [
        { id: f.presentation, version: 1, packages: "2", baseQuantity: "12" },
      ],
    },
  ];
  for (const change of bad) {
    const args = intent(f);
    args.p_payload.lines = [line(f, change)];
    const rejected = await f.admin.rpc("create_supply_document", args);
    assert.ok(rejected.error, JSON.stringify(change));
    assert.match(
      rejected.error.message,
      /conversion|presentation|package|manual/i,
      JSON.stringify(change),
    );
    assert.equal(
      sql(
        `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
      ),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)};`,
      ),
      before,
    );
  }
});

test("draft conversion is preserved for submission and editing a stale source requires an explicit new selection", async () => {
  const f = await subject();
  const args = intent(f, { p_draft: true }),
    draft = await rpc(f.admin, "create_supply_document", args);
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  const stale = await f.admin.rpc("revise_supply_document", {
    p_id: draft.id,
    p_payload: args.p_payload,
    p_key: randomUUID(),
    p_version: draft.version,
  });
  assert.equal(stale.error?.code, "PT409", JSON.stringify(stale.error));
  assert.equal(
    sql(
      `select quantity::text from public.document_lines where document_id=${sqlLiteral(draft.id)};`,
    ),
    "20.000000",
  );
  const issued = await rpc(f.admin, "supply_document_command", {
    p_id: draft.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: draft.version,
  });
  assert.equal(
    issued.lines[0].metadata.presentationConversions[0].baseQuantity,
    "10",
  );
  assert.equal(issued.lines[0].quantity, 20);
});

test("presentation edit keeps immutable own intent recovery after write loss and returns a later peer version separately", async () => {
  const f = await subject(),
    command = edit(f, 1);
  await rpc(f.admin, "catalogue_presentation_command", command);
  const peer = await actor("global", f.patient);
  await rpc(peer, "catalogue_presentation_command", edit(f, 2, "15"));
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'catalog.manage',false);`,
  );
  const recovered = await rpc(
    f.admin,
    "catalogue_presentation_command",
    command,
  );
  assert.equal(recovered.replayed, true);
  assert.equal(recovered.result.version, 2);
  assert.equal(recovered.result.base_quantity, 12);
  assert.equal(recovered.current.version, 3);
  assert.equal(recovered.current.base_quantity, 15);
  assert.equal(
    (await f.admin.rpc("catalogue_presentation_command", edit(f, 3, "16")))
      .error?.code,
    "42501",
  );
  assert.equal(
    (
      await f.admin.rpc("catalogue_presentation_command", {
        ...command,
        p_body: { ...command.p_body, baseQuantity: "13" },
      })
    ).error?.code,
    "23505",
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`,
  );
  assert.equal(
    (await f.admin.rpc("catalogue_presentation_command", command)).error?.code,
    "42501",
  );
});

test("presentation version conflicts and legacy blind edits cannot overwrite a concurrent definition", async () => {
  const f = await subject();
  const results = await Promise.all([
    f.admin.rpc("catalogue_presentation_command", edit(f, 1, "12")),
    f.admin.rpc("catalogue_presentation_command", edit(f, 1, "14")),
  ]);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(
    results.find((r) => r.error).error.code,
    "PT409",
    JSON.stringify(results.find((r) => r.error).error),
  );
  assert.equal(
    (
      await f.admin.rpc("configure_catalogue_unit", {
        p_patient: f.patient,
        p_product: f.products[0],
        p_unit: "unidade",
        p_decimals: 0,
        p_barcode: "0123456789012",
        p_presentation: "Tentativa legada sem versão",
        p_base_quantity: "16",
      })
    ).error?.code,
    "PT409",
  );
  assert.equal(
    sql(
      `select count(*) from public.product_presentation_versions where presentation_id=${sqlLiteral(f.presentation)};`,
    ),
    "2",
  );
});

test(
  "presentation command revalidates authority after its late row wait and rolls back history and command",
  { timeout: 45_000 },
  async () => {
    const f = await subject();
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'catalog.manage',true);`,
    );
    const delegated = await actor("professional", f.patient);
    const result = await whileRowWaits(
      "product_presentations",
      f.presentation,
      "catalogue_presentation_command",
      () => delegated.rpc("catalogue_presentation_command", edit(f, 1)),
      () =>
        sql(
          `update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='catalog.manage';`,
        ),
    );
    assert.equal(result.error?.code, "42501");
    assert.equal(
      sql(
        `select count(*) from public.product_presentation_versions where presentation_id=${sqlLiteral(f.presentation)};`,
      ),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from public.product_presentation_commands where presentation_id=${sqlLiteral(f.presentation)};`,
      ),
      "0",
    );
  },
);

test("presentation history is patient scoped and clients cannot mutate definitions, versions or another actor's commands", async () => {
  const f = await subject(),
    other = await subject();
  await actor("adminA", f.patient);
  await rpc(f.admin, "catalogue_presentation_command", edit(f, 1));
  const reader = await actor("reader", f.patient);
  const own = await reader
    .from("product_presentation_versions")
    .select("version")
    .eq("presentation_id", f.presentation);
  assert.ifError(own.error);
  assert.equal(own.data.length, 2);
  const foreign = await reader
    .from("product_presentation_versions")
    .select("*")
    .eq("presentation_id", other.presentation);
  assert.ifError(foreign.error);
  assert.deepEqual(foreign.data, []);
  const commands = await reader
    .from("product_presentation_commands")
    .select("*")
    .eq("presentation_id", f.presentation);
  assert.ifError(commands.error);
  assert.deepEqual(commands.data, []);
  for (const table of [
    "product_presentations",
    "product_presentation_versions",
    "product_presentation_commands",
  ])
    assert.ok(
      (
        await reader
          .from(table)
          .delete()
          .eq(
            table === "product_presentations" ? "id" : "presentation_id",
            f.presentation,
          )
      ).error,
    );
  assert.equal(
    (await reader.rpc("catalogue_presentation_command", edit(f, 2))).error
      ?.code,
    "42501",
  );
});
