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
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of PUBLIC_FILES) {
        const request = new Request(new URL(path, self.location.origin), {
          credentials: "omit",
          cache: "reload",
        });
        const response = await fetch(request);
        if (!response.ok || response.redirected || response.type === "opaque")
          throw new Error("Public offline asset unavailable");
        await cache.put(path, response);
      }
    })(),
  );
  // Never skipWaiting: other tabs may contain unconfirmed private edits.
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
  if (event.data?.type === "HCA_RUNTIME" && event.ports[0])
    event.ports[0].postMessage(BUILD);
});
self.addEventListener("push", (event) => {
  // Lock-screen text is always local and generic, even for hostile payloads.
  let id = null;
  try {
    const data = event.data?.json();
    if (
      data?.v === 1 &&
      typeof data.id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        data.id,
      )
    )
      id = data.id;
  } catch {
    /* Malformed payload still gets only the public, generic notice. */
  }
  event.waitUntil(
    self.registration.showNotification("Home Care Assistant", {
      body: "Há uma atualização no aplicativo. Entre para consultar suas notificações.",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      ...(id ? { tag: "hca-push-" + id } : {}),
      data: { id },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data?.id;
  const path =
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
          .then((response) => response ?? fetch(request)))(),
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
      fetch(request).catch(async () => {
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
