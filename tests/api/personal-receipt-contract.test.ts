import { expect, it } from "vitest";
import { POST } from "@/app/api/documents/[id]/route";

it("rejects immutable dispatch fields and a substitute receiver in personal confirmation before Auth", async () => {
  const id = "10000000-0000-4000-8000-000000000001";
  for (const change of [
    { source: "CARE_TEAM" },
    { destination: "FAMILY" },
    { recipientId: id },
    { actorId: id },
    { lines: [{ productId: "altered", quantity: "7" }] },
    { requisitionItemIds: [id] },
  ]) {
    const response = await POST(
      new Request("https://care.example/api/documents/" + id, {
        method: "POST",
        headers: {
          origin: "https://care.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "receive",
          body: { divergences: [], ...change },
          idempotencyKey: id,
          expectedVersion: 1,
        }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  }
});
