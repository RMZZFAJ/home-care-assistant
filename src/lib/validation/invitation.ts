import { z } from "zod";

export const invitationDecision = z.enum(["accept", "decline"]);
export const invitationIntent = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expectedActor: z.uuid(),
  decision: invitationDecision,
}).strict();
export type InvitationIntent = z.infer<typeof invitationIntent>;
const preview = z.object({
  state: z.enum(["ready", "login_required", "wrong_account", "accepted", "declined", "expired", "revoked", "invalid"]),
  patientName: z.string().min(1).optional(),
  recipientEmail: z.email().optional(),
  role: z.enum(["admin", "family", "professional", "supervisor", "reader"]).optional(),
  inviterName: z.string().nullable().optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  canManageStock: z.boolean().optional(),
  canCountStock: z.boolean().optional(),
});
export type InvitationPreview = z.infer<typeof preview>;
const response = z.object({ data: preview, actorId: z.uuid().nullable() }).superRefine((value, ctx) => {
  if (!["ready", "accepted"].includes(value.data.state)) {
    if (Object.keys(value.data).some(key => key !== "state")) ctx.addIssue({ code: "custom", message: "Private fields outside an authorized invitation preview" });
    return;
  }
  if (!value.actorId || !value.data.patientName || !value.data.recipientEmail || !value.data.role || !value.data.expiresAt || typeof value.data.canManageStock !== "boolean" || typeof value.data.canCountStock !== "boolean") {
    ctx.addIssue({ code: "custom", message: "Incomplete invitation preview" });
  }
});
export function parseInvitationRead(value: unknown) {
  const parsed = response.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível confirmar a situação deste convite. Consulte novamente antes de decidir.");
  return parsed.data;
}
export const invitationIntentKey = (intent: Pick<InvitationIntent, "token" | "expectedActor">) => `hca:invitation-decision:${intent.expectedActor}:${intent.token}`;
