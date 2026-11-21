import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), marker: vi.fn() }));
vi.mock("@supabase/supabase-js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@supabase/supabase-js")>()),
  createClient: mocks.client,
}));
import { GET } from "@/app/api/runtime/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public-test.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  mocks.client.mockReturnValue({
    rpc: () => ({ abortSignal: mocks.marker }),
  });
});
afterEach(() => vi.unstubAllEnvs());
it("runtime publishes only the compatible public protocol marker without a cacheable response", async () => {
  mocks.marker.mockResolvedValue({
    data: { protocol: 1, schema: 2 },
    error: null,
  });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);
  expect(await response.json()).toEqual({
    state: "ready",
    protocol: 1,
    schema: 2,
  });
});
it("missing or incompatible schema is an explicit unavailable compatibility gate", async () => {
  for (const result of [
    { data: null, error: { code: "PGRST202", message: "private diagnostic" } },
    { data: null, error: { code: "42883" } },
    { data: { protocol: 2, schema: 1 }, error: null },
    { data: { protocol: 1, schema: 1 }, error: null },
  ]) {
    mocks.marker.mockResolvedValue(result);
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.state).toBe("incompatible");
    expect(body.code).toBe("RUNTIME_INCOMPATIBLE");
    expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(body)).not.toContain("private diagnostic");
  }
});
it("database or environment failure is not reported as a confirmed schema incompatibility", async () => {
  mocks.marker.mockResolvedValue({
    data: null,
    error: { code: "08006", message: "secret connection diagnostic" },
  });
  let response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    state: "unavailable",
    code: "RUNTIME_UNAVAILABLE",
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    state: "unavailable",
    code: "RUNTIME_UNAVAILABLE",
  });
});
