import { describe, expect, it } from "vitest";
import { cancellationAwarenessSchema, cancellationAcknowledgementSchema, parseCancellationAwareness } from "@/lib/documents/cancellation-awareness";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { GET, POST } from "@/app/api/documents/[id]/cancellation/route";

const doc = "20000000-0000-4000-8000-000000000001", actor = "20000000-0000-4000-8000-000000000002";
const event = "20000000-0000-4000-8000-000000000003", key = "20000000-0000-4000-8000-000000000004";
const pending = {
  documentId: doc, careRecipientId: actor, state: "pending", eligible: true,
  cancellation: { id: event, version: 2, actorName: "Autora preservada", recordedAt: "2026-11-11T18:00:00Z", reason: "Cancelamento próprio." },
  firstAcknowledgement: null, personalAcknowledgement: null, totalAcknowledgements: 0,
};
describe("own cancellation awareness", () => {
  it("distinguishes a pending cancellation from a historical source that was not preserved", () => {
    expect(parseCancellationAwareness(pending, doc, actor).state).toBe("pending");
    expect(cancellationAwarenessSchema.safeParse({ ...pending, state: "unavailable", eligible: false, cancellation: null }).success).toBe(true);
    expect(cancellationAwarenessSchema.safeParse({ ...pending, state: "not_cancelled", eligible: false, cancellation: null }).success).toBe(true);
  });
  it("refuses contradictory source, acknowledgement and total rather than claiming confirmation", () => {
    for (const change of [{ cancellation: null }, { state: "acknowledged" }, { totalAcknowledgements: 1 }, { state: "unavailable" }])
      expect(cancellationAwarenessSchema.safeParse({ ...pending, ...change }).success).toBe(false);
  });
  it("binds the read to this document and the actual personal actor", () => {
    const ack = { id: key, actorId: actor, actorName: "Familiar preservada", recordedAt: "2026-11-11T18:01:00Z" };
    const known = { ...pending, state: "acknowledged", firstAcknowledgement: ack, personalAcknowledgement: ack, totalAcknowledgements: 1 };
    expect(parseCancellationAwareness(known, doc, actor).personalAcknowledgement?.actorId).toBe(actor);
    expect(() => parseCancellationAwareness(known, event, actor)).toThrow();
    expect(() => parseCancellationAwareness(known, doc, event)).toThrow();
  });
  it("accepts only the cancellation identity and the personal attempt key", () => {
    const intent = { cancellationEventId: event, idempotencyKey: key };
    expect(cancellationAcknowledgementSchema.safeParse(intent).success).toBe(true);
    for (const change of [{ actorId: actor }, { confirmed: true }, { cancellationEventId: "bad" }, { idempotencyKey: null }])
      expect(cancellationAcknowledgementSchema.safeParse({ ...intent, ...change }).success).toBe(false);
  });
  it("refuses forged actors and invalid references at the HTTP boundary before authentication", async () => {
    for (const body of [{ cancellationEventId: event, idempotencyKey: key, actorId: actor }, { cancellationEventId: doc }, { cancellationEventId: "bad", idempotencyKey: key }]) {
      const request = new Request("https://care.example/api/documents/" + doc + "/cancellation", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body: JSON.stringify(body) });
      const response = await POST(request, { params: Promise.resolve({ id: doc }) });
      expect(response.status).toBe(400);
    }
    expect((await GET(new Request("https://care.example"), { params: Promise.resolve({ id: "bad" }) })).status).toBe(400);
  });
  it("names the personal cancellation act independently of original issue or receipt", () => {
    for (const type of ["req", "com", "ent", "bal"])
      expect(documentEventLabel(type + ".cancellation_acknowledged")).toMatch(/Ciência do cancelamento/);
  });
});
