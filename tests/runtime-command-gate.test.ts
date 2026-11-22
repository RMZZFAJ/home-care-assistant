import { afterEach, it, expect, vi } from "vitest";
import {
  api,
  requireRuntimeCommandsAvailable,
  setRuntimeCommandsAvailable,
} from "@/lib/client/api";
afterEach(() => {
  setRuntimeCommandsAvailable(undefined);
  vi.unstubAllGlobals();
});
it("unavailable browser runtime rejects a new command before sending while reads remain possible", async () => {
  vi.stubGlobal("window", {});
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
  vi.stubGlobal("window", {});
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
