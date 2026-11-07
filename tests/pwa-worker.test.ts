import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { it, expect } from "vitest";

function environment() {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const requested: Request[] = [];
  let disconnected = false,
    claimed = false,
    skipped = false;
  const scope = {
    location: { origin: "https://care.example" },
    addEventListener: (name: string, handler: (typeof handlers)[string]) => {
      handlers[name] = handler;
    },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    skipWaiting: () => {
      skipped = true;
    },
  };
  const cacheStorage = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {
        put: async (key: string, response: Response) => {
          stores.get(name)!.set(key, response);
        },
        match: async (key: string) => stores.get(name)!.get(key)?.clone(),
      };
    },
  };
  runInNewContext(
    readFileSync("scripts/pwa-worker.js", "utf8").replace(
      '"__HCA_PWA_BUILD__"',
      JSON.stringify(
        JSON.stringify({ protocol: 1, schema: 1, revision: "sentinel-v1" }),
      ),
    ),
    {
      self: scope,
      caches: cacheStorage,
      URL,
      Request,
      Response,
      fetch: async (request: Request) => {
        requested.push(request);
        if (disconnected) throw new TypeError("Network unavailable");
        return new Response("Private or public network bytes");
      },
    },
  );
  async function lifecycle(name: string) {
    let work: Promise<unknown> | undefined;
    handlers[name]({
      waitUntil: (value: Promise<unknown>) => {
        work = value;
      },
    });
    await work;
  }
  async function read(path: string, mode = "cors", method = "GET") {
    let response: Promise<Response> | undefined;
    handlers.fetch({
      request: { url: new URL(path, scope.location.origin).href, method, mode },
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    return response;
  }
  return {
    handlers,
    stores,
    requested,
    lifecycle,
    read,
    disconnect: () => {
      disconnected = true;
    },
    claimed: () => claimed,
    skipped: () => skipped,
  };
}
it("PWA caches only explicit anonymous public assets and does not force activation", async () => {
  const e = environment();
  await e.lifecycle("install");
  expect(e.requested.map((r) => new URL(r.url).pathname).sort()).toEqual([
    "/offline.html",
    "/pwa/apple-180.png",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
  ]);
  expect(e.requested.every((r) => r.credentials === "omit")).toBe(true);
  expect(e.skipped()).toBe(false);
  e.handlers.message({ data: { type: "HCA_SKIP_WAITING" }, ports: [] });
  expect(e.skipped()).toBe(false);
  expect(Object.keys(e.handlers).sort()).toEqual([
    "activate",
    "fetch",
    "install",
    "message",
  ]);
});
it("private APIs, PDFs, framework data, query variants and commands cannot enter the PWA cache", async () => {
  const e = environment();
  await e.lifecycle("install");
  const store = e.stores.get("hca-public-pwa-sentinel-v1")!;
  store.set("/api/profile", new Response("poisoned private cache"));
  for (const path of [
    "/api/profile",
    "/api/documents/id/pdf",
    "/private.pdf",
    "/_next/data/private.json",
    "/pwa/icon-192.png?patient=private",
    "https://other.example/offline.html",
  ])
    expect(await e.read(path)).toBeUndefined();
  expect(await e.read("/api/drafts", "cors", "POST")).toBeUndefined();
  const before = store.size;
  expect(await (await e.read("/perfil", "navigate"))!.text()).toBe(
    "Private or public network bytes",
  );
  expect(store.size).toBe(before);
  expect(store.has("/perfil")).toBe(false);
});
it("offline navigation uses only public orientation, never a cached private page or a queued operation", async () => {
  const e = environment();
  await e.lifecycle("install");
  e.stores
    .get("hca-public-pwa-sentinel-v1")!
    .set("/offline.html", new Response("Public offline orientation"));
  e.stores.set(
    "unrelated",
    new Map([["/historico/private", new Response("private data")]]),
  );
  e.disconnect();
  expect(await (await e.read("/historico/private", "navigate"))!.text()).toBe(
    "Public offline orientation",
  );
  expect(await e.read("/api/drafts", "cors", "POST")).toBeUndefined();
});
it("activation cleans only prior public PWA caches and preserves unrelated data", async () => {
  const e = environment();
  await e.lifecycle("install");
  e.stores.set("hca-public-pwa-old", new Map());
  e.stores.set("unrelated", new Map());
  await e.lifecycle("activate");
  expect([...e.stores.keys()].sort()).toEqual([
    "hca-public-pwa-sentinel-v1",
    "unrelated",
  ]);
  expect(e.claimed()).toBe(true);
});
