import { z } from "zod";
const submission = z.object({ id: z.uuid(), created_at: z.iso.datetime({ offset: true }), body: z.object({ kind: z.string().optional(), text: z.string().optional(), products: z.array(z.string()).optional() }) });
const page = z.object({ data: z.array(submission).max(100), configured: z.boolean(), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(100) });
export type FlowSubmission = z.infer<typeof submission>;
export function parseFlowPage(value: unknown) {
  const result = page.safeParse(value);
  if (!result.success || result.data.data.length > result.data.pageSize || result.data.data.length > result.data.total)
    throw new Error("A resposta da consulta de sugestões não pôde ser lida. Atualize a lista.");
  return result.data;
}
