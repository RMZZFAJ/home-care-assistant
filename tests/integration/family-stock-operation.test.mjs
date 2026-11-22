import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

async function stockFixture(t) {
  const f = await setup();
  t.after(() => sql("update public.care_recipients set is_active=false where id=" + q(f.patient)));
  const admin = await actor("adminA", f.patient);
  const reference = (client = admin) => rpc(client, "family_stock_operation_reference", { p_patient: f.patient, p_products: f.products });
  const command = async (action, amounts, client = admin) => ({
    p_patient: f.patient,
    p_action: action,
    p_lines: f.products.map((productId, index) => ({ productId, quantity: String(amounts[index]) })),
    p_reason: "Conferência física dos materiais da família.",
    p_reference: (await reference(client)).referenceHash,
    p_key: randomUUID(),
  });
  const stock = async () => {
    const amounts = new Map((await reference()).materials.map(row => [row.productId, Number(row.quantity)]));
    return f.products.map(productId => amounts.get(productId));
  };
  return { ...f, admin, reference, command, stock };
}

test("one family operation groups its ledger rows, replays in another order and protects recovery by actor", async t => {
  const f = await stockFixture(t);
  const owner = f.admin;
  const starting = await f.stock();
  const input = await f.command("inbound", [4, 5]);
  const receipt = await rpc(owner, "commit_family_stock_operation", input);
  assert.equal(receipt.movementIds.length, 2);
  assert.equal(receipt.key, input.p_key);
  assert.deepEqual(await rpc(owner, "commit_family_stock_operation", {
    ...input, p_lines: [...input.p_lines].reverse(),
  }), receipt);
  const result = { p_patient: f.patient, p_key: input.p_key };
  assert.deepEqual(await rpc(owner, "family_stock_operation_result", result), receipt);
  assert.equal((await owner.rpc("commit_family_stock_operation", { ...input, p_reason: "Uma intenção diferente." })).error?.code, "23505");
  assert.equal(sql("select count(*) from private.family_stock_operation_movements where operation_id=" + q(receipt.id)), "2");
  assert.deepEqual(await f.stock(), [starting[0] + 4, starting[1] + 5]);
  const professional = await actor("professional", f.patient);
  assert.equal((await professional.rpc("family_stock_operation_result", result)).error?.code, "42501");
  assert.equal((await professional.rpc("family_stock_operation_reference", {
    p_patient: f.patient, p_products: f.products,
  })).error?.code, "42501");
});

test("one insufficient line rolls back the entire operation; independent concurrent reviews require reconfirmation", async t => {
  const f = await stockFixture(t);
  const starting = await f.stock();
  const movementCount = () => Number(sql("select count(*) from public.stock_movements where care_recipient_id=" + q(f.patient)));
  const originalMovements = movementCount();
  const initial = await rpc(f.admin, "commit_family_stock_operation", await f.command("inbound", [5, 5]));
  const replenished = starting.map(amount => amount + 5);
  assert.deepEqual(await f.stock(), replenished);
  const exceeded = await f.command("outbound", [1, replenished[1] + 1]);
  const rejected = await f.admin.rpc("commit_family_stock_operation", exceeded);
  assert.ok(rejected.error);
  assert.deepEqual(await f.stock(), replenished);
  assert.equal(movementCount(), originalMovements + 2);
  assert.equal(await rpc(f.admin, "family_stock_operation_result", { p_patient: f.patient, p_key: exceeded.p_key }), null);

  const second = await actor("adminA", f.patient);
  const [left, right] = await Promise.all([f.command("outbound", [2, 2]), f.command("outbound", [2, 2], second)]);
  assert.equal(left.p_reference, right.p_reference);
  const writes = await Promise.all([
    f.admin.rpc("commit_family_stock_operation", left),
    second.rpc("commit_family_stock_operation", right),
  ]);
  assert.equal(writes.filter(write => !write.error).length, 1);
  assert.equal(writes.find(write => write.error)?.error?.code, "PT409");
  assert.deepEqual(await f.stock(), starting.map(amount => amount + 3));
  assert.equal(sql("select count(*) from private.family_stock_operations where care_recipient_id=" + q(f.patient)), "2");
  assert.equal(sql("select count(*) from private.family_stock_operation_movements where operation_id=" + q(initial.id)), "2");
});

test("stock history paginates acts, keeps distinct entries for the same material, and excludes family stock from team reads", async t => {
  const f = await stockFixture(t);
  const first = await rpc(f.admin, "commit_family_stock_operation", await f.command("inbound", [4, 5]));
  const second = await rpc(f.admin, "commit_family_stock_operation", await f.command("inbound", [3, 7]));
  const query = {
    p_patient: f.patient, p_product: null, p_from: null, p_to: null,
    p_location: "FAMILY", p_page: 1, p_size: 1, p_search: null, p_origin: "manual",
  };
  const latest = await rpc(f.admin, "stock_operation_history", query);
  const previous = await rpc(f.admin, "stock_operation_history", { ...query, p_page: 2 });
  assert.equal(latest.data[0].id, "family:" + second.id);
  assert.equal(previous.data[0].id, "family:" + first.id);
  assert.deepEqual(new Set(latest.data[0].rows.map(row => row.id)), new Set(second.movementIds));
  assert.deepEqual(new Set(previous.data[0].rows.map(row => row.id)), new Set(first.movementIds));
  assert.ok(latest.data[0].rows.every(row => row.custody === "FAMILY" && row.direction === "inbound" && row.before !== null && row.after !== null));
  const search = await rpc(f.admin, "stock_operation_history", { ...query, p_search: second.movementIds[0] });
  assert.equal(search.total, 1);
  assert.equal(search.data[0].rows.length, 2);
  const material = await rpc(f.admin, "stock_operation_history", { ...query, p_product: f.products[0] });
  assert.deepEqual(material.data[0].rows.map(row => row.product_id), [f.products[0]]);
  const professional = await actor("professional", f.patient);
  assert.deepEqual(await rpc(professional, "stock_operation_history", query), { total: 0, data: [] });
  const team = await rpc(professional, "stock_operation_history", { ...query, p_location: null, p_origin: null, p_size: 20 });
  assert.ok(team.data.every(group => group.rows.every(row => row.custody !== "FAMILY")));
});

test("dispatch and receipt of the same ENT retain two proven acts with independent custody views", async t => {
  const f = await stockFixture(t);
  const professional = await actor("professional", f.patient);
  const { data: { user } } = await professional.auth.getUser();
  const overview = async (client = f.admin) =>
    (await rpc(client, "stock_overview", { p_patient: f.patient })).find(row => row.productId === f.products[0]);
  const before = await overview();
  const issued = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: user.id,
      recipientReason: "Conferência de dois materiais pela equipe.",
      lines: f.products.map(productId => ({ productId, quantity: "2" })),
    },
  });
  const dispatched = await overview();
  assert.notEqual(dispatched.family.updatedAt, before.family.updatedAt);
  assert.equal(dispatched.team.updatedAt, before.team.updatedAt);
  assert.equal(Number(dispatched.team.confirmed), Number(before.team.confirmed));
  assert.equal(Number(dispatched.team.incoming), 2);
  await rpc(professional, "supply_document_command", {
    p_id: issued.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: issued.version,
  });
  const received = await overview();
  assert.equal(received.family.updatedAt, dispatched.family.updatedAt);
  assert.notEqual(received.team.updatedAt, dispatched.team.updatedAt);
  assert.equal(Number(received.team.confirmed), Number(before.team.confirmed) + 2);
  assert.equal(Number(received.team.incoming), 0);
  assert.equal((await overview(professional)).family, null);
  const query = {
    p_patient: f.patient, p_product: null, p_from: null, p_to: null,
    p_location: null, p_page: 1, p_size: 20, p_search: null, p_origin: "ENT",
  };
  const history = await rpc(f.admin, "stock_operation_history", query);
  assert.equal(history.total, 2);
  assert.equal(new Set(history.data.map(act => act.id)).size, 2);
  assert.ok(history.data.every(act => act.id.startsWith("document:") && act.rows.length === 2 &&
    act.rows.every(row => row.reference_document_id === issued.id)));
  assert.ok(history.data[0].rows.every(row => row.custody === "CARE_TEAM" && row.direction === "inbound"));
  assert.ok(history.data[1].rows.every(row => row.custody === "FAMILY" && row.direction === "outbound"));
  const limited = await rpc(professional, "stock_operation_history", query);
  assert.equal(limited.total, 2);
  assert.ok(limited.data.flatMap(act => act.rows).every(row => row.custody !== "FAMILY"));
  assert.ok(limited.data[1].rows.every(row => row.custody === "TRANSIT" && row.before === null && row.after === null));
});

test("approved purchase, physical arrival and available stock use independent quantities", async t => {
  const f = await stockFixture(t);
  const family = await actor("family", f.patient);
  const overview = async () =>
    (await rpc(f.admin, "stock_overview", { p_patient: f.patient })).find(row => row.productId === f.products[0]).family;
  const before = await overview();
  let order = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: {
      origin: "purchase", notes: "Reposição programada da reserva da família.",
      lines: [{ productId: f.products[0], quantity: "5" }],
    },
  });
  const command = async (client, action, body) => rpc(client, "supply_document_command", {
    p_id: order.id, p_action: action, p_body: body, p_key: randomUUID(), p_version: order.version,
  });
  assert.equal(Number((await overview()).purchaseExpected), 5);
  order = await command(family, "purchase", { lines: [{ lineId: order.lines[0].id, quantity: "5" }] });
  assert.equal(Number((await overview()).purchaseAwaiting), 5);
  order = await command(family, "receive", { lines: [{ lineId: order.lines[0].id, quantity: "2" }] });
  const pending = await overview();
  assert.equal(Number(pending.purchaseAwaiting), 3);
  assert.equal(Number(pending.purchasePendingValidation), 2);
  assert.equal(pending.confirmed, before.confirmed);
  assert.equal(pending.updatedAt, before.updatedAt);
  await command(f.admin, "validate_receipt", { receiptId: order.receipts.at(-1).id });
  const approved = await overview();
  assert.equal(Number(approved.purchaseAwaiting), 3);
  assert.equal(Number(approved.purchasePendingValidation), 0);
  assert.equal(Number(approved.confirmed), Number(before.confirmed) + 2);
});
