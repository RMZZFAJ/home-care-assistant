import { expect, it } from "vitest";
import { GET, POST } from "@/app/api/admin/preparations/route";
const patient = "22222222-2222-4222-8222-222222222222";
const query = `patientId=${patient}&mode=patient&purpose=alertRule`;

it.each(["", query + "&ownerId=" + patient, query + "&patientId=" + patient, query + "&key=bad", query + "&mode=global"])(
  "refuses expanded or invalid private query scope %s", async value => {
    const result = await GET(new Request("https://care.example/api/admin/preparations?" + value));
    expect(result.status).toBe(400);
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
it("rejects native commits on the private storage route", async () => {
  const result = await POST(new Request("https://care.example/api/admin/preparations", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" },
    body: JSON.stringify({ patientId: patient, mode: "patient", purpose: "alertRule", targetId: null,
      action: "commit", key: patient, id: null, revision: 0, referenceHash: "a".repeat(64),
      fields: { productId: "material", location: "CARE_TEAM", lowThreshold: "3", criticalThreshold: "2", isEnabled: true } }),
  }));
  expect(result.status).toBe(400);
  expect(result.headers.get("cache-control")).toContain("no-store");
});
