import { describe, expect, it } from "vitest";
import { dataApiIsReady } from "../scripts/test-environment.mjs";

describe("local Data API readiness", () => {
  it("requires an available schema, beyond a successful status code", async () => {
    for (const response of [new Response("Unavailable", { status: 503 }), new Response("<html>Starting</html>"), Response.json({}), Response.json({ swagger: "2.0", paths: {} })]) {
      expect(await dataApiIsReady(response)).toBe(false);
    }
    expect(await dataApiIsReady(Response.json({ swagger: "2.0", paths: { "/products": {}, "/profiles": {} } }))).toBe(true);
  });
});
