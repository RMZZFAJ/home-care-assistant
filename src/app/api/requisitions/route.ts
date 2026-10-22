import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  pageParameters,
  patientContext,
  readJson,
  rpc,
  saoPauloDateBoundary,
} from "@/lib/server/api";
import { loadReceipt } from "@/lib/server/receipts";
import { errorCatalog } from "@/lib/server/error-catalog";
import type { DeliveryStatus } from "@/lib/notifications/presentation";

export async function GET(request: Request) {
  return api("requisitions.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize, start, end } = pageParameters(params);
    let query = auth.client
      .from("requisitions")
      .select(
        "id,protocol,care_recipient_id,status,created_at,is_historical,requester_name_snapshot,recipient_name_snapshot,profiles!requisitions_created_by_fkey(full_name),care_recipients(display_name)",
        { count: "exact" },
      )
      .eq("care_recipient_id", patient.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);
    const protocol = params.get("protocol")?.trim();
    if (protocol) {
      if (!/^[a-zA-Z0-9-]{1,40}$/.test(protocol))
        throw new ApiError("VALIDATION_ERROR", "Informe um protocolo válido.");
      query = query.ilike("protocol", `%${protocol}%`);
    }
    const status = params.get("status");
    if (status) {
      if (
        ![
          "draft",
          "submitted",
          "under_review",
          "approved",
          "separated",
          "delivered",
          "cancelled",
        ].includes(status)
      )
        throw new ApiError("VALIDATION_ERROR", "Status inválido.");
      query = query.eq("status", status);
    }
    const from = params.get("from");
    const to = params.get("to");
    if (from) query = query.gte("created_at", saoPauloDateBoundary(from));
    if (to) query = query.lt("created_at", saoPauloDateBoundary(to, true));
    if (from && to && from > to)
      throw new ApiError(
        "INVALID_DATE",
        "O início deve ser anterior ao fim do período.",
      );
    const { data, error, count } = await query;
    if (error) databaseError(error);
    const notifications = data?.length
      ? ((await rpc(auth.client, "requisition_delivery_status", {
          p_requisition_ids: data.map((row) => row.id),
        })) as DeliveryStatus[])
      : [];
    return NextResponse.json({
      data: (data ?? []).map((row) => ({
        ...row,
        notifications: notifications.filter(
          (notification) => notification.requisition_id === row.id,
        ),
      })),
      page,
      pageSize,
      total: count ?? 0,
    });
  });
}

export async function POST(request: Request) {
  return api("requisitions.submit", async () => {
    const input = await readJson(request, requisitionInputSchema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "request", true);
    const lines = input.lines.map(
      ({ productId, currentStock, urgent, repeatReason }) => ({
        productId,
        currentStock,
        urgent,
        ...(repeatReason ? { repeatReason } : {}),
      }),
    );
    const extras = input.extraItems.map(({ name, currentStock, urgent }) => ({
      customName: name,
      currentStock,
      urgent,
    }));
    const intent = {
      careRecipientId: input.careRecipientId,
      lines,
      extraItems: extras,
      observations: input.observations,
    };
    const result = await rpc(auth.client, "submit_requisition", {
      p_care_recipient_id: input.careRecipientId,
      p_idempotency_key: input.idempotencyKey,
      p_payload_hash: createHash("sha256")
        .update(JSON.stringify(intent))
        .digest("hex"),
      p_lines: lines,
      p_extra_items: extras,
      p_observations: input.observations,
    });
    const persisted = (Array.isArray(result) ? result[0] : result) as {
      requisition_id?: string;
      protocol?: string;
      created_at?: string;
    } | null;
    if (!persisted?.requisition_id)
      throw new ApiError(
        "PERSISTENCE_UNCONFIRMED",
        "Não foi possível confirmar o resultado. Repita o envio com a mesma chave.",
        503,
        true,
      );
    try {
      const receipt = await loadReceipt(auth.client, persisted.requisition_id);
      return NextResponse.json(
        { receipt, persistence: "confirmed" },
        { status: 201 },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "A requisição foi salva. Consulte o histórico ou repita com a mesma chave para recuperar o comprovante.",
          code: "RECEIPT_PENDING",
          category: errorCatalog.RECEIPT_PENDING.category,
          recommendedAction: errorCatalog.RECEIPT_PENDING.recommendedAction,
          persistence: "confirmed",
          requisitionId: persisted.requisition_id,
          protocol: persisted.protocol,
          retryable: true,
        },
        { status: 503 },
      );
    }
  });
}
