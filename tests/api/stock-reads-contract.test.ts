import { expect, it } from "vitest";
import { GET } from "@/app/api/stock/balances/route";

it("rejects an unknown custody before consulting stock and keeps no-store", async () => {
  const result = await GET(new Request("https://care.example/api/stock/balances?custody=unknown"));
  expect(result.status).toBe(400);
  expect(result.headers.get("cache-control")).toContain("no-store");
  expect(await result.text()).not.toContain("Zod");
});
