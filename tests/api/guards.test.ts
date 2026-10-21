import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { api, ApiError, boundedText, databaseError, patientContext, readJson, saoPauloDateBoundary, validateMutationRequest, type AuthContext } from "@/lib/server/api";

const patientId = "10000000-0000-4000-8000-000000000001";
function request(body: unknown, extra: Record<string, string> = {}) {
  return new Request("https://care.example/api/operation", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example", ...extra }, body: JSON.stringify(body) });
}

describe("cookie-authenticated mutation guards", () => {
  it("uses the configured public origin behind a normalized internal host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://care.example");
    try {
      expect(() => validateMutationRequest(new Request("http://localhost:3100/api/operation", {method:"POST",headers:{"content-type":"application/json",origin:"https://care.example"}}))).not.toThrow();
      expect(() => validateMutationRequest(request({}, {origin:"http://localhost:3100"}))).toThrow(ApiError);
    } finally { vi.unstubAllEnvs(); }
  });
  it("rejects cross-site requests and deceptive origins", () => {
    expect(() => validateMutationRequest(request({}, { origin: "https://care.example.attacker.test" }))).toThrow(ApiError);
    expect(() => validateMutationRequest(request({}, { "sec-fetch-site": "cross-site" }))).toThrow(ApiError);
    expect(() => validateMutationRequest(request({}, { origin: "null" }))).toThrow(ApiError);
    expect(() => validateMutationRequest(request({}, { origin: "https://care.example" }))).not.toThrow();
  });
  it("requires JSON and rejects malformed or unknown fields", async () => {
    expect(() => validateMutationRequest(request({}, { "content-type": "text/plain" }))).toThrow(ApiError);
    const schema = z.object({ id: z.number() }).strict();
    await expect(readJson(request({ id: 1, actorId: "forged" }), schema)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(readJson(new Request("https://care.example", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }), schema)).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
  it("limits decoded bytes even without Content-Length", async () => {
    await expect(boundedText(new Request("https://care.example", { method: "POST", body: "á".repeat(20) }), 30)).rejects.toMatchObject({ status: 413 });
    await expect(boundedText(new Request("https://care.example", { method: "POST", body: "abc" }), 3)).resolves.toBe("abc");
  });
});

describe("operational time and safe errors", () => {
  it("maps São Paulo date filters across UTC day boundary and validates calendar dates", () => {
    expect(saoPauloDateBoundary("2026-10-20")).toBe("2026-10-20T03:00:00.000Z");
    expect(saoPauloDateBoundary("2026-10-20", true)).toBe("2026-10-21T03:00:00.000Z");
    expect(saoPauloDateBoundary("2024-02-29", true)).toBe("2024-03-01T03:00:00.000Z");
    expect(saoPauloDateBoundary("2018-11-04")).toBe("2018-11-04T03:00:00.000Z");
    expect(saoPauloDateBoundary("2018-11-04", true)).toBe("2018-11-05T02:00:00.000Z");
    expect(saoPauloDateBoundary("2019-02-16")).toBe("2019-02-16T02:00:00.000Z");
    expect(saoPauloDateBoundary("2019-02-16", true)).toBe("2019-02-17T03:00:00.000Z");
    expect(() => saoPauloDateBoundary("2026-02-29")).toThrow(ApiError);
    expect(() => saoPauloDateBoundary("2026-01-01T00:00:00Z")).toThrow(ApiError);
  });
  it("maps conflicts and never exposes raw database details", async () => {
    expect(() => databaseError({ message: "last global administrator" })).toThrow("Mantenha ao menos um administrador global ativo.");
    expect(() => databaseError({ message: "idempotency key already used" })).toThrow("A chave já foi utilizada com outro conteúdo. Inicie uma nova operação.");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await api("test", async () => { throw new Error("secret credential and patient data"); });
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data).toMatchObject({ code: "INTERNAL_ERROR", retryable: true });
    expect(data.correlationId).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    expect(response.headers.get("cache-control")).toBe("no-store");
    log.mockRestore();
  });
});

describe("patient capability checks", () => {
  function auth(role: string, manage = false, count = false): AuthContext {
    const fixture = [{ id: patientId, display_name: "Fictício", is_active: true }, { role, can_manage_stock: manage, can_count_stock: count }];
    const client = { from: vi.fn(() => { const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: fixture.shift(), error: null })) }; return query; }) } as unknown as SupabaseClient;
    return { client, userId: "20000000-0000-4000-8000-000000000001", fullName: "Teste", isGlobalAdmin: false };
  }
  it("never lets reader permission flags grant writes", async () => {
    await expect(patientContext(auth("reader", true, true), patientId, "manageStock")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patientContext(auth("reader", true, true), patientId, "countStock")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patientContext(auth("reader"), patientId, "request")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("separates local administration from stock-count-only capabilities", async () => {
    await expect(patientContext(auth("professional", false, true), patientId, "countStock")).resolves.toMatchObject({ permissions: { canManage: false, canManageStock: false, canCountStock: true } });
    await expect(patientContext(auth("professional", false, true), patientId, "manage")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patientContext(auth("admin"), patientId, "manage")).resolves.toMatchObject({ permissions: { canManage: true } });
    await expect(patientContext(auth("professional", true, true), patientId, "manageStock")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patientContext(auth("family", true, true), patientId, "request")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patientContext(auth("family", true, true), patientId, "countStock")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
