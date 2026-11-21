import { expect, it } from "vitest";
import { GET } from "@/app/api/schedules/confirmation/route";
it("refuses malformed,duplicate or expanded lookup scope without caching private confirmations", async () => {
  const patient = "11111111-1111-4111-8111-111111111111",
    key = "22222222-2222-4222-8222-222222222222";
  for (const query of [
    "",
    `careRecipientId=${patient}`,
    `careRecipientId=${patient}&idempotencyKey=no`,
    `careRecipientId=${patient}&idempotencyKey=${key}&userId=${patient}`,
    `careRecipientId=${patient}&careRecipientId=${patient}&idempotencyKey=${key}`,
  ]) {
    const response = await GET(
      new Request(`https://care.example/api/schedules/confirmation?${query}`),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("Zod");
  }
});
