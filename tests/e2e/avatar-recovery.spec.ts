import { openProfilePhoto, selectProfileSection } from "./profile-sections";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fixtures, env, rpc, actor } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";
import { whileRowWaits } from "../integration/lock-barrier.mjs";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const owner = fixtures.family.id;
const objects = () => JSON.parse(sql(`select coalesce(jsonb_agg(name order by name),'[]') from storage.objects where bucket_id='profile-avatars' and name like ${sqlLiteral(owner + '/%')};`)) as string[];
const pointer = () => sql(`select coalesce(avatar_path,'') from public.profiles where id=${sqlLiteral(owner)};`);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function login(page: Page) {
  await page.context().clearCookies(); await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
}
async function openPhoto(page: Page) {
  await page.goto("/perfil");
  await selectProfileSection(page, "identity");
  return openProfilePhoto(page);
}
async function fixture(run: (f: Awaited<ReturnType<typeof createFixture>>) => Promise<void>) {
  const f = await createFixture();
  try { await run(f); }
  finally {
    sql(`update public.profiles set avatar_path=${f.old ? sqlLiteral(f.old) : "null"} where id=${sqlLiteral(owner)};`);
    const created = objects().filter(name => !f.before.includes(name));
    if (created.length) expect((await f.service.storage.from("profile-avatars").remove(created)).error).toBeNull();
    const rows = JSON.parse(sql(`select coalesce(jsonb_agg(id),'[]') from private.avatar_changes where owner_id=${sqlLiteral(owner)} ${f.ids.length ? `and id not in (${f.ids.map(sqlLiteral).join(",")})` : ""};`)) as string[];
    if (rows.length) sql(`delete from private.avatar_changes where id in (${rows.map(sqlLiteral).join(",")});`);
  }
}
async function createFixture() {
  const client = await actor("family", patientA), service = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
  const old = pointer(), before = objects(), ids = JSON.parse(sql(`select coalesce(jsonb_agg(id),'[]') from private.avatar_changes where owner_id=${sqlLiteral(owner)};`)) as string[];
  const valid = `${owner}/${randomUUID()}.jpg`;
  const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#226677" } }).jpeg({ quality: 88 }).toBuffer();
  const chosen = await sharp({ create: { width: 18, height: 18, channels: 3, background: "#aa7755" } }).png().toBuffer();
  expect((await client.storage.from("profile-avatars").upload(valid, jpeg, { contentType: "image/jpeg" })).error).toBeNull();
  await rpc(client, "set_my_avatar", { p_path: valid });
  return { client, service, old, before, ids, valid, jpeg, chosen };
}

test("foto recupera commit com resposta perdida pela chave original, sem duplicar objeto ou reaplicar arquivo diferente", async ({ page }, info) => fixture(async f => {
  await login(page); const panel = await openPhoto(page), count = objects().length;
  expect((await (await page.request.get("/api/context")).json()).data.activeContext).toBeNull();
  const savedName = (await (await page.request.get("/api/profile")).json()).data.full_name;
  let holdReads = true;
  let key = "", reference = "";
  await page.route("**/api/profile/avatar?key=*", route => holdReads ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia da foto indisponível" }) }) : route.continue());
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/profile/avatar" && request.method() === "POST" && request.headers()["content-type"]?.includes("multipart/form-data")) {
      key = request.headers()["idempotency-key"]; reference = request.headers()["x-avatar-reference"];
    }
  });
  // Preserve native multipart: WebKit route.fetch can omit file bodies.
  // Lose only the application-visible response after the actual server commit.
  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window); let lost = false;
    window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (!lost && url.pathname === "/api/profile/avatar" && init?.body instanceof FormData && response.ok) {
        document.documentElement.dataset.avatarUpstream = String(response.status); lost = true;
        return new Response("{", { status: 200, headers: { "content-type": "application/json" } });
      }
      return response;
    };
  });
  await panel.getByLabel("Nova foto", { exact: true }).setInputFiles({ name: "foto-ficticia.png", mimeType: "image/png", buffer: f.chosen });
  await expect(panel.getByRole("img", { name: "Prévia da nova foto", exact: true })).toBeVisible();
  await info.attach("perfil-previa-da-foto", { body: await page.screenshot(), contentType: "image/png" });
  await panel.getByRole("button", { name: "Usar esta foto", exact: true }).click();
  const uncertain = page.getByRole("dialog", { name: "Não foi possível confirmar a foto", exact: true });
  await expect(uncertain).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.avatarUpstream)).toBe("200");
  await expect(page.locator('input[type="file"][aria-label="Nova foto"]')).toBeDisabled();
  expect(objects().length).toBe(count + 1); const appliedPath = pointer(); expect(appliedPath).toContain("/managed/");
  holdReads = false;
  await uncertain.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await page.getByRole("dialog", { name: "Foto confirmada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect((await (await page.request.get("/api/profile")).json()).data.full_name).toBe(savedName);
  const replay = await page.request.post("/api/profile/avatar", { headers: { "idempotency-key": key, "x-avatar-reference": reference }, multipart: { file: { name: "foto-ficticia.png", mimeType: "image/png", buffer: f.chosen } } });
  expect(replay.status()).toBe(200); expect((await replay.json()).attempt.state).toBe("applied");
  const changed = await page.request.post("/api/profile/avatar", { headers: { "idempotency-key": key, "x-avatar-reference": reference }, multipart: { file: { name: "outro.jpg", mimeType: "image/jpeg", buffer: f.jpeg } } });
  expect(changed.status()).toBe(409); expect((await changed.json()).code).toBe("IDEMPOTENCY_CONFLICT");
  expect(objects().length).toBe(count + 1); expect(pointer()).toBe(appliedPath);
  const writes: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname === "/api/profile/avatar" && request.method() !== "GET") writes.push(request.method()); });
  await openPhoto(page); await expect(panel.getByAltText("Sua foto de perfil", { exact: true })).toBeVisible();
  expect(writes).toEqual([]); expect(objects().length).toBe(count + 1); expect(pointer()).toBe(appliedPath);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await auditFromTop(page, "avatar recovered " + width); }
}));

test("foto preserva avatar válido após revogação no commit e retoma o upload real em outra sessão sem novo objeto", async ({ page }) => fixture(async f => {
  const key = randomUUID(), state = await rpc(f.client, "my_avatar_change", {});
  const a = await rpc(f.client, "begin_my_avatar_change", { p_key: key, p_hash: digest(f.chosen), p_size: f.chosen.length, p_name: "foto-ficticia.png", p_reference: state.referenceRevision });
  await rpc(f.service, "prepare_avatar_change", { p_id: a.id, p_hash: digest(f.jpeg), p_size: f.jpeg.length });
  expect((await f.service.storage.from("profile-avatars").upload(a.objectPath, f.jpeg, { contentType: "image/jpeg", upsert: false })).error).toBeNull();
  const count = objects().length;
  await login(page); let panel = await openPhoto(page);
  await expect(panel.getByText("Confirmação em consulta", { exact: true })).toBeVisible();
  const profile = await (await page.request.get("/api/profile")).json(); const current = profile.sessions.find((session: { current: boolean }) => session.current);
  const response = await whileRowWaits("profiles", owner, "finish_my_avatar_change", async () => {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/profile/avatar" && r.request().method() === "POST");
    await panel.getByRole("button", { name: "Conferir resultado", exact: true }).click(); return response;
  }, async () => {
    expect(pointer()).toBe(f.valid); expect(objects().length).toBe(count);
    sql(`delete from auth.sessions where id=${sqlLiteral(current.id)} and user_id=${sqlLiteral(owner)};`);
  });
  expect(response.status()).toBe(403); expect(pointer()).toBe(f.valid); expect(objects().length).toBe(count);
  await login(page); panel = await openPhoto(page);
  const resumed = await (await page.request.get("/api/profile/avatar?key=" + key)).json(); expect(resumed.attempt.key).toBe(key); expect(resumed.attempt.verified).toBe(true);
  await panel.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await page.getByRole("dialog", { name: "Foto confirmada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(pointer()).toBe(a.objectPath); expect(objects().length).toBe(count);
  expect((await f.service.storage.from("profile-avatars").download(f.valid)).error).toBeNull();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await auditFromTop(page, "avatar new session " + width); }
}));

test("foto escolhida sobre referência antiga exibe o conflito e carrega a foto vigente", async ({ page }) => fixture(async f => {
  await login(page);
  const panel = await openPhoto(page);
  await panel.getByLabel("Nova foto", { exact: true }).setInputFiles({ name: "selecao-antiga.png", mimeType: "image/png", buffer: f.chosen });
  await expect(panel.getByRole("img", { name: "Prévia da nova foto", exact: true })).toBeVisible();
  const newer = `${owner}/${randomUUID()}.jpg`;
  expect((await f.client.storage.from("profile-avatars").upload(newer, f.jpeg, { contentType: "image/jpeg" })).error).toBeNull();
  await rpc(f.client, "set_my_avatar", { p_path: newer });
  const before = objects();
  const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/profile/avatar" && response.request().method() === "POST");
  await panel.getByRole("button", { name: "Usar esta foto", exact: true }).click();
  expect((await rejected).status()).toBe(409);
  const conflict = page.getByRole("dialog", { name: "A foto da conta mudou", exact: true });
  await conflict.getByRole("button", { name: "Voltar à foto", exact: true }).click();
  await expect(panel.getByRole("img", { name: "Sua foto de perfil", exact: true })).toHaveAttribute("src", new RegExp(newer));
  expect(pointer()).toBe(newer);
  expect(objects()).toEqual(before);
  await expect(panel.getByRole("button", { name: "Usar esta foto", exact: true })).toHaveCount(0);
}));
