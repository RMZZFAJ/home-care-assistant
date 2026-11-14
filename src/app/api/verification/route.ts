import { z } from "zod";
import { api, parseQuery } from "@/lib/server/api";
import { verificationCodeSchema } from "@/lib/documents/public-verification";
import { publicPdfReference, publicPdfUpload } from "@/lib/server/public-pdf";
export const runtime = "nodejs";
export const maxDuration = 20;
export async function GET(request: Request) {
  return api("verification.reference", async () => {
    const query = parseQuery(
      z.object({ code: verificationCodeSchema }).strict(),
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await publicPdfReference(request, query.code));
  });
}
export async function POST(request: Request) {
  return api("verification.upload", async () => {
    const query = parseQuery(
      z.object({ code: verificationCodeSchema.optional() }).strict(),
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await publicPdfUpload(request, query.code ?? null));
  });
}
