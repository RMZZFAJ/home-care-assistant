import { it, expect } from "vitest";
import { GET, POST } from "@/app/api/schedules/resource-preparations/route";
import { GET as reference } from "@/app/api/schedules/resource-preparations/reference/route";
import { GET as list } from "@/app/api/schedules/resource-preparations/list/route";
import { POST as commit } from "@/app/api/schedules/resource-preparations/commit/route";
import { POST as recover } from "@/app/api/schedules/resource-preparations/recovery/route";
import { POST as generic } from "@/app/api/drafts/route";
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const body = {
  careRecipientId: id,
  kind: "SCHEDULE",
  purpose: "shift_type_edit",
  targetDocumentId: null,
  targetResourceId: other,
  id: null,
  expectedRevision: null,
  idempotencyKey: id,
  action: "save",
  content: {
    scheduleAction: {
      form: "type",
      name: "",
      start: "",
      duration: "",
      active: false,
    },
    referenceHash: null,
    referenceVersion: null,
  },
  navigation: { version: 1, stage: "schedule_resource" },
};
const packet = {
  careRecipientId: id,
  purpose: "shift_type_edit",
  targetResourceId: other,
  draftCommit: { id, revision: 1 },
  expectedVersion: 1,
  sourceVersion: null,
  referenceHash: "a".repeat(64),
  command: {
    action: "type",
    body: {
      id: other,
      name: "Nome próprio",
      startsLocal: "07:00",
      durationMinutes: 720,
      active: true,
    },
  },
  idempotencyKey: id,
};
const request = (value: unknown, cross = false) =>
  new Request("https://care.example/api/schedules/resource-preparations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cross ? "https://other.example" : "https://care.example",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(value),
  });
it("requires exact resource read scopes and refuses owner selection or duplicated queries without caching", async () => {
  for (const route of [GET, reference])
    for (const query of [
      "",
      `careRecipientId=${id}&purpose=shift_type_edit`,
      `careRecipientId=${id}&purpose=shift_type_create&targetResourceId=${other}`,
      `careRecipientId=${id}&purpose=shift_type_edit&targetResourceId=${other}&ownerId=${id}`,
      `careRecipientId=${id}&purpose=shift_type_edit&purpose=shift_type_edit&targetResourceId=${other}`,
    ]) {
      const r = await route(
        new Request(
          "https://care.example/api/schedules/resource-preparations?" + query,
        ),
      );
      expect(r.status).toBe(400);
      expect(r.headers.get("cache-control")).toContain("no-store");
    }
  for (const query of [
    `careRecipientId=${id}&before=2026-11-10T12:00:00Z`,
    `careRecipientId=${id}&ownerId=${id}`,
    `careRecipientId=${id}&careRecipientId=${id}`,
  ])
    expect(
      (
        await list(
          new Request(
            "https://care.example/api/schedules/resource-preparations/list?" +
              query,
          ),
        )
      ).status,
    ).toBe(400);
});
it("refuses private snapshots or expanded authority as input and keeps the generic documentary endpoint closed", async () => {
  expect((await generic(request(body))).status).toBe(400);
  for (const bad of [
    { ...body, ownerId: id },
    { ...body, targetDocumentId: other },
    { ...body, targetResourceId: null },
    { ...body, purpose: "schedule_series_approve" },
    { ...body, content: { ...body.content, reference: { patientId: id } } },
    { ...body, navigation: { version: 1, stage: "schedule_creation" } },
  ]) {
    const r = await POST(request(bad));
    expect(r.status).toBe(400);
    expect(JSON.stringify(await r.json())).not.toContain("Zod");
  }
  for (const bad of [
    { ...packet, targetResourceId: id },
    { ...packet, sourceVersion: 2 },
    { ...packet, purpose: "schedule_series_approve" },
    { ...packet, expectedVersion: null },
    { ...packet, actorId: id },
  ])
    expect((await commit(request(bad))).status).toBe(400);
  expect(
    (await recover(request({ packet, resolutionKey: packet.idempotencyKey })))
      .status,
  ).toBe(400);
});
it("rejects cross-origin save,commit,lookup and resolution before authentication or writing", async () => {
  for (const [route, value] of [
    [POST, body],
    [commit, packet],
    [recover, { packet }],
    [recover, { packet, resolutionKey: other }],
  ] as const) {
    const r = await route(request(value, true));
    expect(r.status).toBe(403);
    expect(r.headers.get("cache-control")).toContain("no-store");
  }
});
