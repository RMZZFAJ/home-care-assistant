import { describe, it, expect } from "vitest";
import {
  GET as read,
  POST as save,
} from "@/app/api/consumption/preparations/route";
import { POST as reference } from "@/app/api/consumption/preparations/reference/route";
import { POST as commit } from "@/app/api/consumption/preparations/commit/route";
import { POST as generic } from "@/app/api/drafts/route";
const patient = "11111111-1111-4111-8111-111111111111";
function post(body: unknown, cross = false) {
  return new Request("https://care.example/api/consumption/preparations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cross ? "https://other.example" : "https://care.example",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe("private consumption HTTP boundaries", () => {
  it("rejects malformed or extra query scope before authentication and never caches it", async () => {
    for (const handler of [read])
      for (const query of [
        "",
        `careRecipientId=${patient}&role=admin`,
        `careRecipientId=${patient}&productId=&referenceId=missing`,
      ]) {
        const r = await handler(
          new Request(
            "https://care.example/api/consumption/preparations?" + query,
          ),
        );
        expect(r.status).toBe(400);
        expect(r.headers.get("cache-control")).toBe("no-store");
      }
  });
  it("keeps Origin protections on all mutation entrypoints", async () => {
    for (const handler of [save, commit, reference])
      expect(
        (await handler(post({ reason: "Motivo privado fictício" }, true)))
          .status,
      ).toBe(403);
  });
  it("refuses native confirmation without a private revision or matching intention", async () => {
    const r = await commit(
      post({
        careRecipientId: patient,
        command: { reason: "Motivo privado fictício" },
      }),
    );
    expect(r.status).toBe(400);
    expect(await r.text()).not.toContain("Motivo privado fictício");
  });
  it("does not route a consumption preparation into a documentary creation RPC", async () => {
    const r = await generic(
      post({
        careRecipientId: patient,
        kind: "CONSUMPTION",
        purpose: "consumption_report_family",
        targetDocumentId: null,
        targetResourceId: patient,
        id: null,
        expectedRevision: null,
        idempotencyKey: patient,
        action: "save",
        navigation: { version: 1, stage: "consumption_preparation" },
        content: {
          consumption: {
            kind: "",
            location: "FAMILY",
            text: "",
            reason: "",
            reminderId: "",
            lines: [],
          },
          reference: null,
          referenceHash: null,
        },
      }),
    );
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe("VALIDATION_ERROR");
  });
});
