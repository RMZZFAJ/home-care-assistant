import { expect, test, type Page } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import type { SupplyDocument } from "../../src/types/documents";

async function login(
  page: Page,
  patient: string,
  role: "adminA" | "professional",
) {
  const identities = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(identities[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function prepared({ request = false, partial = false } = {}) {
  const f = await setup(),
    professional = await actor("professional", f.patient);
  let document = (await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      recipientReason: "Escolha manual fictícia para este recebimento",
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      lines: [{ productId: f.products[0], quantity: partial ? "3" : "2" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  })) as SupplyDocument;
  document = (await rpc(professional, "supply_document_command", {
    p_id: document.id,
    p_action: "receive",
    p_body: {
      divergences: partial
        ? [{ lineId: document.lines[0].id, acceptedQuantity: "2" }]
        : [],
    },
    p_key: randomUUID(),
    p_version: document.version,
  })) as SupplyDocument;
  const consumption = await consume({ ...f, professional });
  if (request)
    document = (await rpc(f.admin, "supply_document_command", {
      p_id: document.id,
      p_action: "cancel",
      p_body: { reason: "Pedido fictício original da família" },
      p_key: randomUUID(),
      p_version: document.version,
    })) as SupplyDocument;
  return { ...f, professional, document, consumption };
}
async function consume(f: {
  patient: string;
  products: string[];
  professional: Awaited<ReturnType<typeof actor>>;
  admin: Awaited<ReturnType<typeof actor>>;
}) {
  const id = await rpc(f.professional, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text: "Consumo fictício confirmado para conciliação ENT",
    p_lines: [{ productId: f.products[0], quantity: "1" }],
    p_key: randomUUID(),
  });
  await rpc(f.admin, "decide_consumption_report", {
    p_id: id,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  return id;
}
const editor = (page: Page) =>
  page.locator("form").filter({
    has: page.getByRole("button", { name: "Revisar operação", exact: true }),
  });
const cancellation = (page: Page) =>
  page.getByRole("region", { name: "Cancelamento da entrega", exact: true });
const returnField = (page: Page) =>
  editor(page).getByRole("textbox", {
    name: "Devolução física real · Material fictício V4 0 · unidade",
    exact: true,
  });
const ledger = (patient: string) =>
  sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`,
  );
async function review(page: Page) {
  await editor(page)
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input,textarea,select")).toHaveCount(0);
  return dialog;
}

test("ENT pede cancelamento sem estorno e o recebedor concilia devolução real com consumo em leitura, recuperando uma única decisão", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150_000);
  const f = await prepared(),
    before = ledger(f.patient);
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + f.document.id);
  await page
    .getByRole("button", { name: "Solicitar cancelamento", exact: true })
    .click();
  await editor(page)
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill("Pedido fictício: conciliar o material já recebido");
  const requestReview = await review(page),
    requestPayloads: unknown[] = [];
  await page.route("**/api/documents/" + f.document.id, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requestPayloads.push(route.request().postDataJSON());
    if (requestPayloads.length === 1) {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await requestReview
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(
    requestReview.getByRole("button", { name: "Voltar à edição", exact: true }),
  ).toBeDisabled();
  await requestReview
    .getByRole("button", { name: "Recuperar tentativa", exact: true })
    .click();
  await expect(requestReview).toHaveCount(0);
  await page.unroute("**/api/documents/" + f.document.id);
  expect(requestPayloads).toHaveLength(2);
  expect(requestPayloads[0]).toEqual(requestPayloads[1]);
  expect(ledger(f.patient)).toBe(before);
  await expect(
    cancellation(page).getByRole("heading", {
      name: "Pedido de cancelamento vigente",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Consentir e reconciliar cancelamento",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Recusar pedido de cancelamento",
      exact: true,
    }),
  ).toHaveCount(0);
  const pending = (await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  })) as SupplyDocument;
  const pendingPdf = await page.request.get(`/api/documents/${pending.id}/pdf`);
  expect(pendingPdf.ok()).toBe(true);
  if (info.project.name === "chromium") {
    mkdirSync("output/pdf/phase-d", { recursive: true });
    writeFileSync(
      `output/pdf/phase-d/delivery-cancellation-${pending.id}-v${pending.version}-pending.pdf`,
      await pendingPdf.body(),
      { flag: "wx" },
    );
  }
  const recipientContext = await browser.newContext(),
    recipient = await recipientContext.newPage();
  try {
    await login(recipient, f.patient, "professional");
    await recipient.goto("/fichas/" + f.document.id);
    await recipient
      .getByRole("button", {
        name: "Consentir e reconciliar cancelamento",
        exact: true,
      })
      .click();
    await expect(returnField(recipient)).toHaveValue("");
    await expect(
      editor(recipient).locator('input[name$=":consumed"]'),
    ).toHaveCount(0);
    await expect(
      editor(recipient).getByText(
        "Pedido fictício: conciliar o material já recebido",
        { exact: true },
      ),
    ).toBeVisible();
    await returnField(recipient).fill("1,0");
    await editor(recipient)
      .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
      .fill("Uma unidade foi consumida e uma foi fisicamente devolvida");
    const consentReview = await review(recipient);
    await expect(
      consentReview.getByText("consumo já confirmado referenciado 1 unidade", {
        exact: false,
      }),
    ).toBeVisible();
    for (const width of [1440, 768, 390, 320]) {
      await recipient.setViewportSize({ width, height: 900 });
      await audit(recipient, "ENT cancellation review " + width);
      expect(
        await recipient.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await recipient.screenshot({
      path: `output/playwright/phase-d/delivery-cancellation-review-${info.project.name}.png`,
      animations: "disabled",
    });
    const payloads: unknown[] = [];
    await recipient.route(
      "**/api/documents/" + f.document.id,
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        payloads.push(route.request().postDataJSON());
        if (payloads.length === 1) {
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      },
    );
    await consentReview
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(
      consentReview.getByRole("button", {
        name: "Fechar diálogo",
        exact: true,
      }),
    ).toBeDisabled();
    await consentReview
      .getByRole("button", { name: "Recuperar tentativa", exact: true })
      .click();
    await expect(consentReview).toHaveCount(0);
    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toEqual(payloads[1]);
    await expect(recipient.locator(".hca-document-header h2")).toBeFocused();
    await expect(
      cancellation(recipient).getByText("Consentido e conciliado", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      cancellation(page).getByText("Consentido e conciliado", { exact: true }),
    ).toBeVisible();
    const final = (await rpc(f.professional, "operational_document", {
      p_id: f.document.id,
    })) as SupplyDocument;
    expect(final.status).toBe("cancelled");
    await expect(
      recipient.getByText(
        "O histórico preserva o recebimento. Consulte abaixo as devoluções e o consumo conciliados no cancelamento.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(final.deliveryCancellation?.request.outcome?.actorId).toBe(
      fixtures.professional.id,
    );
    expect(Number(final.deliveryCancellation?.lines[0].returnQuantity)).toBe(1);
    expect(Number(final.deliveryCancellation?.lines[0].consumedQuantity)).toBe(
      1,
    );
    expect(
      final.deliveryCancellation?.lines[0].consumptionReferences[0].reportId,
    ).toBe(f.consumption);
    expect(
      sql(
        `select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='consumption';`,
      ),
    ).toBe("1");
    expect(
      sql(
        `select count(*) from public.delivery_consumption_allocations where document_id=${sqlLiteral(final.id)};`,
      ),
    ).toBe("1");
    expect(
      final.events.filter((event) => event.action === "ent.consent_cancel"),
    ).toHaveLength(1);
    const finalPdf = await recipient.request.get(
      `/api/documents/${final.id}/pdf`,
    );
    expect(finalPdf.ok()).toBe(true);
    expect((await finalPdf.body()).equals(await pendingPdf.body())).toBe(false);
    if (info.project.name === "chromium")
      writeFileSync(
        `output/pdf/phase-d/delivery-cancellation-${final.id}-v${final.version}-consented.pdf`,
        await finalPdf.body(),
        { flag: "wx" },
      );
    await audit(recipient, "ENT cancellation result 320");
    await recipient.screenshot({
      path: `output/playwright/phase-d/delivery-cancellation-result-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await recipientContext.close();
  }
});

test("ENT recusa do recebedor conflita com retirada antiga, e um novo pedido pode ser retirado preservando os fatos", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const f = await prepared({ request: true }),
    before = ledger(f.patient),
    requestId = f.document.deliveryCancellation!.request.id;
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + f.document.id);
  await page
    .getByRole("button", {
      name: "Retirar meu pedido de cancelamento",
      exact: true,
    })
    .click();
  const reason = editor(page).getByRole("textbox", {
    name: "Motivo da retirada",
    exact: true,
  });
  await expect(reason).toHaveValue("");
  await reason.fill("Justificativa própria preservada para retirar o pedido");
  const withdrawal = await review(page);
  const recipientContext = await browser.newContext(),
    recipient = await recipientContext.newPage();
  try {
    await login(recipient, f.patient, "professional");
    await recipient.goto("/fichas/" + f.document.id);
    await recipient
      .getByRole("button", {
        name: "Recusar pedido de cancelamento",
        exact: true,
      })
      .click();
    await editor(recipient)
      .getByRole("textbox", { name: "Motivo da recusa", exact: true })
      .fill("Recebedor mantém os materiais e recusa este pedido");
    const refusal = await review(recipient);
    await refusal
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(refusal).toHaveCount(0);
    await withdrawal
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(withdrawal).toHaveCount(0);
    await expect(reason).toHaveValue(
      "Justificativa própria preservada para retirar o pedido",
    );
    await expect(
      editor(page).getByRole("button", {
        name: "Revisar operação",
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByRole("button", {
        name: "Consultar pedido e referências atuais",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Pedido atual: Recusado pelo recebedor", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Mostrar resultado atual do pedido",
        exact: true,
      })
      .click();
    await expect(
      cancellation(page).getByText("Recusado pelo recebedor", { exact: true }),
    ).toBeVisible();
    expect(ledger(f.patient)).toBe(before);
    await page
      .getByRole("button", { name: "Solicitar cancelamento", exact: true })
      .click();
    await editor(page)
      .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
      .fill("Novo pedido fictício separado da decisão anterior");
    const next = await review(page);
    await next
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(next).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Retirar meu pedido de cancelamento",
        exact: true,
      })
      .click();
    await editor(page)
      .getByRole("textbox", { name: "Motivo da retirada", exact: true })
      .fill("Solicitante retirou somente o pedido novo");
    const current = await review(page);
    await current
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await expect(current).toHaveCount(0);
    await expect(
      cancellation(page).getByText("Retirado pelo solicitante", {
        exact: true,
      }),
    ).toBeVisible();
    const result = (await rpc(f.admin, "operational_document", {
      p_id: f.document.id,
    })) as SupplyDocument;
    expect(result.status).toBe("confirmed");
    expect(result.deliveryCancellation?.request.id).not.toBe(requestId);
    expect(result.deliveryCancellation?.history[0].status).toBe("refused");
    expect(result.deliveryCancellation?.history[0].outcome?.actorId).toBe(
      fixtures.professional.id,
    );
    expect(result.deliveryCancellation?.request.outcome?.actorId).toBe(
      fixtures.adminA.id,
    );
    expect(ledger(f.patient)).toBe(before);
  } finally {
    await recipientContext.close();
  }
});

test("ENT compara nova fonte de consumo na mesma versão, preserva a devolução e exige outra revisão", async ({
  page,
}) => {
  const f = await prepared({ request: true });
  await login(page, f.patient, "professional");
  await page.goto("/fichas/" + f.document.id);
  await page
    .getByRole("button", {
      name: "Consentir e reconciliar cancelamento",
      exact: true,
    })
    .click();
  await returnField(page).fill("1");
  await editor(page)
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill("Conciliação própria com fonte revisada");
  const original = await review(page);
  await consume(f);
  const stock = ledger(f.patient),
    payloads: {
      expectedVersion: number;
      idempotencyKey: string;
      body: { referenceHash: string };
    }[] = [];
  await page.route("**/api/documents/" + f.document.id, async (route) => {
    if (route.request().method() === "POST")
      payloads.push(route.request().postDataJSON());
    await route.continue();
  });
  await original
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(original).toHaveCount(0);
  await expect(returnField(page)).toHaveValue("1");
  await page
    .getByRole("button", {
      name: "Consultar pedido e referências atuais",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Consumo disponível revisado: 1 unidade · Atual: 2 unidade",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Usar referência atual e revisar novamente",
      exact: true,
    })
    .click();
  await expect(returnField(page)).toHaveValue("1");
  await expect(returnField(page)).toBeFocused();
  await returnField(page).fill("0");
  const current = await review(page);
  await expect(
    current.getByText("consumo já confirmado referenciado 2 unidade", {
      exact: false,
    }),
  ).toBeVisible();
  await current
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(current).toHaveCount(0);
  expect(payloads).toHaveLength(2);
  expect(payloads[0].expectedVersion).toBe(payloads[1].expectedVersion);
  expect(payloads[0].idempotencyKey).not.toBe(payloads[1].idempotencyKey);
  expect(payloads[0].body.referenceHash).not.toBe(
    payloads[1].body.referenceHash,
  );
  expect(ledger(f.patient)).toBe(stock);
  const result = (await rpc(f.professional, "operational_document", {
    p_id: f.document.id,
  })) as SupplyDocument;
  expect(
    result.deliveryCancellation?.lines[0].consumptionReferences,
  ).toHaveLength(2);
  expect(typeof result.deliveryCancellation?.lines[0].returnQuantity).toBe(
    "string",
  );
  expect(Number(result.deliveryCancellation?.lines[0].returnQuantity)).toBe(0);
  expect(Number(result.deliveryCancellation?.lines[0].consumedQuantity)).toBe(
    2,
  );
});

test("ENT mantém pedido e trânsito parcial até conciliação real, sem oferecer recebimento por administrador alheio", async ({
  page,
}) => {
  const f = await prepared({ request: true, partial: true }),
    before = ledger(f.patient);
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + f.document.id);
  await expect(
    page.getByRole("button", {
      name: "Consentir e reconciliar cancelamento",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    cancellation(page).getByText("Há material em trânsito sem conciliação.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Conciliar divergência", exact: true })
    .click();
  const resolution = editor(page).getByRole("combobox", {
    name: "Resolução",
    exact: true,
  });
  await expect(resolution.locator('option[value="received"]')).toHaveCount(0);
  await resolution.selectOption("returned");
  await editor(page)
    .getByRole("textbox", {
      name: "Quantidade conciliada neste ato",
      exact: true,
    })
    .fill("1");
  await editor(page)
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill("Unidade em trânsito retornou fisicamente à custódia de origem");
  const decision = await review(page);
  await decision
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(decision).toHaveCount(0);
  await expect(
    cancellation(page).getByRole("heading", {
      name: "Pedido de cancelamento vigente",
      exact: true,
    }),
  ).toBeVisible();
  expect(ledger(f.patient)).not.toBe(before);
  const result = (await rpc(f.admin, "operational_document", {
    p_id: f.document.id,
  })) as SupplyDocument;
  expect(result.status).toBe("cancellation_pending");
  expect(typeof result.deliveryCancellation?.unresolvedTransit).toBe("string");
  expect(Number(result.deliveryCancellation?.unresolvedTransit)).toBe(0);
  expect(result.deliveryCancellation?.request.id).toBe(
    f.document.deliveryCancellation?.request.id,
  );
  expect(Number(result.lines[0].accepted_quantity)).toBe(2);
  expect(Number(result.lines[0].reconciled_quantity)).toBe(1);
});

test("ENT atualiza uma fonte indisponível por consulta e comparação, preservando a justificativa própria", async ({
  page,
}) => {
  const f = await prepared({ request: true }),
    before = ledger(f.patient);
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'stock.team.read',${sqlLiteral(fixtures.professional.id)},false);`,
  );
  await login(page, f.patient, "professional");
  await page.goto("/fichas/" + f.document.id);
  await expect(
    cancellation(page).getByText(
      "As referências de consumo não estão disponíveis para o seu acesso atual.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Consentir e reconciliar cancelamento",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Recusar pedido de cancelamento",
      exact: true,
    })
    .click();
  const reason = editor(page).getByRole("textbox", {
    name: "Motivo da recusa",
    exact: true,
  });
  await reason.fill(
    "Justificativa própria preservada durante atualização da fonte",
  );
  sql(
    `update public.capability_overrides set enabled=true where care_recipient_id=${sqlLiteral(f.patient)} and subject_user=${sqlLiteral(fixtures.professional.id)} and capability='stock.team.read';`,
  );
  await cancellation(page)
    .getByRole("button", { name: "Atualizar referências", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Comparação da conciliação",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Usar referência atual e revisar novamente",
      exact: true,
    })
    .click();
  await expect(reason).toHaveValue(
    "Justificativa própria preservada durante atualização da fonte",
  );
  await expect(reason).toBeFocused();
  await expect(
    cancellation(page).getByText(
      "As referências de consumo não estão disponíveis para o seu acesso atual.",
      { exact: false },
    ),
  ).toHaveCount(0);
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  await editor(page)
    .getByRole("button", { name: "Fechar ação", exact: true })
    .click();
  expect(ledger(f.patient)).toBe(before);
  const current = (await rpc(f.professional, "operational_document", {
    p_id: f.document.id,
  })) as SupplyDocument;
  expect(current.status).toBe("cancellation_pending");
  expect(current.deliveryCancellation?.request.outcome).toBeUndefined();
});
