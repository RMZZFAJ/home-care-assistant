import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  parseQuery,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { appOrigin } from "@/lib/server/app-origin";
import { issuePdf } from "@/lib/server/pdf-issuance";
import {
  pdfIssuancePageSchema,
  pdfIssuanceRequestSchema,
} from "@/lib/documents/pdf-issuance";

export const runtime = "nodejs";
export const maxDuration = 60;
const cursorSchema = z
  .object({
    before: z.iso.datetime({ offset: true }).optional(),
    beforeId: uuid.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.before) === Boolean(v.beforeId));
async function documentId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.safeParse(id).success)
    throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
  return id;
}
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.issuances.list", async () => {
    const auth = await authenticate(),
      id = await documentId(context),
      query = parseQuery(
        cursorSchema,
        Object.fromEntries(new URL(request.url).searchParams),
      );
    return Response.json(
      pdfIssuancePageSchema.parse(
        await rpc(auth.client, "pdf_issuances", {
          p_document: id,
          p_before: query.before ?? null,
          p_before_id: query.beforeId ?? null,
          p_limit: 20,
        }),
      ),
    );
  });
}
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.issuances.create", async () => {
    const id = await documentId(context),
      body = await readJson(request, pdfIssuanceRequestSchema, 4096),
      auth = await authenticate();
    const receipt = await issuePdf(
      auth.client,
      id,
      body.idempotencyKey,
      body.version,
      appOrigin(request),
      body.documentOptions,
    );
    return Response.json(receipt, {
      status: receipt.state === "ready" ? 200 : 202,
    });
  });
}
