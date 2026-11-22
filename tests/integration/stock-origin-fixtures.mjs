import { randomUUID } from "node:crypto";
import { setup, actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const command = (client, document, action, body) =>
  rpc(client, "supply_document_command", {
    p_id: document.id,
    p_action: action,
    p_body: body,
    p_key: randomUUID(),
    p_version: document.version,
  });
export async function stockOriginFixture() {
  const f = await setup(),
    family = await actor("family", f.patient),
    professional = await actor("professional", f.patient);
  let purchase = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_key: randomUUID(),
    p_payload: {
      origin: "purchase",
      notes: "Informação da compra restrita ao contexto autorizado",
      lines: [{ productId: f.products[0], quantity: "5" }],
    },
  });
  purchase = await command(family, purchase, "purchase", {
    lines: [{ lineId: purchase.lines[0].id, quantity: "5" }],
  });
  const receiptIds = [];
  for (const amount of ["2", "3"]) {
    const key = randomUUID();
    purchase = await rpc(family, "supply_document_command", {
      p_id: purchase.id,
      p_action: "receive",
      p_body: { lines: [{ lineId: purchase.lines[0].id, quantity: amount }] },
      p_key: key,
      p_version: purchase.version,
    });
    const receipt = purchase.receipts.find((row) => row.submission_key === key);
    if (!receipt)
      throw Error("Stock origin fixture requires a causal receipt identity");
    receiptIds.push(receipt.id);
    purchase = await command(f.admin, purchase, "validate_receipt", {
      receiptId: receipt.id,
    });
  }
  let delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: (await professional.auth.getUser()).data.user.id,
      recipientReason:
        "Entrega fictícia para leitura tipada das origens do estoque",
      lines: [{ productId: f.products[0], quantity: "4" }],
    },
  });
  delivery = await command(professional, delivery, "receive", {
    divergences: [],
  });
  const reportId = await rpc(professional, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text:
      "Consumo confirmado cuja origem deve abrir o relato, sem virar documentId",
    p_lines: [{ productId: f.products[0], quantity: "1" }],
    p_key: randomUUID(),
  });
  await rpc(f.admin, "decide_consumption_report", {
    p_id: reportId,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  const balance = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "BAL",
    p_key: randomUUID(),
    p_payload: {
      lines: f.products.map((productId, index) => ({
        productId,
        quantity: index ? "0" : "2",
      })),
      notes: "Contagem fictícia que produz ajuste BAL rastreável",
    },
  });
  const original = JSON.parse(
    sql(
      `select to_jsonb(m) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[1])} and reference_type='family_manual';`,
    ),
  );
  const compensationId = await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.products[1],
    p_quantity: "1",
    p_action: "correction_out",
    p_reason: "Correção compensatória com referência exata à entrada original",
    p_reference: original.id,
    p_key: randomUUID(),
  });
  const movements = JSON.parse(
    sql(
      `select jsonb_agg(to_jsonb(m) order by created_at desc,id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  );
  return {
    ...f,
    family,
    professional,
    purchase,
    receiptIds,
    delivery,
    reportId,
    balance,
    compensationId,
    originalMovementId: original.id,
    movements,
  };
}
export const stockOriginState = (f) =>
  sql(
    `select jsonb_build_object('movements',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
