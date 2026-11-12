import { it, expect } from "vitest";
import { POST } from "@/app/api/documents/[id]/issuances/route";
const id = "10000000-0000-4000-8000-000000000001";
it("refuses browser-selected signing facts, readiness and worker proof at the HTTP boundary", async () => {
  for (const patch of [
    { snapshot: {} },
    { sourceFacts: { issuerName: "forged" } },
    { rendererRevision: 5 },
    { sha256: "a".repeat(64) },
    { objectPath: "other.pdf" },
    { validation: { accepted: true } },
    { state: "ready" },
    { workerToken: "secret" },
    { keyVersion: "forged" },
    { requestedBy: id },
    { documentOptions: { mode: "summary", sections: ["progress"], period: { from: null, through: null, timeZone: "America/Sao_Paulo" }, purpose: null } },
    { documentOptions: { mode: "expanded", sections: ["progress"], period: { from: null, through: null, timeZone: "America/Sao_Paulo" }, purpose: null, snapshot: {} } },
  ]) {
    const response = await POST(
      new Request(`https://care.example/api/documents/${id}/issuances`, {
        method: "POST",
        headers: {
          origin: "https://care.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ idempotencyKey: id, ...patch }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  }
});
