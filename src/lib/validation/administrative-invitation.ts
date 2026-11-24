import { z } from "zod";

export const invitationRole = z.enum(["admin", "family", "professional", "supervisor", "reader"]);
const invitationStatus = z.enum(["pending", "accepted", "declined", "revoked"]);
const expiry = z.iso.datetime({ offset: true });
const target = { id: z.uuid(), status: invitationStatus, expiresAt: expiry };

export const administrativeInvitationIntent = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), email: z.email().max(254).toLowerCase(), role: invitationRole }),
  z.strictObject({ action: z.literal("reissue"), ...target }),
  z.strictObject({ action: z.literal("revoke"), ...target }),
]);
export const administrativeInvitationCommand = z.strictObject({
  careRecipientId: z.uuid(), key: z.uuid(), intent: administrativeInvitationIntent.nullable(),
});
export const administrativeInvitation = z.object({
  id: z.uuid(), care_recipient_id: z.uuid(), email: z.email(), role: invitationRole,
  status: invitationStatus, expires_at: expiry, created_at: expiry,
});
const closed = z.strictObject({ state: z.literal("closed") });
const recorded = z.object({ state: z.literal("recorded"), action: z.enum(["create", "reissue", "revoke"]), invitation: administrativeInvitation });
export const administrativeInvitationReceipt = z.union([closed, recorded.extend({ executed: z.boolean() })]);
export const administrativeInvitationResult = z.union([closed, recorded.extend({ invitationUrl: z.url().optional() })]);
export const administrativeInvitationList = z.object({ data: z.array(administrativeInvitation) });

export type AdministrativeInvitation = z.infer<typeof administrativeInvitation>;
export type AdministrativeInvitationIntent = z.infer<typeof administrativeInvitationIntent>;
export type AdministrativeInvitationResult = z.infer<typeof administrativeInvitationResult>;
