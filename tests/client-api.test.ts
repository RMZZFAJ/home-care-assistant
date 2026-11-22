import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, TransportError } from "../src/lib/client/api";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function failure(request: Promise<unknown>): Promise<ApiError> {
  try { await request; throw new Error("Expected a failed request."); }
  catch (reason) {
    expect(reason).toBeInstanceOf(ApiError);
    if (!(reason instanceof ApiError)) throw reason;
    return reason;
  }
}

describe("D3 request outcomes", () => {
  it.each([400, 401, 403, 404, 409, 422, 429, 500])("retains the proven HTTP %i and safe correlation", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Mensagem segura do contrato", code: "SAFE_CODE", correlationId: "synthetic-reference" }, { status })));
    const result = await failure(api("/api/example"));
    expect(result).toBeInstanceOf(ApiError);
    expect(result).toMatchObject({ status, code: "SAFE_CODE", message: "Mensagem segura do contrato Referência: synthetic-reference" });
  });
  it("repeats a failed GET as a query and treats a lost command response as uncertain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const read = await failure(api("/api/list"));
    expect(read).toMatchObject({ requestKind: "read", outcome: "read_failed", code: "CONNECTION_LOST", status: 0 });
    expect(read.message).toContain("consultar novamente");
    expect(read.message).not.toContain("mesma tentativa");
    const command = await failure(api("/api/drafts", { idempotencyKey: "same-intent", action: "save" }));
    expect(command).toMatchObject({ requestKind: "command", outcome: "uncertain", status: 0 });
    expect(command.message).toContain("mesma tentativa");
    expect(command.message).not.toMatch(/nada.*registrad|não foi registrad/i);
  });
  it.each([200, 400, 503])("does not turn malformed JSON under HTTP %i into proof that a command was rejected", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{invalid", { status })));
    const error = await failure(api("/api/drafts", { idempotencyKey: "retained" }));
    expect(error).toBeInstanceOf(TransportError);
    expect(error).toMatchObject({ status: 0, code: "INVALID_RESPONSE", outcome: "uncertain" });
    expect(error.message).toContain("mesma tentativa");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{invalid", { status })));
    const read = await failure(api("/api/list"));
    expect(read).toMatchObject({ requestKind: "read", outcome: "read_failed" });
    expect(read.message).not.toContain("tentativa");
  });
  it.each([false, true])("distinguishes timeout advice for command=%s without a real wait", async (command) => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));
    const pending = failure(api("/api/example", command ? { action: "confirm", idempotencyKey: "same" } : undefined));
    await vi.advanceTimersByTimeAsync(30_000);
    const error = await pending;
    expect(error).toMatchObject({ code: "CONNECTION_TIMEOUT", requestKind: command ? "command" : "read" });
    expect(error.message.includes("mesma tentativa")).toBe(command);
  });
  it.each([false, true])("does not reinterpret caller abort as a definitive command failure, command=%s", async (command) => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_input: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));
    const pending = failure(api("/api/example", command ? { action: "confirm" } : undefined, controller.signal));
    controller.abort();
    expect(await pending).toMatchObject({ code: "REQUEST_ABORTED", outcome: command ? "uncertain" : "read_failed" });
  });
  it("uses the explicit HTTP method even when the command has no JSON payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true })); vi.stubGlobal("fetch", fetcher);
    await api("/api/subscription", undefined, undefined, "DELETE");
    expect(fetcher).toHaveBeenCalledWith("/api/subscription", expect.objectContaining({ method: "DELETE", cache: "no-store" }));
  });
});
