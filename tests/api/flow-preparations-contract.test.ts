import { describe, it, expect } from "vitest";
import {
  GET as read,
  POST as save,
} from "@/app/api/whatsapp/flows/preparations/route";
import { GET as list } from "@/app/api/whatsapp/flows/preparations/list/route";
import { POST as reference } from "@/app/api/whatsapp/flows/preparations/reference/route";
import { POST as commit } from "@/app/api/whatsapp/flows/preparations/commit/route";
import { POST as generic } from "@/app/api/drafts/route";
import { ApiError, databaseError } from "@/lib/server/api";
const patient = "11111111-1111-4111-8111-111111111111";
function post(body: unknown, cross = false) {
  return new Request("https://care.example/api/whatsapp/flows/preparations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cross ? "https://other.example" : "https://care.example",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe("private Flow HTTP boundaries", () => {
  it("a Flow reference conflict asks for comparison without a physical inventory count", () => {
    for (const message of [
      "stale flow reference",
      "flow already reviewed",
      "flow private intent mismatch",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        throw new Error("Expected refusal");
      } catch (cause) {
        expect(cause).toBeInstanceOf(ApiError);
        expect((cause as ApiError).code).toBe("VERSION_CONFLICT");
        expect((cause as ApiError).status).toBe(409);
        expect((cause as Error).message).not.toMatch(
          /estoque mudou|nova contagem/i,
        );
      }
    }
  });
  it("a native invariant failure remains uncertain while real inventory conflicts keep their existing classification", () => {
    for (const message of [
      "native flow result mismatch",
      "native flow report mismatch",
      "native flow rejection mismatch",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        throw new Error("Expected refusal");
      } catch (cause) {
        expect(cause).toBeInstanceOf(ApiError);
        expect((cause as ApiError).code).toBe("INTERNAL_ERROR");
        expect((cause as ApiError).status).toBe(500);
      }
    }
    expect(() =>
      databaseError({ code: "PT409", message: "inventory conflict" }),
    ).toThrow("nova contagem");
  });
  it("rejects malformed or extra read scope and never caches it", async () => {
    for (const handler of [read, list])
      for (const query of [
        "",
        `careRecipientId=${patient}&role=admin`,
        `careRecipientId=${patient}&before=invalid`,
      ]) {
        const r = await handler(
          new Request(
            "https://care.example/api/whatsapp/flows/preparations?" + query,
          ),
        );
        expect(r.status).toBe(400);
        expect(r.headers.get("cache-control")).toBe("no-store");
      }
  });
  it("keeps Origin protections on save,reference and native commit", async () => {
    for (const handler of [save, reference, commit])
      expect(
        (await handler(post({ text: "Descrição privada fictícia" }, true)))
          .status,
      ).toBe(403);
  });
  it("refuses native review without the private revision and original scope", async () => {
    const r = await commit(
      post({
        careRecipientId: patient,
        command: { text: "Descrição privada fictícia" },
      }),
    );
    expect(r.status).toBe(400);
    expect(await r.text()).not.toContain("Descrição privada fictícia");
  });
  it("does not send a Flow preparation to a documentary RPC", async () => {
    const r = await generic(
      post({
        careRecipientId: patient,
        kind: "FLOW",
        purpose: "flow_review",
        targetDocumentId: null,
        targetResourceId: patient,
        id: null,
        expectedRevision: null,
        idempotencyKey: patient,
        action: "save",
        navigation: { version: 1, stage: "flow_review" },
        content: {
          review: { accept: true, kind: "", text: "", lines: [] },
          reference: null,
          referenceHash: null,
        },
      }),
    );
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe("VALIDATION_ERROR");
  });
});
