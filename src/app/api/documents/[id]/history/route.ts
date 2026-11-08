import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid } from "@/lib/server/api";
import { documentHistory } from "@/lib/server/document-history";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("documents.history", async () => {
    const params = new URL(request.url).searchParams;
    const integer = (key: string, required: boolean) => {
      const raw = params.get(key);
      if (!required && raw === null) return undefined;
      if (params.getAll(key).length !== 1 || !/^[1-9]\d{0,8}$/.test(raw ?? ""))
        throw new ApiError("VALIDATION_ERROR", "Escolha uma versão válida para consultar.");
      return Number(raw);
    };
    const version = integer("version", true)!, before = integer("before", false);
    const { id } = await context.params, auth = await authenticate();
    return NextResponse.json({ data: await documentHistory(auth.client, parseUuid(id), version, before) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
