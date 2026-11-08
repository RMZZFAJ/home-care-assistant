import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash, webcrypto } from "node:crypto";
import { it, expect, vi } from "vitest";

function environment(options: { requireCookie?: boolean; poison?: boolean; failPut?: boolean } = {}) {
  const files = Object.fromEntries(["/offline.html", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/apple-180.png"].map(path => {
    const bytes = new Uint8Array(readFileSync("public" + path));
    return [path, { bytes, contentType: path.endsWith(".png") ? "image/png" : "text/html", sha256: createHash("sha256").update(bytes).digest("hex") }];
  }));
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const requested: Request[] = [];
  const shown: { title: string; options: NotificationOptions }[] = [],
    opened: string[] = [],
    messages: unknown[] = [];
  let disconnected = false,
    claimed = false,
    skipped = false;
  const scope = {
    location: { origin: "https://care.example" },
    addEventListener: (name: string, handler: (typeof handlers)[string]) => {
      handlers[name] = handler;
    },
    clients: {
      openWindow: async (url: string) => {
        opened.push(url);
      },
      matchAll: async () => [
        { postMessage: (message: unknown) => messages.push(message) },
      ],
      claim: async () => {
        claimed = true;
      },
    },
    skipWaiting: () => {
      skipped = true;
    },
    registration: {
      showNotification: async (title: string, options: NotificationOptions) => {
        shown.push({ title, options });
      },
    },
  };
  const cacheStorage = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {
        put: async (key: string, response: Response) => {
          if (options.failPut && key.endsWith("icon-192.png")) throw new Error("Quota exceeded");
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
        JSON.stringify({ protocol: 1, schema: 1, revision: "sentinel-v1", assets: Object.fromEntries(Object.entries(files).map(([path, file]) => [path, { bytes: file.bytes.length, sha256: file.sha256, contentType: file.contentType }])) }),
      ),
    ),
    {
      self: scope,
      caches: cacheStorage,
      URL,
      Request,
      Response,
      crypto: webcrypto,
      fetch: async (request: Request) => {
        requested.push(request);
        if (disconnected) throw new TypeError("Network unavailable");
        const file = files[new URL(request.url).pathname];
        if (file) {
          if (options.requireCookie && request.credentials !== "same-origin") return new Response("Preview authentication required", { status: 401 });
          return new Response(options.poison ? "Private account contents".padEnd(file.bytes.length, "!").slice(0, file.bytes.length) : file.bytes, { headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store", "Set-Cookie": "fixture_access=not-for-cache", "Vary": "Cookie" } });
        }
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
    shown,
    opened,
    messages,
    lifecycle,
    read,
    disconnect: () => {
      disconnected = true;
    },
    claimed: () => claimed,
    skipped: () => skipped,
  };
}
it("PWA passes the same-origin access gate and caches only pinned public bytes without authentication headers or forced activation", async () => {
  const e = environment({ requireCookie: true });
  await e.lifecycle("install");
  expect(e.requested.map((r) => new URL(r.url).pathname).sort()).toEqual([
    "/offline.html",
    "/pwa/apple-180.png",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
  ]);
  expect(e.requested.every((r) => r.credentials === "same-origin" && r.redirect === "error" && !r.headers.has("Authorization"))).toBe(true);
  for (const response of e.stores.get("hca-public-pwa-sentinel-v1")!.values()) {
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(response.headers.has("Vary")).toBe(false);
    expect(response.headers.get("Cache-Control")).toContain("public");
  }
  expect(e.skipped()).toBe(false);
  e.handlers.message({ data: { type: "HCA_SKIP_WAITING" }, ports: [] });
  expect(e.skipped()).toBe(false);
  expect(Object.keys(e.handlers).sort()).toEqual([
    "activate",
    "fetch",
    "install",
    "message",
    "notificationclick",
    "push",
    "pushsubscriptionchange",
  ]);
});
it("a successful-looking authenticated/private response cannot replace even one pinned public asset", async () => {
  const e = environment({ poison: true });
  await expect(e.lifecycle("install")).rejects.toThrow("public_asset_invalid");
  expect(e.stores.size).toBe(0);
  expect(e.messages).toEqual([{ type: "HCA_OFFLINE_PREPARATION_FAILED", reason: "public_asset_invalid" }]);
});
it("failed cache writes remove only the incomplete new candidate and a retry preserves unrelated data", async () => {
  const options = { failPut: true }, e = environment(options);
  e.stores.set("unrelated", new Map([["private", new Response("unrelated data")]]));
  await expect(e.lifecycle("install")).rejects.toThrow("Quota exceeded");
  expect([...e.stores.keys()]).toEqual(["unrelated"]);
  options.failPut = false;
  await e.lifecycle("install"); await e.lifecycle("activate");
  expect(e.claimed()).toBe(true); expect(e.stores.get("unrelated")!.has("private")).toBe(true);
});
it("an unsuccessful reinstall never removes an existing active public cache of the same revision", async () => {
  const options = { poison: false }, e = environment(options);
  await e.lifecycle("install");
  const before = e.stores.get("hca-public-pwa-sentinel-v1");
  options.poison = true;
  await expect(e.lifecycle("install")).rejects.toThrow("public_asset_invalid");
  expect(e.stores.get("hca-public-pwa-sentinel-v1")).toBe(before);
  expect(before!.size).toBe(4);
});
it("push lock-screen content is fixed, generic and independent of payload text or external URLs", async () => {
  const e = environment(),
    id = "11111111-1111-4111-8111-111111111111";
  let work: Promise<unknown> | undefined;
  for (const data of [
    {
      v: 1,
      id,
      title: "Private patient",
      body: "Secret quantity",
      url: "https://evil.test/",
    },
    { v: 1, id: "//evil.test/" },
  ]) {
    e.handlers.push({
      data: { json: () => data },
      waitUntil: (value: Promise<unknown>) => {
        work = value;
      },
    });
    await work;
  }
  expect(e.shown).toHaveLength(2);
  for (const shown of e.shown) {
    expect(shown.title).toBe("Home Care Assistant");
    expect(shown.options.body).not.toMatch(
      /Private patient|Secret quantity|evil/,
    );
    expect(Object.keys(shown.options.data)).toEqual(["id"]);
  }
  expect(e.shown[0].options.data.id).toBe(id);
  expect(e.shown[1].options.data.id).toBeNull();
  expect(e.requested).toHaveLength(0);
});
it("notification click opens only an authenticated same-origin destination and preserves existing edit tabs", async () => {
  const e = environment(),
    id = "11111111-1111-4111-8111-111111111111",
    close = vi.fn();
  let work: Promise<unknown> | undefined;
  for (const value of [id, "https://evil.test/", "//evil.test/"]) {
    e.handlers.notificationclick({
      notification: { close, data: { id: value, url: "https://evil.test/" } },
      waitUntil: (promise: Promise<unknown>) => {
        work = promise;
      },
    });
    await work;
  }
  expect(e.opened).toEqual([
    "https://care.example/notificacoes?push=" + id,
    "https://care.example/notificacoes",
    "https://care.example/notificacoes",
  ]);
  expect(close).toHaveBeenCalledTimes(3);
  expect(e.skipped()).toBe(false);
  expect(e.requested).toHaveLength(0);
});
it("subscription renewal requests a fresh app consultation without inheriting account consent or transmitting keys", async () => {
  const e = environment();
  let work: Promise<unknown> | undefined;
  e.handlers.pushsubscriptionchange({
    newSubscription: {
      endpoint: "secret capability",
      keys: { auth: "private" },
    },
    waitUntil: (promise: Promise<unknown>) => {
      work = promise;
    },
  });
  await work;
  expect(e.messages).toEqual([{ type: "HCA_PUSH_SUBSCRIPTION_CHANGED" }]);
  expect(e.requested).toHaveLength(0);
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
