/* global self, caches */
// Build replaces this one marker; the generated public file contains no secrets.
const BUILD = JSON.parse("__HCA_PWA_BUILD__");
const CACHE = "hca-public-pwa-" + BUILD.revision;
const PUBLIC_FILES = [
  "/offline.html",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-180.png",
];
async function verifiedPublicResponse(path) {
  const expected = BUILD.assets[path];
  const request = new Request(new URL(path, self.location.origin), {
    // Deployment Protection authenticates delivery of these public files.
    // The cache contains only independently pinned bytes, never that response.
    credentials: "same-origin",
    redirect: "error",
    cache: "reload",
  });
  let response;
  try { response = await fetch(request); }
  catch { throw new Error("network_or_access"); }
  if ([401, 403].includes(response.status)) throw new Error("access_required");
  if (!response.ok || response.redirected || ["opaque", "opaqueredirect"].includes(response.type) ||
      (response.url && response.url !== request.url) ||
      response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== expected.contentType || !response.body)
    throw new Error("public_asset_invalid");
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > expected.bytes) { await reader.cancel(); throw new Error("public_asset_invalid"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (length !== expected.bytes) throw new Error("public_asset_invalid");
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
  if (digest !== expected.sha256) throw new Error("public_asset_invalid");
  // Exclude access cookies, private/Vary headers and any gateway response.
  return new Response(bytes, { headers: { "Content-Type": expected.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
async function reportPreparationFailure(reason) {
  try {
    for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      client.postMessage({ type: "HCA_OFFLINE_PREPARATION_FAILED", reason });
  } catch { /* Failure reporting cannot promote an unsuccessful installation. */ }
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      let createdCache = false;
      try {
        const responses = await Promise.all(PUBLIC_FILES.map(verifiedPublicResponse));
        createdCache = !(await caches.keys()).includes(CACHE);
        const cache = await caches.open(CACHE);
        for (let index = 0; index < PUBLIC_FILES.length; index++) await cache.put(PUBLIC_FILES[index], responses[index]);
      } catch (error) {
        if (createdCache) await caches.delete(CACHE).catch(() => false);
        const reason = ["access_required", "network_or_access", "public_asset_invalid"].includes(error?.message) ? error.message : "storage_unavailable";
        await reportPreparationFailure(reason);
        throw error;
      }
    })(),
  );
  // Activation is conservative unless a same-origin window explicitly confirms an update.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("hca-public-pwa-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  // A MessagePort is only a reply channel, never evidence of the sender's origin.
  if (event.origin !== self.location.origin || event.source?.type !== "window") return;
  if (event.data?.type === "HCA_RUNTIME" && event.ports[0])
    event.ports[0].postMessage({ ...BUILD, capabilities: ["explicit-update", "push-test"] });
  if (event.data?.type === "HCA_ACTIVATE_UPDATE" && event.data.confirmed === true && event.data.revision === BUILD.revision)
    event.waitUntil(self.skipWaiting());
});
self.addEventListener("push", (event) => {
  // Lock-screen text is always local and generic, even for hostile payloads.
  let id = null;
  let test = false;
  try {
    const data = event.data?.json();
    if (
      data?.v === 1 &&
      typeof data.id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        data.id,
      )
    )
      { id = data.id; test = data.kind === "test"; }
  } catch {
    /* Malformed payload still gets only the public, generic notice. */
  }
  event.waitUntil(
    self.registration.showNotification("Home Care Assistant", {
      body: test ? "Teste de avisos recebido neste aparelho. O recebimento deste teste não confirma ciência ou recebimento de materiais." : "Há uma atualização no aplicativo. Entre para consultar suas notificações.",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      ...(id ? { tag: "hca-push-" + id } : {}),
      data: { id, ...(test ? { kind: "test" } : {}) },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data?.id;
  const path = event.notification.data?.kind === "test" ? "/perfil" :
    typeof id === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      id,
    )
      ? "/notificacoes?push=" + encodeURIComponent(id)
      : "/notificacoes";
  // Open a new authenticated destination; never navigate away from unsaved edits.
  event.waitUntil(
    self.clients.openWindow(new URL(path, self.location.origin).href),
  );
});
self.addEventListener("pushsubscriptionchange", (event) => {
  // A browser renewal never inherits an account's consent automatically.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients)
          client.postMessage({ type: "HCA_PUSH_SUBSCRIPTION_CHANGED" });
      }),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(
      (async () =>
        (await caches.open(CACHE))
          .match(url.pathname)
          .then((response) => response ?? verifiedPublicResponse(url.pathname)))(),
    );
    return;
  }
  // Private APIs, documents, PDFs, HTML, and framework payloads are never cached.
  if (
    request.mode === "navigate" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.endsWith(".pdf")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const fallback = await (
          await caches.open(CACHE)
        ).match("/offline.html");
        return (
          fallback ??
          new Response(
            "Sem conexão. Tente novamente quando a conexão voltar.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain;charset=utf-8",
                "Cache-Control": "no-store",
              },
            },
          )
        );
      }),
    );
  }
});
