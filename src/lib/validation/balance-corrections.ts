import { z } from "zod";
import { balanceApplicationFacts } from "./balance-application";
const id = z.uuid(), version = z.number().int().positive();
export const balanceCorrectionAct = z.object({
  eventId: id, documentId: id, version, countVersion: version, actorId: id.nullable(), actorName: z.string().nullable(),
  recordedAt: z.iso.datetime({ offset: true }),
  line: z.object({ id, name: z.string(), unit: z.string(), quantity: z.string().regex(/^-?\d+(?:\.\d+)?$/) }).strict(),
  application: balanceApplicationFacts,
}).strict().superRefine((act, ctx) => {
  if (act.application.state === 'applied' && (act.application.countVersion !== act.countVersion
    || act.application.documentVersion < act.version || act.application.lines.length !== 1
    || act.application.lines[0].lineId !== act.line.id)) ctx.addIssue({ code: 'custom', message: 'A aplicação não corresponde ao reconto vinculado.' });
});
export const balanceCorrectionFacts = z.array(z.object({
  reviewId: id, sourceLineId: id, sourceState: z.enum(['known', 'unavailable']), acts: z.array(balanceCorrectionAct),
}).strict().superRefine((item, ctx) => {
  if (item.sourceState === 'unavailable' && item.acts.length) ctx.addIssue({ code: 'custom', message: 'Uma origem indisponível não comprova atos vinculados.' });
  if (new Set(item.acts.map(act => act.eventId)).size !== item.acts.length
    || item.acts.some((act, i) => i > 0 && act.version <= item.acts[i - 1].version)) ctx.addIssue({ code: 'custom', message: 'A cronologia dos atos vinculados não foi confirmada.' });
})).superRefine((items, ctx) => {
  if (new Set(items.map(item => item.reviewId + ':' + item.sourceLineId)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Referência de revisão repetida.' });
});
export type BalanceCorrectionFacts = z.infer<typeof balanceCorrectionFacts>;
export type BalanceCorrectionAct = z.infer<typeof balanceCorrectionAct>;
