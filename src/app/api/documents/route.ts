import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  pageParameters,
  patientContext,
  readJson,
  rpc,
  saoPauloDateBoundary,
} from "@/lib/server/api";
import { createSupplySchema } from "@/lib/validation/documents";
import { supplyWriteConfirmation } from "@/lib/supply/write-confirmation";
import { parseDocumentListRead } from "@/lib/validation/document-list";

export async function GET(request: Request) {
  return api("documents.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize } = pageParameters(params);
    const type = params.get("type") || null,
      status = params.get("status") || null,
      search = params.get("search")?.trim() || null;
    const from = params.get("from") || null,
      to = params.get("to") || null;
    if (
      (type && !["REQ", "COM", "ENT", "DEV", "BAL"].includes(type)) ||
      (status && !/^[a-z_]{1,40}$/.test(status)) ||
      (search && !/^[A-Za-z0-9-]{1,100}$/.test(search))
    )
      throw new ApiError("VALIDATION_ERROR", "Revise os filtros de documento.");
    if (from && to && from > to)
      throw new ApiError("INVALID_DATE", "O início deve ser anterior ao fim do período.");
    const result = await rpc(auth.client, "operational_document_list", {
      p_patient: patient.id,
      p_type: type,
      p_status: status,
      p_search: search,
      p_from: from ? saoPauloDateBoundary(from) : null,
      p_to: to ? saoPauloDateBoundary(to, true) : null,
      p_page: page,
      p_size: pageSize,
    });
    const body = {
      ...(result as Record<string, unknown>),
      careRecipientId: patient.id,
      filters: { search, type, status, from, to },
    };
    parseDocumentListRead(body, {
      careRecipientId: patient.id, page, pageSize,
      search: search ?? "", type: type ?? "", status: status ?? "", from: from ?? "", to: to ?? "",
    });
    return NextResponse.json(body);
  });
}
export async function POST(request: Request) {
  return api("documents.create", async () => {
    const input = await readJson(request, createSupplySchema);
    const auth = await authenticate();
    await patientContext(
      auth,
      input.careRecipientId,
      input.draftCommit
        ? input.type.toLowerCase() + ".read"
        : input.type === "COM"
          ? "com.create"
          : input.type === "ENT"
            ? "ent.create"
            : "bal.count",
      !input.draftCommit,
    );
    const data = input.draftCommit
      ? (
        (await rpc(
          auth.client,
          input.type === "BAL"
            ? "commit_creation_draft"
            : "commit_supply_draft",
          {
            p_id: input.draftCommit.id,
            p_expected: input.draftCommit.revision,
            p_target: null,
            p_key: input.idempotencyKey,
            p_body: {
              action: input.type === "BAL" ? "create_bal" : "create",
              payload: input.payload,
            },
          },
        )) as { result: unknown; }
      ).result
      : await rpc(auth.client, "create_supply_document", {
        p_patient: input.careRecipientId,
        p_type: input.type,
        p_payload: input.payload,
        p_key: input.idempotencyKey,
        p_draft: input.draft,
      });
    return NextResponse.json(
      {
        data,
        persistence: "confirmed",
        confirmation: supplyWriteConfirmation(auth.userId, input),
      },
      { status: 201 },
    );
  });
}
