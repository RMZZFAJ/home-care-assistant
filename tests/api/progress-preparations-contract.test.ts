import { it, expect } from "vitest";
import { GET, POST } from "@/app/api/documents/progress-preparations/route";
import { POST as commit } from "@/app/api/documents/progress-preparations/commit/route";
import { POST as generic } from "@/app/api/drafts/route";
const patient = "11111111-1111-4111-8111-111111111111",
  target = "22222222-2222-4222-8222-222222222222";
const body = {
  careRecipientId: patient,
  kind: "PROGRESS",
  purpose: "progress_note",
  targetDocumentId: null,
  targetResourceId: target,
  action: "save",
  id: null,
  expectedRevision: null,
  idempotencyKey: patient,
  content: {
    documentType: "REQ",
    note: { category: "record", stage: null, text: "", references: [] },
  },
  navigation: { version: 1, stage: "progress_note" },
};
const request = (value: unknown, cross = false) =>
  new Request("https://care.example/api/documents/progress-preparations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cross ? "https://other.example" : "https://care.example",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(value),
  });
it("rejects missing,duplicate and expanded private read scope without caching", async () => {
  for (const query of [
    "",
    `careRecipientId=${patient}&purpose=progress_note`,
    `careRecipientId=${patient}&purpose=progress_note&targetResourceId=no`,
    `careRecipientId=${patient}&purpose=progress_note&targetResourceId=${target}&ownerId=${patient}`,
    `careRecipientId=${patient}&purpose=progress_note&targetResourceId=${target}&targetResourceId=${target}`,
  ]) {
    const response = await GET(
      new Request(
        "https://care.example/api/documents/progress-preparations?" + query,
      ),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
});
it("keeps the resource transport separate from generic documentary drafts", async () => {
  const response = await generic(request(body));
  expect(response.status).toBe(400);
  expect(JSON.stringify(await response.json())).not.toContain("Zod");
});
it("rejects impossible stages,expanded authority,invalid native commits and cross-origin requests before mutation", async () => {
  for (const invalid of [
    {
      ...body,
      content: {
        ...body.content,
        note: { ...body.content.note, stage: "count" },
      },
    },
    { ...body, ownerId: patient },
    { ...body, navigation: { version: 1, stage: "flow_review" } },
  ])
    expect((await POST(request(invalid))).status).toBe(400);
  expect(
    (
      await commit(
        request({
          careRecipientId: patient,
          purpose: "progress_note",
          targetResourceId: target,
          key: patient,
          content: body.content.note,
          draftCommit: { id: target, revision: 1 },
        }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request(body, true))).status).toBe(403);
});
