import { describe, expect, it } from "vitest";
import {
  clearSchedulePending,
  parseScheduleConfirmation,
  parseSchedulePending,
  saveSchedulePending,
  schedulePendingKey,
  type SchedulePacket,
} from "@/lib/schedules/confirmation";
const user = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  key = "33333333-3333-4333-8333-333333333333",
  target = "44444444-4444-4444-8444-444444444444";
const packet: SchedulePacket = {
  careRecipientId: patient,
  idempotencyKey: key,
  expectedVersion: null,
  command: {
    action: "type",
    body: {
      name: "Plantão pessoal",
      startsLocal: "19:00",
      durationMinutes: 720,
      active: true,
    },
  },
};
const found = {
  found: true,
  userId: user,
  careRecipientId: patient,
  idempotencyKey: key,
  command: packet.command,
  expectedVersion: null,
  recordedAt: "2026-11-10T11:00:00Z",
  result: { id: target, status: null, version: 1 },
};
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
describe("schedule intent recovery", () => {
  it("preserves the original envelope bytes when checking the same packet after reconstruction", () => {
    const s = storage();
    saveSchedulePending(s, user, packet);
    const raw = s.getItem(schedulePendingKey(user, patient))!;
    const restored = parseSchedulePending(raw, user, patient)!;
    saveSchedulePending(s, user, restored);
    expect(s.getItem(schedulePendingKey(user, patient))).toBe(raw);
  });
  it("retains a native packet across reconstruction without inventing a new key", () => {
    const s = storage();
    saveSchedulePending(s, user, packet);
    expect(
      parseSchedulePending(
        s.getItem(schedulePendingKey(user, patient)),
        user,
        patient,
      ),
    ).toEqual(packet);
  });
  it("isolates storage by authenticated account and patient", () => {
    const raw = JSON.stringify({ version: 1, userId: user, packet });
    expect(() => parseSchedulePending(raw, key, patient)).toThrow();
    expect(() => parseSchedulePending(raw, user, key)).toThrow();
  });
  it("never overwrites or acknowledges a different pending decision", () => {
    const s = storage();
    saveSchedulePending(s, user, packet);
    const other = { ...packet, idempotencyKey: target };
    expect(() => saveSchedulePending(s, user, other)).toThrow();
    expect(() => clearSchedulePending(s, user, other)).toThrow();
    expect(
      parseSchedulePending(
        s.getItem(schedulePendingKey(user, patient)),
        user,
        patient,
      ),
    ).toEqual(packet);
  });
  it("refuses malformed storage instead of sending or discarding it", () => {
    expect(() => parseSchedulePending("{", user, patient)).toThrow();
    const s = storage();
    s.setItem(schedulePendingKey(user, patient), "{}");
    expect(() => saveSchedulePending(s, user, packet)).toThrow();
    expect(s.getItem(schedulePendingKey(user, patient))).toBe("{}");
  });
  it("distinguishes not found from confirmed without treating an unknown result as rejection", () => {
    expect(
      parseScheduleConfirmation(
        {
          found: false,
          userId: user,
          careRecipientId: patient,
          idempotencyKey: key,
        },
        user,
        packet,
      ).found,
    ).toBe(false);
    expect(parseScheduleConfirmation(found, user, packet).found).toBe(true);
  });
  it("rejects another actor,scope,key or command even when HTTP200 is structurally plausible", () => {
    for (const value of [
      { ...found, userId: key },
      { ...found, careRecipientId: key },
      { ...found, idempotencyKey: target },
      {
        ...found,
        command: {
          ...packet.command,
          body: { ...packet.command.body, name: "Outra intenção" },
        },
      },
      { ...found, result: { id: target, status: "published", version: 1 } },
    ])
      expect(() => parseScheduleConfirmation(value, user, packet)).toThrow();
  });
  it("binds decisions to their target but permits a new proposal identity", () => {
    const change: SchedulePacket = {
      ...packet,
      expectedVersion: 1,
      command: {
        action: "propose_change",
        body: { id: target, reason: "Troca pessoal" },
      },
    };
    expect(
      parseScheduleConfirmation(
        {
          ...found,
          command: change.command,
          expectedVersion: 1,
          result: { id: key, status: "pending", version: 1 },
        },
        user,
        change,
      ).found,
    ).toBe(true);
    const cancel: SchedulePacket = {
      ...change,
      command: {
        action: "cancel",
        body: { id: target, reason: "Cancelar turno" },
      },
    };
    expect(() =>
      parseScheduleConfirmation(
        {
          ...found,
          command: cancel.command,
          expectedVersion: 1,
          result: { id: key, status: "cancelled", version: 2 },
        },
        user,
        cancel,
      ),
    ).toThrow();
  });
  it("keeps a committed obsolete outcome distinct from approval", () => {
    const p: SchedulePacket = {
      ...packet,
      expectedVersion: 1,
      command: { action: "decide_change", body: { id: target, approve: true } },
    };
    const r = parseScheduleConfirmation(
      {
        ...found,
        command: p.command,
        expectedVersion: 1,
        result: { id: target, status: "obsolete", version: 2 },
      },
      user,
      p,
    );
    expect(r.found && r.result.status).toBe("obsolete");
  });
});
