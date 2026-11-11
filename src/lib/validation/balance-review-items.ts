import { z } from "zod";

const opinionFields = {
  result: z.enum(["confirmed", "difference"]),
  forwarding: z.enum(["none", "recount", "adjustment"]),
  comment: z.string().refine(value => value.length <= 500, "O comentário do material permite até 500 caracteres."),
};
export const balanceReviewItemFields = z.object({ ...opinionFields,
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
export const balanceReviewItems = z.array(balanceReviewItem).max(1000).refine(
  items => new Set(items.map(item => item.lineId)).size === items.length,
  "Não repita o mesmo material no parecer.",
);
export type BalanceReviewItem = z.infer<typeof balanceReviewItem>;
export type BalanceReviewItemOpinion = z.infer<typeof balanceReviewItemOpinion>;

/** An omitted field is not examined; it must never become an inferred approval. */
export function balanceReviewItemsFromFields(fields: Record<string, string>) {
  return balanceReviewItems.parse(Object.keys(fields).filter(key => key.startsWith("item:")).sort().map(key => {
    const value = balanceReviewItemFields.parse(JSON.parse(fields[key]));
    return { lineId: key.slice(5), result: value.result, forwarding: value.forwarding, comment: value.comment };
  }));
}
