import { it, expect } from "vitest";
import { GET, POST } from "@/app/api/schedules/preparations/route";
import { POST as commit } from "@/app/api/schedules/preparations/commit/route";
import { POST as generic } from "@/app/api/drafts/route";
const id = "11111111-1111-4111-8111-111111111111";
const body = {
  careRecipientId: id,
  kind: "SCHEDULE",
  purpose: "shift_type_create",
  targetDocumentId: null,
  targetResourceId: null,
  id: null,
  expectedRevision: null,
  idempotencyKey: id,
  action: "save",
  content: {
    schedule: {
      form: "type",
      name: "",
      start: "",
      duration: "",
      active: false,
    },
  },
  navigation: { version: 1, stage: "schedule_creation" },
};
const request = (value: unknown, cross = false) =>
  new Request("https://care.example/api/schedules/preparations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cross ? "https://other.example" : "https://care.example",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(value),
  });
it("rejects duplicate,missing,unknown or resource-bearing creation read scopes without caching", async () => {
  for (const query of [
    "",
    `careRecipientId=${id}`,
    `careRecipientId=${id}&purpose=progress_note`,
    `careRecipientId=${id}&purpose=shift_type_create&purpose=shift_type_create`,
    `careRecipientId=${id}&ownerId=${id}`,
    `careRecipientId=${id}&purpose=shift_type_create&targetResourceId=${id}`,
  ]) {
    const r = await GET(
      new Request("https://care.example/api/schedules/preparations?" + query),
    );
    expect(r.status).toBe(400);
    expect(r.headers.get("cache-control")).toContain("no-store");
  }
});
it("refuses the generic documentary transport and expanded private write authority", async () => {
  expect((await generic(request(body))).status).toBe(400);
  for (const bad of [
    { ...body, ownerId: id },
    { ...body, targetDocumentId: id },
    { ...body, id },
    { ...body, purpose: "schedule_series_create" },
    { ...body, navigation: { version: 1, stage: "progress_note" } },
  ]) {
    const r = await POST(request(bad));
    expect(r.status).toBe(400);
    expect(JSON.stringify(await r.json())).not.toContain("Zod");
  }
});
it("refuses a legacy native operation and cross-origin private mutations before writing", async () => {
  expect(
    (
      await commit(
        request({
          careRecipientId: id,
          purpose: "shift_type_create",
          draftCommit: { id, revision: 1 },
          command: {
            action: "cancel",
            body: { id, reason: "Não corresponde" },
          },
          idempotencyKey: id,
        }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request(body, true))).status).toBe(403);
});
