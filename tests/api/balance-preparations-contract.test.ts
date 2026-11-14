import { describe, it, expect } from "vitest";
import {
  GET as read,
  POST as write,
} from "@/app/api/balances/preparations/route";
import { GET as reference } from "@/app/api/balances/preparations/reference/route";
import { GET as list } from "@/app/api/balances/preparations/list/route";
import { POST as commit } from "@/app/api/balances/preparations/commit/route";
import { ApiError, databaseError } from "@/lib/server/api";
const patient = "11111111-1111-4111-8111-111111111111";
function post(body: unknown, cross = false) {
  return new Request("https://care.example/api/balances/preparations", {
    method: "POST",
    headers: {
      origin: cross ? "https://foreign.example" : "https://care.example",
      "content-type": "application/json",
      ...(cross ? { "sec-fetch-site": "cross-site" } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe("BAL workspace preparation HTTP boundaries", () => {
  it("rejects malformed exact resource queries as400 rather than internal failures", async () => {
    for (const handler of [read, reference])
      for (const query of [
        "",
        `careRecipientId=${patient}&purpose=configure&targetResourceId=missing`,
        `careRecipientId=${patient}&purpose=configure&targetResourceId=${patient}&role=admin`,
      ]) {
        const r = await handler(
          new Request(
            "https://care.example/api/balances/preparations?" + query,
          ),
        );
        expect(r.status).toBe(400);
        expect(r.headers.get("cache-control")).toBe("no-store");
        expect((await r.json()).code).toBe("VALIDATION_ERROR");
      }
  });
  it("rejects incomplete or unbounded cursors before authentication", async () => {
    for (const suffix of [
      "&before=2026-11-10T00:00:00Z",
      "&limit=0",
      "&limit=51",
      "&beforeId=" + patient,
    ])
      expect(
        (
          await list(
            new Request(
              `https://care.example/api/balances/preparations/list?careRecipientId=${patient}${suffix}`,
            ),
          )
        ).status,
      ).toBe(400);
  });
  it("rejects document or stock payloads in a private workspace preparation", async () => {
    const r = await write(
      post({
        careRecipientId: patient,
        kind: "BAL",
        purpose: "configure",
        targetDocumentId: patient,
        targetResourceId: patient,
        id: null,
        expectedRevision: null,
        idempotencyKey: patient,
        action: "save",
        content: { materials: [{ id: "private-material" }] },
        navigation: { version: 1, stage: "bal_configure" },
      }),
    );
    expect(r.status).toBe(400);
    expect(await r.text()).not.toContain("private-material");
  });
  it("preserves Origin and fetch-site guards for private saves and native confirmations", async () => {
    for (const handler of [write, commit]) {
      const r = await handler(
        post({ reason: "Texto privado sintético" }, true),
      );
      expect(r.status).toBe(403);
      expect((await r.json()).code).toBe("INVALID_ORIGIN");
    }
  });
  it("refuses a native action without its bound private revision and real target", async () => {
    const r = await commit(
      post({
        careRecipientId: patient,
        purpose: "configure",
        targetResourceId: patient,
        command: { action: "configure", body: {} },
        referenceHash: "a".repeat(64),
        expectedVersion: null,
        idempotencyKey: patient,
      }),
    );
    expect(r.status).toBe(400);
  });
  it("uses a programming reference conflict without instructing a new physical inventory count", () => {
    for (const message of [
      "stale document balance preparation reference",
      "balance reference changed during private confirmation",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        throw new Error("Expected refusal");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe("VERSION_CONFLICT");
        expect((e as Error).message).not.toContain("nova contagem");
      }
    }
  });
});
