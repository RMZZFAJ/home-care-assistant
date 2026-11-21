import { randomUUID, randomBytes } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export async function sourceFactsFixture({
  notes = "Conteúdo oficial fictício",
} = {}) {
  const f = await setup(),
    owner = await actor("family", f.patient);
  const content = {
    form: {
      quantities: { [f.products[0]]: "2" },
      notes: "Rascunho temporal fictício",
      origin: "purchase",
      source: "FAMILY",
      recipientId: "",
    },
    links: {},
    materials: f.products.map((id, i) => ({
      id,
      name: "Material fictício " + i,
      unit: "unidade",
      quantityDecimals: 0,
    })),
    context: {
      documentId: null,
      documentVersion: null,
      requisitionId: null,
      recipientName: "",
    },
  };
  const draft = await rpc(owner, "supply_draft_command", {
    p_patient: f.patient,
    p_kind: "COM",
    p_purpose: "create",
    p_target: null,
    p_id: null,
    p_expected: null,
    p_body: { action: "save", content },
    p_key: randomUUID(),
  });
  // Only this freshly created fictional draft's clock is controlled; no reset.
  sql(
    `update private.creation_drafts set created_at='2026-11-01T12:00:00Z' where id=${sqlLiteral(draft.id)} and owner_id=${sqlLiteral(fixtures.family.id)};`,
  );
  const committed = await rpc(owner, "commit_supply_draft", {
    p_id: draft.id,
    p_expected: draft.revision,
    p_target: null,
    p_key: randomUUID(),
    p_body: {
      action: "create",
      payload: {
        origin: "purchase",
        notes,
        lines: [{ productId: f.products[0], quantity: "2" }],
      },
    },
  });
  return { ...f, owner, draft, doc: committed.result };
}
export async function historicalSourceFixture({
  knownDate = false,
  knownName = true,
} = {}) {
  // Retained local stacks keep the eleven physical protocols. Reuse only this
  // suite's read-only fictional sources instead of deleting them or widening
  // the product's import contract.
  const previous = JSON.parse(
    sql(
      `select coalesce((select jsonb_build_object('id',r.id,'patient',r.care_recipient_id,'products',(select jsonb_agg(i.product_id order by i.id) from public.requisition_items i where i.requisition_id=r.id)) from public.requisitions r join public.care_recipients c on c.id=r.care_recipient_id where r.is_historical and c.is_development and ${knownDate ? "r.created_at='2020-03-01T12:00:00Z'::timestamptz" : "r.created_at is null"} and ${knownName ? "r.requester_name_snapshot=" + sqlLiteral("Autora literal da ficha física") : "r.requester_name_snapshot is null"} and exists(select 1 from public.requisition_observations o where o.requisition_id=r.id and o.body=${sqlLiteral("Origem física fictícia preservada.")}) and exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=r.care_recipient_id and m.user_id=${sqlLiteral(fixtures.family.id)} and m.status='active') order by r.id limit 1),'null'::jsonb);`,
    ),
  );
  if (previous) {
    const owner = await actor("family", previous.patient),
      doc = await rpc(owner, "operational_document", { p_id: previous.id });
    return { ...previous, owner, doc, report: { reusedReadOnlyFixture: true } };
  }
  const f = await setup(),
    owner = await actor("family", f.patient),
    physicalProtocol = Number(
      sql(
        "select coalesce(max(physical_protocol),0)+1 from public.historical_requisition_imports;",
      ),
    );
  const report = await rpc(f.admin, "import_historical_requisitions", {
    p_source_hash: randomBytes(32).toString("hex"),
    p_rows: [
      {
        physicalProtocol,
        careRecipientId: f.patient,
        createdAt: knownDate ? "2020-03-01T12:00:00Z" : null,
        requesterName: knownName ? "Autora literal da ficha física" : null,
        status: "submitted",
        lines: [
          { productId: f.products[0], currentStock: null, urgent: false },
        ],
        extraItems: [],
        observations: ["Origem física fictícia preservada."],
      },
    ],
  });
  if (report.imported !== 1)
    throw new Error("Fictional historical source was not imported");
  const id = sql(
      `select id from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)} and is_historical;`,
    ),
    doc = await rpc(owner, "operational_document", { p_id: id });
  return { ...f, owner, doc, report };
}
