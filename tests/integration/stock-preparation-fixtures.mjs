import { randomUUID } from "node:crypto";
import { setup, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export async function stockPreparationFixture(action = "inbound") {
  const f = await setup(),
    productId = f.products[0];
  const referenceId = action.startsWith("correction")
    ? await rpc(f.admin, "family_stock_movement", {
        p_patient: f.patient,
        p_product: productId,
        p_action: action === "correction_in" ? "outbound" : "inbound",
        p_quantity: "2",
        p_reason: "Origem fictícia da compensação privada",
        p_key: randomUUID(),
      })
    : null;
  const reference = await rpc(f.admin, "stock_movement_preparation_reference", {
    p_patient: f.patient,
    p_product: productId,
    p_reference: referenceId,
  });
  return {
    ...f,
    productId,
    referenceId,
    reference,
    scope: {
      p_patient: f.patient,
      p_purpose: "family_movement",
      p_target: f.patient,
    },
    content: {
      movement: {
        action,
        productId,
        productLabel: reference.product.name,
        unit: reference.product.unit,
        quantity: "1",
        observedBalance: reference.balance,
        reason: "Minha preparação fictícia de movimento",
        referenceId: referenceId ?? "",
        referenceLabel: referenceId ? "Movimento fictício preservado" : "",
      },
      referenceHash: reference.referenceHash,
    },
  };
}
export function saveStockPreparation(
  f,
  content = f.content,
  current = null,
  key = randomUUID(),
  client = f.admin,
) {
  return rpc(client, "stock_movement_preparation_command", {
    ...f.scope,
    p_id: current?.id ?? null,
    p_expected: current?.revision ?? null,
    p_key: key,
    p_body: {
      action: "save",
      content,
      navigation: { version: 1, stage: "stock_family_movement" },
    },
  });
}
export function stockPreparationPacket(f, saved, key = randomUUID()) {
  const m = f.content.movement;
  return {
    p_patient: f.patient,
    p_id: saved.id,
    p_expected: saved.revision,
    p_key: key,
    p_body: {
      referenceHash: f.content.referenceHash,
      command: {
        careRecipientId: f.patient,
        productId: m.productId,
        quantity: m.quantity.replace(",", ".").replace(/\.0+$/, ""),
        action: m.action,
        reason: m.reason.trim(),
        idempotencyKey: key,
        ...(m.referenceId ? { referenceId: m.referenceId } : {}),
      },
    },
  };
}
export function stockPreparationFacts(f) {
  return JSON.parse(
    sql(
      `select jsonb_build_object('ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) from public.stock_movements m where m.care_recipient_id=${q(f.patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}))::text;`,
    ),
  );
}
