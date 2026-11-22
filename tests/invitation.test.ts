import { describe, expect, it } from "vitest";
import { invitationIntent, invitationIntentKey, parseInvitationRead } from "@/lib/validation/invitation";

const actorId = "10000000-0000-4000-8000-000000000001";
const ready = { actorId, data: { state: "ready", patientName: "Residência fictícia", recipientEmail: "pessoa@example.invalid", role: "professional", inviterName: null, expiresAt: "2026-11-12T19:00:00.123456+00:00", canManageStock: false, canCountStock: true } };
describe("invitation presentation and recoverable decision", () => {
  it("accepts complete native metadata and private-free public terminal states", () => {
    expect(parseInvitationRead(ready)).toEqual(ready);
    expect(parseInvitationRead({ actorId, data: { state: "declined" } })).toEqual({ actorId, data: { state: "declined" } });
    expect(parseInvitationRead({ actorId: null, data: { state: "login_required" } }).data.state).toBe("login_required");
  });
  it.each([
    {}, { data: ready.data }, { ...ready, actorId: null },
    { ...ready, data: { ...ready.data, canCountStock: undefined } },
    { ...ready, data: { ...ready.data, role: "constructor" } },
    { ...ready, data: { ...ready.data, state: "wrong_account" } },
    { ...ready, data: { state: "accepted" } },
  ])("rejects incomplete, unrecognized or wrongly disclosed metadata", value => {
    expect(() => parseInvitationRead(value)).toThrow("Não foi possível confirmar a situação deste convite");
  });
  it("binds one immutable choice to its invitation and account without storing credentials", () => {
    const packet = invitationIntent.parse({ token: "a".repeat(43), expectedActor: actorId, decision: "accept" });
    expect(invitationIntentKey(packet)).not.toBe(invitationIntentKey({ ...packet, expectedActor: "10000000-0000-4000-8000-000000000002" }));
    expect(invitationIntent.safeParse({ ...packet, decision: "constructor" }).success).toBe(false);
    expect(invitationIntent.safeParse({ ...packet, password: "must not persist" }).success).toBe(false);
  });
});
