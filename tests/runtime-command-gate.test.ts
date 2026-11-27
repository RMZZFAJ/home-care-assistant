import { afterEach, it, expect, vi } from "vitest";
import {
  api,
  requireRuntimeCommandsAvailable,
  setRuntimeCommandsAvailable,
} from "@/lib/client/api";
import {
  claimTabUpdate,
  observeTabCommands,
  tabCommandCount,
} from "@/lib/client/tab-commands";

function stubBrowserTab() {
  vi.stubGlobal("window", { location: { pathname: "/comunicacoes", search: "?aba=avisos" } });
}

afterEach(() => {
  setRuntimeCommandsAvailable(undefined);
  vi.unstubAllGlobals();
});
it("unavailable browser runtime rejects a new command before sending while reads remain possible", async () => {
  stubBrowserTab();
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ data: "current read" }));
  vi.stubGlobal("fetch", fetch);
  setRuntimeCommandsAvailable(false);
  await expect(
    api("/api/drafts", { idempotencyKey: "unsent" }),
  ).rejects.toMatchObject({ code: "CLIENT_RUNTIME_BLOCKED", status: 400 });
  expect(() => requireRuntimeCommandsAvailable()).toThrow(
    "A ação não foi enviada",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(await api("/api/profile")).toEqual({ data: "current read" });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("runtime readiness never converts a server authorization rejection into success", async () => {
  stubBrowserTab();
  setRuntimeCommandsAvailable(true);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { code: "FORBIDDEN", error: "Acesso recusado" },
          { status: 403 },
        ),
      ),
  );
  await expect(api("/api/drafts", {})).rejects.toMatchObject({
    code: "FORBIDDEN",
    status: 403,
  });
});

it("waits for a dispatched command and preserves an unconfirmed result without resending it", async () => {
  stubBrowserTab();
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetch = vi.fn().mockReturnValue(promise);
  vi.stubGlobal("fetch", fetch);

  const command = api("/api/drafts", {});
  expect(tabCommandCount()).toBe(1);
  expect(claimTabUpdate()).toBeUndefined();
  const checking = observeTabCommands();
  resolve(new Response("unexpected response", { status: 502 }));

  await expect(command).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  await expect(checking).resolves.toEqual({ state: "uncertain", destination: "/comunicacoes?aba=avisos" });
  expect(tabCommandCount()).toBe(0);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("prevents new sends after the tab commits to an update and releases the gate when cancelled", async () => {
  stubBrowserTab();
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ ok: true })));
  vi.stubGlobal("fetch", fetch);
  const release = claimTabUpdate();
  expect(release).toBeTypeOf("function");
  try {
    await expect(api("/api/drafts", {})).rejects.toMatchObject({ code: "CLIENT_RUNTIME_BLOCKED" });
    expect(fetch).not.toHaveBeenCalled();
    await expect(api("/api/profile")).resolves.toEqual({ ok: true });
  } finally {
    release?.();
  }
  await expect(api("/api/drafts", {})).resolves.toEqual({ ok: true });
});

it("bounds the wait without releasing an active command or starting another request", async () => {
  stubBrowserTab();
  const { promise, resolve } = Promise.withResolvers<Response>();
  const fetch = vi.fn().mockReturnValue(promise);
  const settled = vi.fn();
  vi.stubGlobal("fetch", fetch);

  const command = api("/api/drafts", {});
  await expect(observeTabCommands(0, settled)).resolves.toEqual({ state: "pending", destination: "/comunicacoes?aba=avisos" });
  expect(claimTabUpdate()).toBeUndefined();
  expect(settled).not.toHaveBeenCalled();
  resolve(Response.json({ code: "PERSISTENCE_UNCONFIRMED" }, { status: 409 }));
  await expect(command).rejects.toMatchObject({ code: "PERSISTENCE_UNCONFIRMED" });
  await vi.waitFor(() => expect(settled).toHaveBeenCalledWith({ state: "uncertain", destination: "/comunicacoes?aba=avisos" }));
  expect(fetch).toHaveBeenCalledTimes(1);
});
