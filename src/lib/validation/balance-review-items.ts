import { z } from "zod";
import type { BalanceReviewRecord } from "@/types/documents";

const opinionFields = {
  result: z.enum(["confirmed", "difference"]),
  forwarding: z.enum(["none", "recount", "adjustment"]),
  comment: z.string().refine(value => value.length <= 500, "O comentário do material permite até 500 caracteres."),
};
export const balanceReviewItemFields = z.object({
  ...opinionFields,
  materialName: z.string().max(200).optional(), unit: z.string().max(80).optional(),
}).strict();
export const balanceReviewItemOpinion = z.object(opinionFields).strict().refine(value => (value.result === "confirmed") === (value.forwarding === "none"), {
  message: "Uma diferença precisa indicar reconto ou ajuste autorizado em ato próprio.",
  path: ["forwarding"],
});
export const balanceReviewItem = z.object({
  lineId: z.uuid(),
  ...opinionFields,
}).strict().refine(value => (value.result === "confirmed") === (value.forwarding === "none"), {
  message: "Uma diferença precisa indicar reconto ou ajuste autorizado em ato próprio.",
  path: ["forwarding"],
});
export const balanceReviewItems = z.array(balanceReviewItem).max(1020).refine(
  items => new Set(items.map(item => item.lineId)).size === items.length,
  "Não repita o mesmo material na revisão.",
);
export type BalanceReviewItem = z.infer<typeof balanceReviewItem>;
export type BalanceReviewItemOpinion = z.infer<typeof balanceReviewItemOpinion>;

export function reviewedBalanceMaterial(snapshot: BalanceReviewRecord["reviewed_snapshot"], id: string) {
  const line = snapshot.lines.find(item => item.id === id);
  if (line) return { name: line.name_snapshot, unit: line.unit_snapshot, extra: false };
  const extra = snapshot.extras?.find(item => item.id === id);
  return extra ? { name: extra.name, unit: extra.unit, extra: true } : undefined;
}

/** An omitted field is not examined; it must never become an inferred approval. */
export function balanceReviewItemsFromFields(fields: Record<string, string>) {
  return balanceReviewItems.parse(Object.keys(fields).filter(key => key.startsWith("item:")).sort((left, right) => left < right ? -1 : left > right ? 1 : 0).map(key => {
    const value = balanceReviewItemFields.parse(JSON.parse(fields[key]));
    return { lineId: key.slice(5), result: value.result, forwarding: value.forwarding, comment: value.comment };
  }));
}
