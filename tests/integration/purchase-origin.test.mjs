import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { setup, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const payload = (f) => ({
  lines: [{ productId: f.products[0], quantity: "2" }],
});
const create = (f, body, draft = false, key = randomUUID()) =>
  f.admin.rpc("create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: body,
    p_key: key,
    p_draft: draft,
  });
const stock = (f) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
test("COM official issuance requires explicit purchase or donation origin", async () => {
  const f = await setup(),
    before = stock(f),
    result = await create(f, payload(f));
  assert.equal(result.error?.code, "22023");
  assert.match(result.error.message, /purchase origin required/);
  assert.equal(stock(f), before);
  for (const origin of [null, "", true, "other"]) {
    const invalid = await create(f, { ...payload(f), origin });
    assert.equal(invalid.error?.code, "22023");
    assert.equal(stock(f), before);
  }
  assert.equal(
    sql(
      `select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
    "0",
  );
});
test("COM explicit purchase and donation preserve origin, exact quantities and one issuance without crediting stock", async () => {
  const f = await setup(),
    before = stock(f);
  for (const origin of ["purchase", "donation"]) {
    const body = { ...payload(f), origin },
      key = randomUUID(),
      created = await create(f, body, false, key);
    assert.ifError(created.error);
    assert.equal(created.data.payload.origin, origin);
    assert.equal(Number(created.data.lines[0].quantity), 2);
    assert.ok(created.data.protocol);
    assert.equal(stock(f), before);
    const again = await create(f, body, false, key);
    assert.ifError(again.error);
    assert.equal(again.data.id, created.data.id);
    assert.equal(
      sql(
        `select body->'payload'->>'origin' from public.document_events where document_id=${sqlLiteral(created.data.id)} order by version desc limit 1;`,
      ),
      origin,
    );
    assert.equal(
      sql(
        `select count(*) from public.document_events where document_id=${sqlLiteral(created.data.id)};`,
      ),
      "1",
    );
  }
});
test("COM planning preserves the issuance when actual purchase and donation are recorded", async () => {
  const f = await setup();
  const [boughtProduct, donatedProduct] = f.products;
  const plan = {
    acquisitionMode: "planned",
    lines: [boughtProduct, donatedProduct].map(productId => ({ productId, quantity: "2" })),
  };
  const before = stock(f);
  assert.equal((await create(f, { ...plan, origin: "purchase" })).error?.code, "22023");
  const { data: document, error } = await create(f, plan);
  assert.ifError(error);
  assert.equal(document.payload.acquisitionMode, "planned");
  assert.equal(document.payload.origin, undefined);
  assert.equal(stock(f), before);
  const bought = document.lines.find(line => line.product_id === boughtProduct);
  const donated = document.lines.find(line => line.product_id === donatedProduct);
  const issued = sql(`select body::text from public.document_events where document_id=${sqlLiteral(document.id)} and version=1`);
  await rpc(f.admin, "supply_document_command", {
    p_id: document.id,
    p_action: "purchase",
    p_body: { lines: [{ lineId: bought.id, quantity: "2", inHand: true }] },
    p_key: randomUUID(),
    p_version: document.version,
  });
  const { result: donation } = await rpc(f.admin, "unlinked_arrival_command", {
    p_patient: f.patient,
    p_key: randomUUID(),
    p_body: { origin: "donation", lines: [{
      productId: donatedProduct,
      quantity: "2",
      association: { documentId: document.id, lineId: donated.id },
    }] },
  });
  assert.equal(donation.state, "approved");
  const current = await rpc(f.admin, "operational_document", { p_id: document.id });
  assert.equal(current.payload.acquisitionMode, "planned");
  assert.equal(current.payload.origin, undefined);
  assert.equal(current.purchaseProgress.lines.every(line => line.remainingExpectation === 0), true);
  assert.equal(sql(`select body::text from public.document_events where document_id=${sqlLiteral(document.id)} and version=1`), issued);
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='unlinked_arrival' and reference_id=${sqlLiteral(donation.id)}`), "1");
});
test("COM draft may retain an unknown origin but submit cannot invent a purchase or emit until explicitly revised", async () => {
  const f = await setup(),
    before = stock(f),
    draft = await create(f, payload(f), true);
  assert.ifError(draft.error);
  assert.equal(draft.data.payload.origin, undefined);
  assert.equal(draft.data.protocol, null);
  const command = {
    p_id: draft.data.id,
    p_action: "submit",
    p_body: {},
    p_key: randomUUID(),
    p_version: draft.data.version,
  };
  assert.equal(
    (await f.admin.rpc("supply_document_command", command)).error?.code,
    "22023",
  );
  const unchanged = await rpc(f.admin, "operational_document", {
    p_id: draft.data.id,
  });
  assert.equal(unchanged.version, draft.data.version);
  assert.equal(unchanged.status, "draft");
  assert.equal(unchanged.payload.origin, undefined);
  assert.equal(stock(f), before);
  const revised = await rpc(f.admin, "revise_supply_document", {
    p_id: draft.data.id,
    p_payload: { ...payload(f), origin: "donation" },
    p_key: randomUUID(),
    p_version: draft.data.version,
    p_recount: false,
  });
  const emitted = await rpc(f.admin, "supply_document_command", {
    ...command,
    p_version: revised.version,
  });
  assert.equal(emitted.payload.origin, "donation");
  assert.ok(emitted.protocol);
  assert.equal(stock(f), before);
  assert.equal(
    sql(
      `select coalesce(body->'payload'->>'origin','unknown') from public.document_events where document_id=${sqlLiteral(draft.data.id)} and version=1;`,
    ),
    "unknown",
  );
  assert.equal(
    sql(
      "select has_function_privilege('authenticated','private.require_purchase_origin(jsonb)','execute');",
    ),
    "f",
  );
});
