import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function login(page: Page, patient: string | null, role: "adminA" | "global" = "adminA") {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
const catalogueRows = (page: Page) => page.getByRole("table", { name: "Produtos do catálogo", exact: true }).locator("tbody tr");
const catalogueIds = (page: Page) => catalogueRows(page).evaluateAll(nodes => nodes.map(node => node.getAttribute("data-product-id")));
const profileIds = (page: Page) => page.locator("article[data-profile-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-profile-id")));
const catalogueFacts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object('items',(select jsonb_agg(to_jsonb(c) order by product_id) from public.care_recipient_products c where care_recipient_id=${q(patient)}),'guidance',(select jsonb_agg(to_jsonb(c) order by product_id) from public.catalogue_successors c where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(c) order by id) from public.stock_movements c where care_recipient_id=${q(patient)}),'documents',(select jsonb_agg(to_jsonb(c) order by id) from public.operational_documents c where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);

test("catalogue directory returns more than1000 items and reaches every late matching item without changing official facts", async ({ page }, info) => {
  const f = await setup(), prefix = "directory-" + randomUUID() + "-";
  sql(`insert into public.products(id,name,category,unit,owner_care_recipient_id)
    select ${q(prefix)}||n,(case when n<=904 then 'Apoio de catálogo ' else 'Alvo de catálogo ' end)||lpad(n::text,4,'0'),'higiene','unidade',${q(f.patient)} from generate_series(1,1005)n;
    insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,sort_order)
    select ${q(f.patient)},id,name,category,unit,array['Alias '||id],case when name like 'Apoio%' then 1000 else 2000 end from public.products where owner_care_recipient_id=${q(f.patient)} and id like ${q(prefix+'%')};
    update public.care_recipient_products set is_active=false where care_recipient_id=${q(f.patient)} and product_id=${q(prefix+'1005')};
    insert into public.catalogue_successors(care_recipient_id,product_id,successor_product_id) values(${q(f.patient)},${q(prefix+'1005')},${q(prefix+'1004')});`);
  const before = catalogueFacts(f.patient);
  const all: string[] = JSON.parse(sql(`select jsonb_agg(product_id order by sort_order,name,product_id) from public.care_recipient_products where care_recipient_id=${q(f.patient)};`));
  const selected = all.filter(id => Number(id.replace(prefix, "")) >= 905 && id.startsWith(prefix)); expect(selected).toHaveLength(101); expect(all.length).toBeGreaterThan(1000);
  await login(page, f.patient);
  const writes: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname === "/api/admin" && request.method() !== "GET") writes.push(request.url()); });
  const complete = await (await page.request.get(`/api/catalog?careRecipientId=${f.patient}&includeInactive=true`)).json();
  expect(complete.total).toBe(all.length); expect(complete.data.map((row: { id: string }) => row.id)).toEqual(all);
  const active = await (await page.request.get(`/api/catalog?careRecipientId=${f.patient}`)).json();
  expect(active.data).toHaveLength(all.length - 1); expect(active.data.some((row: { id: string }) => row.id === prefix + "1005")).toBe(false);
  expect(active.data.find((row: { id: string }) => row.id === prefix + "1004").selectionPredecessors).toEqual([{ id: prefix + "1005", name: "Alvo de catálogo 1005", unit: "unidade" }]);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await page.getByRole("searchbox", { name: "Pesquisar catálogo", exact: true }).fill("Alvo de catálogo");
  await page.getByRole("combobox", { name: "Situação dos produtos", exact: true }).selectOption("");
  const seen: string[] = [];
  for (let offset = 0; offset < selected.length; offset += 15) {
    await expect.poll(() => catalogueIds(page)).toEqual(selected.slice(offset, offset + 15)); seen.push(...await catalogueIds(page) as string[]);
    const next = page.getByRole("navigation", { name: "Páginas do catálogo", exact: true }).getByRole("button", { name: "Próxima", exact: true });
    if (offset + 15 < selected.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(seen).toEqual(selected);
  await page.getByRole("searchbox", { name: "Pesquisar catálogo", exact: true }).fill("Alias " + prefix + "1005");
  await expect.poll(() => catalogueIds(page)).toEqual([prefix + "1005"]);
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "complete catalogue1000 late alias320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("table", { name: "Produtos do catálogo", exact: true }).screenshot({ path: `output/playwright/phase-d/catalogue-late-item-${info.project.name}.png` });
  expect(catalogueFacts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("global account directory pages beyond the old limit,restores query and rejects wrong reads without editing identities", async ({ page, browser }, info) => {
  const f = await setup(), prefix = "ZZZ diretório " + randomUUID().slice(0, 8), emailPrefix = "directory-" + randomUUID();
  sql(`insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    select gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated',${q(emailPrefix)}||'-'||n||'@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('full_name',case when n<=1005 then 'AAAA apoio '||${q(emailPrefix)}||n else ${q(prefix)}||' '||lpad((n-1005)::text,3,'0') end),now(),now() from generate_series(1,1106)n;
    insert into public.profiles(id,full_name,role,status,global_scope)
    select id,raw_user_meta_data->>'full_name','professional','active',false from auth.users where email like ${q(emailPrefix+'%')}
    on conflict(id) do update set full_name=excluded.full_name;`);
  const oracle: string[] = JSON.parse(sql(`select jsonb_agg(id::text order by full_name,id) from public.profiles where full_name like ${q(prefix+'%')};`)); expect(oracle).toHaveLength(101);
  const profileFacts = () => sql(`select encode(sha256(convert_to(jsonb_agg(to_jsonb(p) order by p.id)::text,'UTF8')),'hex') from public.profiles p where full_name like ${q(prefix+'%')};`), before = profileFacts();
  await login(page, null, "global");
  let mode = "live";
  await page.route("**/api/admin?*", async route => {
    const url = new URL(route.request().url()); if (url.searchParams.get("section") !== "profiles" || !url.searchParams.has("profilePage")) return route.continue();
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Diretório global temporariamente indisponível" } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de contas globais recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [] } });
    if (mode === "page") body.profilePage++;
    if (mode === "query") body.query = "other";
    if (mode === "total") body.total = 0;
    if (mode === "duplicate") body.data[1] = body.data[0];
    return route.fulfill({ response, json: body });
  });
  await page.goto("/admin?section=profiles");
  const search = page.getByRole("searchbox", { name: "Pesquisar contas globais", exact: true });
  await search.fill(prefix); await search.press("Enter"); await expect(page).toHaveURL(/profileQuery=/);
  const seen: string[] = [];
  for (let offset = 0; offset < oracle.length; offset += 30) {
    await expect.poll(() => profileIds(page)).toEqual(oracle.slice(offset, offset + 30)); seen.push(...await profileIds(page) as string[]);
    const next = page.getByRole("navigation", { name: "Páginas das contas globais", exact: true }).getByRole("button", { name: "Próxima página de contas", exact: true });
    if (offset + 30 < oracle.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(seen).toEqual(oracle); const tail = oracle.slice(90), refresh = page.getByRole("button", { name: "Atualizar contas", exact: true });
  const alerts = page.getByRole("region", { name: "Contas globais", exact: true }).getByRole("alert");
  for (const invalid of ["incomplete", "page", "query", "total", "duplicate", "unavailable"]) {
    mode = invalid; await refresh.click(); await expect(alerts).toBeVisible(); await expect.poll(() => profileIds(page)).toEqual(tail);
    for (const action of await page.getByRole("button", { name: /^Editar conta / }).all()) await expect(action).toBeDisabled();
    mode = "live"; await refresh.click(); await expect(alerts).toHaveCount(0);
  }
  mode = "unavailable"; await search.fill("Outra busca fictícia"); await search.press("Enter"); await expect(page).toHaveURL(/profilePage=1/);
  await expect(alerts).toBeVisible(); await expect(page.locator("article[data-profile-id]")).toHaveCount(0);
  await expect(page.getByText("Nenhuma conta corresponde à busca.", { exact: true })).toHaveCount(0);
  mode = "live"; await page.goBack(); await expect(page).toHaveURL(/profilePage=4/); await expect(search).toHaveValue(prefix); await expect.poll(() => profileIds(page)).toEqual(tail);
  await page.reload(); await expect.poll(() => profileIds(page)).toEqual(tail);
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "global directory query320");
  mkdirSync("output/playwright/phase-d", { recursive: true }); await page.getByRole("region", { name: "Contas globais", exact: true }).screenshot({ path: `output/playwright/phase-d/global-directory-last-page-${info.project.name}.png` });
  mode = "denied"; await refresh.click(); await expect(alerts).toBeVisible(); await expect(page.locator("article[data-profile-id]")).toHaveCount(0);
  expect(profileFacts()).toBe(before);
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try { const local = await context.newPage(); await login(local, f.patient); expect((await local.request.get("/api/admin?section=profiles&profilePage=1")).status()).toBe(403); }
  finally { await context.close(); }
});

test("catalogue directory rejects incomplete collections,keeps confirmed filters and removes content after real read denial", async ({ page }) => {
  const f = await setup(), before = catalogueFacts(f.patient); await login(page, f.patient);
  let mode = "live";
  await page.route("**/api/admin?*", async route => {
    if (new URL(route.request().url()).searchParams.get("section") !== "catalog") return route.continue();
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [] } });
    if (mode === "patient") body.careRecipientId = fixtures.reader.id;
    if (mode === "total") body.total = 0;
    if (mode === "duplicate") body.data.push(body.data[0]);
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  await expect(catalogueRows(page).first()).toBeVisible(); const initial = (await catalogueIds(page)).slice(0, 1);
  const name = await catalogueRows(page).first().locator("strong").innerText();
  const search = page.getByRole("searchbox", { name: "Pesquisar catálogo", exact: true }); await search.fill(name);
  await expect.poll(() => catalogueIds(page)).toEqual(initial);
  for (const invalid of ["incomplete", "patient", "total", "duplicate"]) {
    mode = invalid; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(page.getByRole("main").getByRole("alert").filter({ hasText: /catálogo/ })).toBeVisible();
    await expect.poll(() => catalogueIds(page)).toEqual(initial); await expect(search).toHaveValue(name);
    await expect(page.getByRole("button", { name: "Novo item", exact: true })).toBeDisabled();
    mode = "live"; await page.getByRole("button", { name: "Consultar catálogo novamente", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert").filter({ hasText: /catálogo/ })).toHaveCount(0);
  }
  await page.unroute("**/api/admin?*");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'catalog.manage',false);`);
  expect((await page.request.get(`/api/admin?section=catalog&careRecipientId=${f.patient}`)).status()).toBe(403);
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed"))); await expect(catalogueRows(page)).toHaveCount(0);
  expect(catalogueFacts(f.patient)).toBe(before);
});
