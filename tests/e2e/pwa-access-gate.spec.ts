import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { transformSync } from "esbuild";

test.use({ serviceWorkers: "allow" });
const origin = "http://127.0.0.1:3000";
let cookie = randomUUID();
let expireAfterScript = false, redirectOnDeny = false, spoof = false, holdActivation = false, revision: string | null = null;
let releaseActivation: (() => void) | null = null;
const requests: { path: string; authorized: boolean; status: number }[] = [];
let server: Server;
const assets = new Map([
  ["/service-worker.js", ["public/service-worker.js", "text/javascript"]],
  ["/offline.html", ["public/offline.html", "text/html"]],
  ["/pwa/icon-192.png", ["public/pwa/icon-192.png", "image/png"]],
  ["/pwa/icon-512.png", ["public/pwa/icon-512.png", "image/png"]],
  ["/pwa/apple-180.png", ["public/pwa/apple-180.png", "image/png"]],
]);
test.beforeAll(async () => {
  // Only a loopback fixture origin. This does not touch Vercel protection,
  // the application, its Auth sessions, or any external Push provider.
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", origin).pathname;
    const authorized = (request.headers.cookie ?? "").split(/;\s*/).includes("preview_access=" + cookie);
    const status = authorized ? 200 : redirectOnDeny ? 307 : 401;
    requests.push({ path, authorized, status });
    if (!authorized) { response.writeHead(status, { "Content-Type": "text/html", "Cache-Control": "private, no-store", ...(redirectOnDeny ? { Location: "/gateway-login" } : {}) }); response.end("Preview authentication required"); return; }
    if (path === "/") { response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }); response.end("<!doctype html><html lang=pt-BR><title>Protected Preview fixture</title><p>Public worker lifecycle fixture</p><label>Rascunho de teste<input></label></html>"); return; }
    if (path === "/worker-fixture-helper.js") { response.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" }); response.end(transformSync(readFileSync("src/lib/pwa/worker.ts", "utf8"), { loader: "ts", format: "esm" }).code); return; }
    if (path === "/fixture-activation-gate") { releaseActivation = () => { response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }); response.end("Activation may complete"); }; return; }
    const asset = assets.get(path);
    if (!asset) { response.writeHead(404); response.end(); return; }
    let body: Buffer | string = readFileSync(asset[0]);
    if (path === "/service-worker.js") {
      if (revision) {
        const source = body.toString(), match = /const BUILD = JSON\.parse\((.+)\);/m.exec(source)!;
        const build = JSON.parse(JSON.parse(match[1]));
        body = source.replace(match[0], "const BUILD = " + JSON.stringify({ ...build, revision }) + ";");
      }
      if (expireAfterScript) { cookie = randomUUID(); expireAfterScript = false; }
      if (holdActivation) body = body.toString() + '\nself.addEventListener("activate",event=>event.waitUntil(fetch("/fixture-activation-gate",{credentials:"same-origin",cache:"no-store"})));';
    } else if (spoof && path === "/offline.html") body = "Private account contents".padEnd(body.length, "!").slice(0, body.length);
    response.writeHead(200, { "Content-Type": asset[1], "Cache-Control": "private, no-store", "Vary": "Cookie", "Service-Worker-Allowed": "/" });
    response.end(body);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(3000, "127.0.0.1", resolve); });
});
test.afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
test.beforeEach(() => { requests.length = 0; cookie = randomUUID(); expireAfterScript = false; redirectOnDeny = false; spoof = false; holdActivation = false; revision = null; releaseActivation = null; });
test.afterEach(() => { releaseActivation?.(); releaseActivation = null; });
async function authorize(context: BrowserContext) { await context.addCookies([{ name: "preview_access", value: cookie, url: origin, httpOnly: true, sameSite: "Lax" }]); }
async function register(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/", updateViaCache: "none" });
    const incoming = registration.installing ?? registration.active;
    if (!incoming) return "missing";
    if (["activated", "redundant"].includes(incoming.state)) return incoming.state;
    return new Promise<string>(resolve => incoming.addEventListener("statechange", () => { if (["activated", "redundant"].includes(incoming.state)) resolve(incoming.state); }));
  });
}
const cachePaths = (page: Page) => page.evaluate(async () => {
  const paths: string[] = [];
  for (const name of await caches.keys()) if (name.startsWith("hca-public-pwa-"))
    for (const request of await (await caches.open(name)).keys()) paths.push(new URL(request.url).pathname);
  return paths.sort();
});
const publicPaths = ["/offline.html", "/pwa/apple-180.png", "/pwa/icon-192.png", "/pwa/icon-512.png"];
const runtime = (page: Page) => page.evaluate(async () => {
  const worker = (await navigator.serviceWorker.ready).active!, channel = new MessageChannel();
  return new Promise<{ revision: string }>(resolve => { channel.port1.onmessage = event => { channel.port1.close(); channel.port2.close(); resolve(event.data); }; worker.postMessage({ type: "HCA_RUNTIME" }, [channel.port2]); });
});

test("Preview protegido por cookie prepara o worker real e mantém somente os quatro arquivos públicos", async ({ page, context }, info) => {
  await authorize(context);
  await page.goto(origin);
  const state = await register(page);
  await info.attach("cookie-gate-requests", { body: JSON.stringify(requests, null, 2), contentType: "application/json" });
  expect(state).toBe("activated");
  expect(await cachePaths(page)).toEqual(publicPaths);
  expect(await page.evaluate(async () => { for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) { const response = (await (await caches.open(name)).match(request))!; if (response.headers.has("Vary") || response.headers.has("Set-Cookie") || !response.headers.get("Cache-Control")?.includes("public")) return false; } return true; })).toBe(true);
  expect(requests.filter(request => assets.has(request.path)).every(request => request.authorized && request.status === 200)).toBe(true);
});
for (const mode of ["expired_access", "access_redirect", "private_same_size_response"] as const) test("Preview recupera instalação recusada sem reinstalar nem guardar resposta privada: " + mode, async ({ page, context }) => {
  await authorize(context); await page.goto(origin);
  expireAfterScript = mode !== "private_same_size_response"; redirectOnDeny = mode === "access_redirect"; spoof = mode === "private_same_size_response";
  expect(await register(page)).toBe("redundant"); expect(await cachePaths(page)).toEqual([]);
  if (mode === "expired_access") expect(requests.some(request => request.path === "/offline.html" && request.status === 401)).toBe(true);
  else if (mode === "access_redirect") { expect(requests.some(request => request.path === "/offline.html" && request.status === 307)).toBe(true); expect(requests.some(request => request.path === "/gateway-login")).toBe(false); }
  else expect(requests.find(request => request.path === "/offline.html")?.status).toBe(200);
  spoof = false; await authorize(context);
  expect(await register(page)).toBe("activated"); expect(await cachePaths(page)).toEqual(publicPaths);
});

test("Preview estável atualiza o worker real após fechar duas abas e conserva seus campos até então", async ({ page, context }) => {
  await authorize(context); await page.goto(origin); expect(await register(page)).toBe("activated");
  const before = await runtime(page), peer = await context.newPage(); await peer.goto(origin);
  await page.getByRole("textbox", { name: "Rascunho de teste", exact: true }).fill("Primeira edição local");
  await peer.getByRole("textbox", { name: "Rascunho de teste", exact: true }).fill("Segunda edição local");
  const clock = await peer.evaluate(() => performance.timeOrigin);
  revision = randomUUID().replaceAll("-", "").slice(0, 24);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))!.update());
  await expect.poll(() => peer.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))?.waiting?.state)).toBe("installed");
  expect((await runtime(peer)).revision).toBe(before.revision);
  await expect(peer.getByRole("textbox", { name: "Rascunho de teste", exact: true })).toHaveValue("Segunda edição local");
  expect(await peer.evaluate(() => performance.timeOrigin)).toBe(clock);
  await page.close();
  expect(await peer.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration("/"))?.waiting))).toBe(true);
  await peer.close();
  const reopened = await context.newPage(); await reopened.goto(origin);
  await expect.poll(async () => (await runtime(reopened)).revision).toBe(revision);
  expect(await cachePaths(reopened)).toEqual(publicPaths);
});

test("ativação real pendente permanece sem prontidão após o prazo e confirma somente ao concluir", async ({ page, context }) => {
  await authorize(context); await page.clock.install(); await page.goto(origin); holdActivation = true;
  await page.evaluate(async () => {
    const path = "/worker-fixture-helper.js", helper = await import(path);
    const state = { status: "waiting", phases: [] as string[] };
    (window as unknown as { hcaActivationFixture: typeof state }).hcaActivationFixture = state;
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/", updateViaCache: "none" });
    void helper.activeWorker(registration, new AbortController().signal, (phase: string) => state.phases.push(phase))
      .then(() => { state.status = "ready"; }).catch((reason: unknown) => { state.status = helper.workerFailure(reason, "installation_failed"); });
  });
  const state = () => page.evaluate(() => (window as unknown as { hcaActivationFixture: { status: string; phases: string[] } }).hcaActivationFixture);
  await expect.poll(async () => (await state()).phases.includes("activating")).toBe(true);
  await page.clock.runFor(12000);
  expect((await state()).status).toBe("waiting"); expect((await state()).phases.at(-1)).toBe("pending");
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))!.active!.state)).toBe("activating");
  expect(releaseActivation).not.toBeNull(); releaseActivation!(); releaseActivation = null;
  await expect.poll(async () => (await state()).status).toBe("ready"); expect(await cachePaths(page)).toEqual(publicPaths);
});
