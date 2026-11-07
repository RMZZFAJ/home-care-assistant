import { test, expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import {
  setup,
  actor,
  rpc,
  fixtures,
  env,
  issue,
  delivery,
} from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { createClient } from "@supabase/supabase-js";
test.setTimeout(180000);
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
async function fixture(page: Page) {
  const f = await setup(),
    owner = await actor("family", f.patient),
    doc = await rpc(owner, "create_supply_document", {
      p_patient: f.patient,
      p_type: "COM",
      p_payload: {
        origin: "purchase",
        lines: [{ productId: f.products[0], quantity: "1" }],
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/historico/${doc.id}`);
  return { ...f, doc, owner };
}
test("PDF recupera intenção após resposta inválida, mantém bytes e permite nova emissão explícita", async ({
  page,
}, info) => {
  const f = await fixture(page),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    files = page.getByRole("region", { name: "Arquivos gerados", exact: true });
  await expect(
    files.getByText("Nenhum exemplar gerado neste fluxo.", { exact: false }),
  ).toBeVisible();
  const keys: string[] = [];
  let lost = true;
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().idempotencyKey);
    const response = await route.fetch();
    expect(response.status(), await response.text()).toBe(200);
    if (lost) {
      lost = false;
      await route.fulfill({ status: 200, json: { state: "ready" } });
    } else await route.fulfill({ response });
  });
  await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(
    files.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    files.getByRole("button", { name: "Recuperar emissão", exact: true }),
  ).toBeEnabled();
  await files
    .getByRole("button", { name: "Recuperar emissão", exact: true })
    .click();
  await expect(
    files.getByRole("button", { name: "Gerar PDF", exact: true }),
  ).toBeEnabled();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  let rows = (await (await page.request.get(endpoint)).json()).data;
  expect(rows).toHaveLength(1);
  const first = rows[0];
  expect(first.validation).toMatchObject({
    accepted: true,
    profile: "PAdES-B-T",
    signerTrust: "internal",
    timestampTrust: "internal",
    externalTimeIndependence: false,
  });
  const download = async (id: string) => {
    const r = await page.request.get(
      `/api/documents/${f.doc.id}/pdf?issuance=${id}`,
    );
    expect(r.status(), r.status() === 200 ? "" : await r.text()).toBe(200);
    return r.body();
  };
  const a = await download(first.id),
    b = await download(first.id);
  expect(hash(a)).toBe(first.sha256);
  expect(a.equals(b)).toBe(true);
  await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  await expect(
    files.getByRole("link", { name: "Baixar PDF", exact: true }),
  ).toHaveCount(2);
  rows = (await (await page.request.get(endpoint)).json()).data;
  expect(rows).toHaveLength(2);
  expect(rows[0].id).not.toBe(first.id);
  expect(rows[0].version).toBe(first.version);
  expect(hash(await download(rows[0].id))).not.toBe(first.sha256);
  const anon = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    publicResult = await rpc(anon, "pdf_issuance_public", {
      p_code: first.verificationCode,
      p_hash: first.sha256,
    });
  expect(publicResult).toMatchObject({
    found: true,
    bytesMatch: true,
    sha256: first.sha256,
  });
  expect(
    Object.keys(publicResult).some((k) =>
      /patient|careRecipient|requestedName|snapshot|objectPath|documentId/i.test(
        k,
      ),
    ),
  ).toBe(false);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await audit(page, "generated-files");
  if (info.project.name === "chromium") {
    mkdirSync("output/pdf/d4-pipeline", { recursive: true });
    writeFileSync("output/pdf/d4-pipeline/com-signed.pdf", a);
    writeFileSync(
      "output/pdf/d4-pipeline/receipt.json",
      JSON.stringify(first, null, 2),
    );
    const trust = JSON.parse(
      readFileSync(process.env.HCA_PDF_TRUST_POLICY_FILE!, "utf8"),
    );
    writeFileSync("output/pdf/d4-pipeline/root-public.crt", trust.roots[0].pem);
  }
});
test("PDF recupera o objeto após falha no registro ready e recusa cache adulterado", async ({
  page,
}) => {
  const f = await fixture(page),
    endpoint = `/api/documents/${f.doc.id}/issuances`,
    key = randomUUID(),
    trigger = "phase_d4_ready_" + f.doc.id.replaceAll("-", "");
  sql(
    `create function private.${trigger}() returns trigger language plpgsql set search_path='' as $$begin if new.document_id=${sqlLiteral(f.doc.id)} and new.state='ready' then raise exception 'controlled PDF ready fault' using errcode='P0001';end if;return new;end;$$; create trigger ${trigger} before update on private.pdf_issuances for each row execute function private.${trigger}();`,
  );
  try {
    const failed = await page.request.post(endpoint, {
      data: { idempotencyKey: key },
    });
    expect(failed.ok()).toBe(false);
  } finally {
    sql(
      `drop trigger ${trigger} on private.pdf_issuances;drop function private.${trigger}();`,
    );
  }
  const r = (await (await page.request.get(endpoint)).json()).data[0];
  expect(r.state).toBe("uncertain");
  const stored = JSON.parse(
    sql(
      `select jsonb_build_object('path',r.object_path,'size',(o.metadata->>'size')::int) from private.pdf_issuances r join storage.objects o on o.bucket_id='document-receipts' and o.name=r.object_path where r.id=${sqlLiteral(r.id)};`,
    ),
  );
  expect(stored.size).toBeGreaterThan(1000);
  const service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    bucket = service.storage.from("document-receipts"),
    prior = await bucket.download(stored.path);
  expect(prior.error).toBeNull();
  const bytes = Buffer.from(await prior.data!.arrayBuffer());
  const retried = await page.request.post(endpoint, {
    data: { idempotencyKey: key },
  });
  expect(retried.status(), await retried.text()).toBe(200);
  const recovered = await retried.json();
  expect(recovered.id).toBe(r.id);
  expect(recovered.sha256).toBe(hash(bytes));
  expect(
    sql(
      `select attempts from private.pdf_issuances where id=${sqlLiteral(r.id)};`,
    ),
  ).toBe("2");
  const changed = Buffer.from(bytes);
  changed[8] ^= 1;
  expect(
    (
      await bucket.update(stored.path, changed, {
        contentType: "application/pdf",
      })
    ).error,
  ).toBeNull();
  try {
    const denied = await page.request.get(
      `/api/documents/${f.doc.id}/pdf?issuance=${r.id}`,
    );
    expect(denied.status()).toBe(503);
    expect(await denied.json()).toMatchObject({ code: "SIGNATURE_INVALID" });
  } finally {
    expect(
      (
        await bucket.update(stored.path, bytes, {
          contentType: "application/pdf",
        })
      ).error,
    ).toBeNull();
  }
  const repeated = await page.request.get(
    `/api/documents/${f.doc.id}/pdf?issuance=${r.id}`,
  );
  expect(repeated.status()).toBe(200);
  expect(hash(await repeated.body())).toBe(recovered.sha256);
  expect(
    sql(`select count(*) from pg_trigger where tgname=${sqlLiteral(trigger)};`),
  ).toBe("0");
});
test("PDF em REQ, ENT e BAL conserva fonte e estoque e exige leitura privada atual", async ({
  page,
}, info) => {
  const f = await fixture(page),
    req = await issue(f.patient, f.products),
    ent = await delivery(f.patient, req, f.products),
    bal = await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient,
      p_type: "BAL",
      p_payload: {
        lines: f.products.map((productId: string) => ({
          productId,
          quantity: "1",
        })),
        notes: "Observação original da contagem fictícia",
      },
      p_key: randomUUID(),
      p_draft: false,
    });
  const source = (id: string) =>
    sql(
      `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`,
    );
  for (const [type, doc] of [
    ["REQ", req],
    ["ENT", ent],
    ["BAL", bal],
  ] as const) {
    await page.goto(`/historico/${doc.id}`);
    const files = page.getByRole("region", {
      name: "Arquivos gerados",
      exact: true,
    });
    await expect(
      files.getByRole("button", { name: "Gerar PDF", exact: true }),
    ).toBeEnabled();
    const before = source(doc.id);
    await files.getByRole("button", { name: "Gerar PDF", exact: true }).click();
    await expect(
      files.getByRole("link", { name: "Baixar PDF", exact: true }),
    ).toHaveCount(1);
    expect(source(doc.id)).toBe(before);
    const row = (
        await (
          await page.request.get(`/api/documents/${doc.id}/issuances`)
        ).json()
      ).data[0],
      url = `/api/documents/${doc.id}/pdf?issuance=${row.id}`,
      response = await page.request.get(url);
    expect(response.status()).toBe(200);
    if (info.project.name === "chromium") {
      mkdirSync("output/pdf/d4-pipeline", { recursive: true });
      writeFileSync(
        `output/pdf/d4-pipeline/${type.toLowerCase()}-signed.pdf`,
        await response.body(),
      );
      writeFileSync(
        `output/pdf/d4-pipeline/${type.toLowerCase()}-receipt.json`,
        JSON.stringify(row, null, 2),
      );
    }
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},${sqlLiteral(type.toLowerCase() + ".read")},false);`,
    );
    try {
      expect((await page.request.get(url)).status()).toBe(403);
      expect(
        (await page.request.get(`/api/documents/${doc.id}/issuances`)).status(),
      ).toBe(403);
    } finally {
      sql(
        `delete from public.capability_overrides where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.family.id)} and capability=${sqlLiteral(type.toLowerCase() + ".read")};`,
      );
    }
  }
});
