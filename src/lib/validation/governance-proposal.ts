import { z } from "zod";

export const governanceReviewReference = z.string().regex(/^[0-9a-f]{64}$/);
export const proposalAttemptPointer = z.strictObject({
  careRecipientId: z.uuid(), proposalId: z.uuid(), attemptKey: z.uuid(),
});
export const proposalDecision = z.enum(["approve", "reject"]);
export const proposalAttemptInput = proposalAttemptPointer.extend({
  intent: z.strictObject({ decision: proposalDecision, reference: governanceReviewReference }).nullable(),
});
export const proposalAttemptResult = z.discriminatedUnion("state", [
  proposalAttemptPointer.extend({ state: z.literal("closed"), status: z.null(), invitationId: z.null(), issuedLink: z.literal(false) }),
  proposalAttemptPointer.extend({ state: z.literal("recorded"), status: z.enum(["applied", "rejected", "awaiting_acceptance"]),
    invitationId: z.uuid().nullable(), issuedLink: z.boolean() }),
]).refine(result => (result.status === "awaiting_acceptance") === (result.invitationId !== null) &&
  (!result.issuedLink || result.status === "awaiting_acceptance"));

export type ProposalDecision = z.infer<typeof proposalDecision>;
export const proposalDecisionResponse = z.strictObject({
  result: proposalAttemptResult,
  invitationUrl: z.url().nullable(),
}).refine(reply => reply.result.issuedLink === (reply.invitationUrl !== null));
