import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash, webcrypto } from "node:crypto";
import { it, expect, vi } from "vitest";
import sharp from "sharp";

const notificationImages = {
  icon: "data:image/png;base64," + readFileSync("public/pwa/icon-192.png").toString("base64"),
  badge: "data:image/png;base64," + readFileSync("public/pwa/notification-badge.png").toString("base64"),
};

function environment(options: { requireCookie?: boolean; poison?: boolean; failPut?: boolean } = {}) {
  const files = Object.fromEntries(["/offline.html", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/apple-180.png"].map(path => {
    const bytes = new Uint8Array(readFileSync("public" + path));
    return [path, { bytes, contentType: path.endsWith(".png") ? "image/png" : "text/html", sha256: createHash("sha256").update(bytes).digest("hex") }];
  }));
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const requested: Request[] = [];
  const networkPolicies: { url: string; cache: RequestCache | undefined }[] = [];
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
    skipWaiting: async () => {
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
    ).replace('"__HCA_NOTIFICATION_IMAGES__"', JSON.stringify(JSON.stringify(notificationImages))),
    {
      self: scope,
      caches: cacheStorage,
      URL,
      Request,
      Response,
      crypto: webcrypto,
      fetch: async (request: Request, init?: RequestInit) => {
        requested.push(request);
        networkPolicies.push({ url: request.url, cache: init?.cache ?? request.cache });
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
    networkPolicies,
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
it("runtime replies require a same-origin window client and never accept a foreign, opaque or port-only sender", () => {
  const e = environment(), postMessage = vi.fn();
  for (const sender of [
    { origin: "https://attacker.example", source: { type: "window" } },
    { origin: "null", source: { type: "window" } },
    { origin: "https://care.example", source: null },
    { origin: "https://care.example", source: { type: "worker" } },
  ]) e.handlers.message({ ...sender, data: { type: "HCA_RUNTIME" }, ports: [{ postMessage }] });
  expect(postMessage).not.toHaveBeenCalled();
  e.handlers.message({ origin: "https://care.example", source: { type: "window" }, data: { type: "HCA_RUNTIME" }, ports: [{ postMessage }] });
  expect(postMessage).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: "sentinel-v1", protocol: 1, capabilities: ["explicit-update", "push-test"] }));
});
it("only explicit confirmation from a same-origin window activates the exact update revision", async () => {
  const e = environment();
  let work: Promise<unknown> | undefined;
  const base = { origin: "https://care.example", source: { type: "window" }, ports: [], waitUntil: (promise: Promise<unknown>) => { work = promise; } };
  const data = { type: "HCA_ACTIVATE_UPDATE", revision: "sentinel-v1", confirmed: true };
  for (const event of [
    { ...base, origin: "https://attacker.example", data },
    { ...base, origin: "null", data },
    { ...base, source: { type: "worker" }, data },
    { ...base, source: null, data },
    { ...base, data: { ...data, confirmed: false } },
    { ...base, data: { ...data, revision: "other-version" } },
  ]) e.handlers.message(event);
  expect(e.skipped()).toBe(false);
  e.handlers.message({ ...base, data }); await work;
  expect(e.skipped()).toBe(true);
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
      icon: "https://evil.test/private.png",
      badge: "https://evil.test/private.png",
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
    expect(shown.options.icon).toBe(notificationImages.icon);
    expect(shown.options.badge).toBe(notificationImages.badge);
  }
  expect(e.shown[0].options.data.id).toBe(id);
  expect(e.shown[1].options.data.id).toBeNull();
  expect(e.requested).toHaveLength(0);
});
it("Android status-bar branding is the app mark on a transparent 96px mask, separate from the full-color icon", async () => {
  const bytes = readFileSync("public/pwa/notification-badge.png");
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(data).toEqual(await sharp("public/pwa/notification-badge.svg").ensureAlpha().raw().toBuffer());
  expect([info.width, info.height, info.channels]).toEqual([96, 96, 4]);
  const alpha = Array.from(data).filter((_, index) => index % 4 === 3);
  expect(alpha.filter(value => value === 0).length).toBeGreaterThan(alpha.length / 2);
  expect(alpha.some(value => value === 255)).toBe(true);
  // All four edges stay transparent, so Android cannot silhouette a rectangular background.
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1)
      expect(data[(y * info.width + x) * 4 + 3]).toBe(0);
  }
  expect(notificationImages.badge).not.toBe(notificationImages.icon);
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
it("a test Push is explicit and generic, and opens the account instead of an operational notice", async () => {
  const e = environment(), id = "11111111-1111-4111-8111-111111111111";
  let work: Promise<unknown> | undefined;
  e.handlers.push({ data: { json: () => ({ v: 1, id, kind: "test", body: "Private patient name" }) }, waitUntil: (value: Promise<unknown>) => { work = value; } });
  await work;
  expect(e.shown[0].options.body).toContain("Teste de avisos recebido");
  expect(e.shown[0].options.body).not.toContain("Private patient");
  e.handlers.notificationclick({ notification: { close: vi.fn(), data: e.shown[0].options.data }, waitUntil: (value: Promise<unknown>) => { work = value; } });
  await work;
  expect(e.opened).toEqual(["https://care.example/perfil"]);
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
  expect(e.networkPolicies.at(-1)).toEqual({ url: "https://care.example/perfil", cache: "no-store" });
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
