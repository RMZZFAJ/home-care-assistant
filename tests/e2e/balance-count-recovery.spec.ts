import { test, expect, type Page } from "@playwright/test";
import { balanceSetup } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { randomUUID } from "node:crypto";
import { rpc } from "../integration/v4-fixtures.mjs";

test.setTimeout(150_000);
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function open(page: Page, f: Awaited<ReturnType<typeof balanceSetup>>) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.pro.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await button(page, "Entrar").click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/fichas/bal");
  await expect(button(page, "Revisar")).toBeEnabled();
}
const ownKey = (f: Awaited<ReturnType<typeof balanceSetup>>) =>
  `hca:v2:bal-count:${f.pro.id}:${f.patient}:new`;
function facts(patient: string) {
  return sql(
    `select jsonb_build_object('documents',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]'::jsonb) from public.operational_documents d where care_recipient_id=${q(patient)}),'movements',(select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]'::jsonb) from public.stock_movements s where care_recipient_id=${q(patient)}),'events',(select count(*) from public.document_events e join public.operational_documents d on d.id=e.document_id where d.care_recipient_id=${q(patient)}))`,
  );
}
async function fill(page: Page, f: Awaited<ReturnType<typeof balanceSetup>>) {
  for (let i = 0; i < f.products.length; i++)
    await page
      .getByLabel(`Material fictício V4 ${i} · unidade`, { exact: true })
      .fill("0");
  await page
    .getByLabel("Observações da contagem", { exact: true })
    .fill("Contagem própria preservada após resposta perdida");
  await button(page, "Revisar").click();
  await expect(
    page.getByRole("heading", { name: "Revisão da contagem", exact: true }),
  ).toBeVisible();
}

test("BAL review keeps physical fields after an invalid read and uses its own authorized stock reference", async ({ page }) => {
  const f = await balanceSetup();
  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(),
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: f.pro.id,
      recipientReason: "Entrega fictícia para conferir a referência do BAL", lines: [{ productId: f.products[0], quantity: "3" }] },
  });
  await rpc(f.pro.client, "supply_document_command", { p_id: delivery.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: delivery.version });
  const version = Number(sql(`select coalesce((select version from public.patient_settings where care_recipient_id=${q(f.patient)}),1);`));
  await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "capability",
    p_change: { capability: "stock.team.read", subjectRole: "professional", enabled: false }, p_key: randomUUID(), p_version: version });
  await open(page, f);
  expect((await page.request.get("/api/stock/balances?careRecipientId=" + f.patient)).status()).toBe(403);
  const before = facts(f.patient);
  let mode: "invalid" | "foreign" | "live" = "invalid", writes = 0, generalStockReads = 0;
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/stock/balances") generalStockReads++;
    if (path === "/api/documents" && request.method() === "POST") writes++;
  });
  await page.route("**/api/balances?**", async route => {
    if (new URL(route.request().url()).searchParams.get("reference") !== "true") return route.continue();
    const response = await route.fetch(), body = await response.json();
    if (mode === "invalid") body.data.quantities = null;
    if (mode === "foreign") body.careRecipientId = f.pro.id;
    return route.fulfill({ response, json: body });
  });
  for (let index = 0; index < f.products.length; index++) {
    await page.getByLabel(`Material fictício V4 ${index} · unidade`, { exact: true }).fill(index ? "0" : "2");
  }
  await page.getByLabel("Observações da contagem", { exact: true }).fill("Conferência física preservada durante falha de leitura");
  for (const invalid of ["invalid", "foreign"] as const) {
    mode = invalid;
    await button(page, "Revisar").click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("não pôde ser conferida");
    await expect(page.getByLabel("Material fictício V4 0 · unidade", { exact: true })).toHaveValue("2");
    await expect(page.getByLabel("Observações da contagem", { exact: true })).toHaveValue("Conferência física preservada durante falha de leitura");
    await expect(button(page, "Revisar")).toBeEnabled();
    await expect(page.getByRole("region", { name: "Conferir mudança da contagem", exact: true })).toHaveCount(0);
  }
  mode = "live";
  await button(page, "Revisar").click();
  await expect(page.getByRole("heading", { name: "Revisão da contagem", exact: true })).toBeVisible();
  const material = page.getByRole("table", { name: "Materiais da contagem", exact: true }).locator("tbody tr").filter({ has: page.getByText("Material fictício V4 0", { exact: true }) });
  await expect(material.locator('td[data-label="Referência"]')).toHaveText("3 unidade");
  await expect(material.locator('td[data-label="Diferença"]')).toHaveText("-1 unidade");
  expect(generalStockReads).toBe(0);
  expect(writes).toBe(0);
  expect(facts(f.patient)).toBe(before);
});

test("BAL scheduled count keeps the frozen packet after a lost reply,reload and wrong request receipt", async ({
  page,
}) => {
  const f = await balanceSetup();
  await open(page, f);
  await fill(page, f);
  const key = ownKey(f),
    packets: unknown[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/documents" && r.method() === "POST")
      packets.push(r.postDataJSON());
  });
  let applied: Record<string, unknown> | null = null;
  await page.route(
    "**/api/documents",
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      applied = await response.json();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await button(page, "Confirmar contagem").click();
  await expect(button(page, "Recuperar esta tentativa")).toBeVisible();
  const raw = JSON.parse(
    (await page.evaluate((k) => sessionStorage.getItem(k), key))!,
  );
  expect(raw.version).toBe(2);
  expect(raw.userId).toBe(f.pro.id);
  expect(raw.patientId).toBe(f.patient);
  const after = facts(f.patient);
  await page.reload();
  await expect(button(page, "Recuperar a mesma tentativa")).toBeVisible();
  await page.route(
    "**/api/documents",
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const value = structuredClone(applied!) as {
        confirmation: { idempotencyKey: string };
      };
      value.confirmation.idempotencyKey =
        "11111111-1111-4111-8111-111111111111";
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    },
    { times: 1 },
  );
  await button(page, "Recuperar a mesma tentativa").click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "não corresponde à tentativa",
  );
  expect(
    JSON.parse((await page.evaluate((k) => sessionStorage.getItem(k), key))!)
      .pending,
  ).toEqual(raw.pending);
  expect(facts(f.patient)).toBe(after);
  await button(page, "Recuperar a mesma tentativa").click();
  await expect(
    page.getByRole("link", { name: "Abrir ficha BAL", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBeNull();
  expect(facts(f.patient)).toBe(after);
  expect(packets).toHaveLength(3);
  expect(
    packets.every((p) => JSON.stringify(p) === JSON.stringify(packets[0])),
  ).toBe(true);
  await audit(page, "scheduled count exact recovery");
});

for (const kind of ["damaged", "other owner"] as const)
  test(`BAL scheduled count preserves ${kind} local copy and sends no operation`, async ({
    page,
  }) => {
    const f = await balanceSetup();
    await open(page, f);
    const key = ownKey(f),
      before = facts(f.patient);
    let writes = 0;
    page.on("request", (r) => {
      if (
        new URL(r.url()).pathname === "/api/documents" &&
        r.method() === "POST"
      )
        writes++;
    });
    const raw =
      kind === "damaged"
        ? "{damaged"
        : JSON.stringify({
            version: 2,
            userId: "11111111-1111-4111-8111-111111111111",
            patientId: f.patient,
            savedAt: 1,
            counts: {},
            notes: "",
            observationTimes: {},
            assignmentId: null,
            referenceRevision: "0",
            pending: null,
          });
    await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), {
      key,
      raw,
    });
    await page.reload();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "cópia desta contagem",
    );
    await expect(button(page, "Revisar")).toBeDisabled();
    await expect(button(page, "Salvar rascunho")).toBeDisabled();
    expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBe(
      raw,
    );
    expect(writes).toBe(0);
    expect(facts(f.patient)).toBe(before);
    await audit(page, "protected count " + kind);
  });

test("BAL scheduled count stores the packet before an operational POST and refuses storage failure", async ({
  page,
}) => {
  const f = await balanceSetup();
  await open(page, f);
  await fill(page, f);
  const key = ownKey(f),
    before = facts(f.patient);
  let writes = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/documents" && r.method() === "POST")
      writes++;
  });
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key && JSON.parse(v).pending)
        throw new DOMException(
          "Controlled local storage refusal",
          "QuotaExceededError",
        );
      return original.call(this, k, v);
    };
  }, key);
  await button(page, "Confirmar contagem").click();
  await expect(button(page, "Recuperar esta tentativa")).toBeVisible();
  expect(writes).toBe(0);
  expect(facts(f.patient)).toBe(before);
  expect(
    JSON.parse((await page.evaluate((k) => sessionStorage.getItem(k), key))!)
      .pending,
  ).toBeNull();
});

test("BAL scheduled private discard preserves a different operational attempt on this device", async ({
  page,
}) => {
  const f = await balanceSetup();
  await open(page, f);
  await fill(page, f);
  await button(page, "Salvar rascunho").click();
  await expect(
    page.getByRole("region", { name: "Rascunho privado", exact: true }),
  ).toContainText("Revisão 1");
  const key = ownKey(f),
    saved = JSON.parse(
      (await page.evaluate((k) => sessionStorage.getItem(k), key))!,
    );
  saved.pending = {
    url: "/api/documents",
    draft: false,
    body: {
      careRecipientId: f.patient,
      type: "BAL",
      payload: {
        lines: f.products.map((productId: string) => ({
          productId,
          quantity: "0",
        })),
        notes: saved.notes,
        balanceAssignment: {
          id: saved.assignmentId,
          version: 1,
          referenceRevision: saved.referenceRevision,
        },
      },
      draft: false,
      idempotencyKey: crypto.randomUUID(),
    },
  };
  const raw = JSON.stringify(saved),
    before = facts(f.patient);
  await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), {
    key,
    raw,
  });
  let writes = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/documents" && r.method() === "POST")
      writes++;
  });
  await button(page, "Descartar e começar nova").click();
  await page
    .getByRole("dialog", { name: "Descartar rascunho privado", exact: true })
    .getByRole("button", {
      name: "Confirmar descarte do rascunho",
      exact: true,
    })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "descarte privado não a apagou",
  );
  expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBe(raw);
  expect(writes).toBe(0);
  expect(facts(f.patient)).toBe(before);
  expect((await page.request.post("/api/stock/inventory",{data:{action:"create",careRecipientId:f.patient}})).status()).toBe(410);
});
