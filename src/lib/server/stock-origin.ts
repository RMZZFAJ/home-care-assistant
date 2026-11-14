import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError, rpc } from "./api";
import type { StockOrigin, OriginMovement } from "@/types/stock-origin";
import type { SupplyDocument } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";

const movementColumns =
  "id,product_id,quantity::text,source_location,destination_location,justification,created_at,reference_type,reference_id,performed_by";
async function visibleMovement(
  client: SupabaseClient,
  patientId: string,
  movementId: string,
) {
  const { data, error } = await client
    .from("stock_movements")
    .select(movementColumns)
    .eq("care_recipient_id", patientId)
    .eq("id", movementId)
    .maybeSingle();
  if (error) databaseError(error);
  return data
    ? ({ ...data, quantity: String(data.quantity) } as OriginMovement)
    : null;
}
/** Resolve the ledger's typed identity using only the caller's RLS-protected client. */
export async function stockMovementOrigin(
  client: SupabaseClient,
  patientId: string,
  movementId: string,
): Promise<StockOrigin> {
  const movement = await visibleMovement(client, patientId, movementId);
  if (!movement)
    throw new ApiError(
      "NOT_FOUND",
      "Movimento indisponível neste contexto.",
      404,
    );
  const [profile, product] = await Promise.all([
    movement.performed_by
      ? client
          .from("profiles")
          .select("full_name")
          .eq("id", movement.performed_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("care_recipient_products")
      .select("name,unit")
      .eq("care_recipient_id", patientId)
      .eq("product_id", movement.product_id)
      .maybeSingle(),
  ]);
  if (profile.error) databaseError(profile.error);
  if (product.error) databaseError(product.error);
  const base = {
    movement,
    material: {
      name: product.data?.name ?? null,
      unit: product.data?.unit ?? null,
    },
    actor: {
      name: profile.data?.full_name ?? null,
      source: profile.data
        ? ("current_profile" as const)
        : ("unavailable" as const),
    },
  };
  const unavailable = (
    message = "A origem não está disponível ou exige uma permissão de leitura própria. O acesso ao movimento não concede acesso à ficha de origem.",
  ): StockOrigin => ({ ...base, kind: "unavailable", message });
  if (movement.reference_type === "family_manual") {
    const original = movement.reference_id
      ? await visibleMovement(client, patientId, movement.reference_id)
      : null;
    if (
      movement.reference_id &&
      (!original ||
        original.product_id !== movement.product_id ||
        original.reference_type !== "family_manual")
    )
      return unavailable(
        "A referência histórica da compensação não está disponível neste contexto.",
      );
    return { ...base, kind: "manual", compensates: original };
  }
  if (!movement.reference_id)
    return unavailable(
      "Este movimento histórico não tem uma origem documental identificada. Nenhuma ficha foi presumida.",
    );
  if (movement.reference_type === "consumption") {
    const { data, error } = await client
      .from("consumption_reports")
      .select("id")
      .eq("id", movement.reference_id)
      .eq("care_recipient_id", patientId)
      .eq("location", movement.source_location)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data) return unavailable();
    const report = (await rpc(client, "consumption_report", {
      p_id: data.id,
    })) as ConsumptionReport;
    if (!report.movements.some((row) => row.id === movement.id))
      return unavailable(
        "O relato encontrado não identifica este movimento. A referência histórica precisa de conferência.",
      );
    return { ...base, kind: "consumption", report };
  }
  if (movement.reference_type === "inventory") {
    const { data, error } = await client
      .from("stock_inventories")
      .select(
        "id,location,status,created_at,counted_at,approved_at,review_reason,stock_inventory_items(id,product_id,expected_quantity::text,counted_quantity::text,is_counted,justification)",
      )
      .eq("id", movement.reference_id)
      .eq("care_recipient_id", patientId)
      .maybeSingle();
    if (error) databaseError(error);
    if (
      !data ||
      ![movement.source_location, movement.destination_location].includes(
        data.location,
      ) ||
      (movement.source_location && movement.destination_location) ||
      !data.stock_inventory_items.some(
        (item) => item.product_id === movement.product_id,
      )
    )
      return unavailable();
    return { ...base, kind: "inventory", inventory: data };
  }
  let documentId: string | null = null,
    receiptId: string | null = null,
    regularizationId: string | null = null;
  if (
    movement.reference_type === "document" ||
    movement.reference_type === "bal"
  )
    documentId = movement.reference_id;
  else if (movement.reference_type === "purchase_receipt") {
    // Receipt scope comes from its parent document, not a patient column on the receipt.
    const { data, error } = await client
      .from("purchase_receipts")
      .select("id,document_id")
      .eq("id", movement.reference_id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data) return unavailable();
    if (data) {
      documentId = data.document_id;
      receiptId = data.id;
    }
  } else if (movement.reference_type === "delivery_regularization") {
    const { data, error } = await client
      .from("delivery_regularizations")
      .select("id,document_id")
      .eq("id", movement.reference_id)
      .eq("care_recipient_id", patientId)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data) return unavailable();
    if (data) {
      documentId = data.document_id;
      regularizationId = data.id;
    }
  }
  if (!documentId)
    return unavailable(
      "Não há origem tipada disponível para este registro histórico. Seu movimento e sua justificativa permanecem preservados.",
    );
  const { data: header, error } = await client
    .from("operational_documents")
    .select("id,type")
    .eq("id", documentId)
    .eq("care_recipient_id", patientId)
    .maybeSingle();
  if (error) databaseError(error);
  if (
    !header ||
    !["COM", "ENT", "BAL"].includes(header.type) ||
    (receiptId && header.type !== "COM") ||
    (regularizationId && header.type !== "ENT") ||
    (movement.reference_type === "bal" && header.type !== "BAL")
  )
    return unavailable();
  const document = (await rpc(client, "operational_document", {
    p_id: header.id,
  })) as SupplyDocument;
  if (!document.lines.some((line) => line.product_id === movement.product_id))
    return unavailable(
      "A ficha encontrada não identifica o material deste movimento. A referência histórica precisa de conferência.",
    );
  if (receiptId) {
    const receipt = document.receipts.find((row) => row.id === receiptId);
    if (
      !receipt ||
      !receipt.lines.some((row) =>
        document.lines.some(
          (line) =>
            line.id === row.lineId && line.product_id === movement.product_id,
        ),
      )
    )
      return unavailable();
  }
  if (
    regularizationId &&
    !document.deliveryRegularization?.cases.some(
      (row) => row.id === regularizationId,
    )
  )
    return unavailable();
  return { ...base, kind: "document", document, receiptId, regularizationId };
}
