import { expect, test, type Page } from "@playwright/test";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import {
  decisionFixture,
  decisionFacts,
  decisionReason,
  send,
} from "../integration/com-decision-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { openDocumentMore } from "./document-sections";
import { audit } from "./accessibility-audit";
test.setTimeout(180000);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string, label: string, more = false) {
  await page.goto(`/documentos/${id}`);
  if (more) await openDocumentMore(page);
  await page.getByRole("button", { name: label, exact: true }).click();
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/drafts" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  expect((await response).ok()).toBe(true);
}
const credit = (patient: string, value: number) =>
  sql(
    `select coalesce(sum(quantity),0)=${value} from public.stock_movements where care_recipient_id=${sqlLiteral(patient)} and reference_type='purchase_receipt';`,
  );

for (const purpose of ["validate_receipt", "reject_receipt"] as const)
  test(`COM ${purpose} retoma a parcela exata em outra sessão sem trocar seleção nem duplicar estoque`, async ({
    page,
    browser,
  }, info) => {
    const f = await decisionFixture(),
      label =
        purpose === "validate_receipt"
          ? "Validar recebimento"
          : "Rejeitar recebimento";
    await login(page, f.patient);
    await open(page, f.document.id, label);
    const before = decisionFacts(f);
    await expect(page.getByRole("combobox", { name: "Recebimento pendente", exact: true }).locator("option")).toHaveText([/^Parcela 1\b/, /^Parcela 2\b/]);
    await page
      .getByRole("combobox", { name: "Recebimento pendente", exact: true })
      .selectOption(f.secondReceipt.id);
    if (purpose === "reject_receipt")
      await page
        .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
        .fill(decisionReason);
    await save(page);
    expect(decisionFacts(f)).toBe(before);
    if (purpose === "reject_receipt")
      await send(f.admin, f.document, "validate_receipt", {
        receiptId: f.secondReceipt.id,
      });
    const peerContext = await browser.newContext({
      baseURL: info.project.use.baseURL,
      viewport: page.viewportSize() ?? undefined,
    });
    try {
      const peer = await peerContext.newPage();
      await login(peer, f.patient);
      await open(peer, f.document.id, label);
      const privateSummary = peer.getByRole("region", { name: "Rascunho privado", exact: true });
      await expect(privateSummary.getByText("Parcela no preenchimento", { exact: true })).toBeVisible();
      await expect(privateSummary).toContainText("Teste family");
      await expect(privateSummary.getByText(/^Parcela 2 · Teste family/)).toBeVisible();
      await expect(privateSummary).not.toContainText("receiptId");
      await peer
        .getByRole("button", { name: "Continuar rascunho", exact: true })
        .click();
      const selection = peer.getByRole("combobox", { name: "Recebimento pendente", exact: true });
      await expect(selection).toHaveValue(f.secondReceipt.id);
      let selected = f.secondReceipt.id;
      if (purpose === "reject_receipt") {
        await expect(selection.locator("option:checked")).toHaveText(
          "Parcela preservada indisponível para esta decisão",
        );
        await expect(
          peer.getByRole("textbox", {
            name: "Motivo / justificativa",
            exact: true,
          }),
        ).toHaveValue(decisionReason);
        await peer
          .getByRole("button", {
            name: "Comparar referência da operação",
            exact: true,
          })
          .click();
        await peer
          .getByRole("button", {
            name: "Usar referência vigente e manter preenchimento",
            exact: true,
          })
          .click();
        await expect(selection).toHaveValue(f.secondReceipt.id);
        await peer
          .getByRole("button", { name: "Revisar operação", exact: true })
          .click();
        await expect(
          peer.getByRole("dialog", {
            name: "Revisar operação definitiva",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(
          peer.getByText("Selecione uma parcela pendente para conferir.", {
            exact: true,
          }),
        ).toBeVisible();
        await selection.selectOption(f.firstReceipt.id);
        selected = f.firstReceipt.id;
      } else expect(decisionFacts(f)).toBe(before);
      await audit(peer, "COM private receipt selection " + purpose);
      const requests: Record<string, unknown>[] = [];
      let dropped = false;
      await peer.route(`**/api/documents/${f.document.id}`, async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        requests.push(route.request().postDataJSON());
        if (purpose === "validate_receipt" && !dropped) {
          dropped = true;
          const response = await route.fetch();
          expect(response.ok()).toBe(true);
          return route.abort("failed");
        }
        return route.continue();
      });
      const prior = decisionFacts(f);
      await peer
        .getByRole("button", { name: "Revisar operação", exact: true })
        .click();
      const review = peer.getByRole("dialog", {
        name: "Revisar operação definitiva",
        exact: true,
      });
      await review
        .getByRole("button", { name: "Confirmar operação", exact: true })
        .click();
      if (purpose === "validate_receipt") {
        await expect(
          review.getByRole("button", {
            name: "Recuperar tentativa",
            exact: true,
          }),
        ).toBeVisible();
        const committed = decisionFacts(f);
        await peer.reload();
        await peer.getByRole("button", { name: label, exact: true }).click();
        await peer
          .getByRole("button", {
            name: "Confirmar resultado e começar novo preenchimento",
            exact: true,
          })
          .click();
        await expect(
          peer.getByRole("combobox", {
            name: "Recebimento pendente",
            exact: true,
          }),
        ).toHaveValue(f.firstReceipt.id);
        expect(decisionFacts(f)).toBe(committed);
      } else {
        await expect(review).toHaveCount(0);
        expect(decisionFacts(f)).not.toBe(prior);
      }
      expect(requests).toHaveLength(1);
      expect(requests[0].body).toMatchObject({ receiptId: selected });
      expect(requests[0].draftCommit).toBeTruthy();
      const actual = await rpc(f.admin, "operational_document", {
        p_id: f.document.id,
      });
      expect(
        actual.receipts.find((r: { id: string }) => r.id === f.secondReceipt.id)
          .state,
      ).toBe("approved");
      expect(
        actual.receipts.find((r: { id: string }) => r.id === f.firstReceipt.id)
          .state,
      ).toBe(purpose === "validate_receipt" ? "pending" : "rejected");
      expect(credit(f.patient, 2)).toBe("t");
    } finally {
      await peerContext.close();
    }
  });

test("COM só adota referência oficial conferida e exige nova confirmação de expectativa após mudança de versão", async ({
  page,
}, info) => {
  const f = await decisionFixture();
  await login(page, f.patient);
  await open(page, f.document.id, "Encerrar expectativa restante", true);
  const confirm = page.getByRole("checkbox", {
    name: /Conferi o resumo e confirmo dispensar/,
  });
  await page
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill(decisionReason);
  await confirm.check();
  const before = decisionFacts(f);
  await save(page);
  expect(decisionFacts(f)).toBe(before);
  const newer = await send(f.family, f.document, "purchase", {
    lines: [{ lineId: f.document.lines[0].id, quantity: "1" }],
  });
  let mode = "denied";
  await page.route(`**/api/documents/${f.document.id}/history?*`, (route) =>
    mode === "denied"
      ? route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            code: "FORBIDDEN",
            error: "Consulta de teste recusada",
          }),
        })
      : mode === "malformed"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: { documentId: "outro" } }),
          })
        : route.continue(),
  );
  await open(page, f.document.id, "Encerrar expectativa restante", true);
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(confirm).toBeChecked();
  await page
    .getByRole("button", {
      name: "Comparar referência da operação",
      exact: true,
    })
    .click();
  const comparison = page.getByRole("region", {
      name: "Fatos oficiais das referências da operação",
      exact: true,
    }),
    adopt = page.getByRole("button", {
      name: "Usar referência vigente e manter preenchimento",
      exact: true,
    });
  await expect(
    comparison.getByText(/Não foi possível conferir as referências oficiais/),
  ).toBeVisible();
  await expect(adopt).toBeDisabled();
  await expect(comparison.getByRole("article")).toHaveCount(0);
  mode = "malformed";
  await comparison
    .getByRole("button", {
      name: "Consultar novamente as referências da operação",
      exact: true,
    })
    .click();
  await expect(
    comparison.getByText(/A resposta do histórico não pôde ser conferida/),
  ).toBeVisible();
  await expect(adopt).toBeDisabled();
  await expect(confirm).toBeChecked();
  mode = "pass";
  await comparison
    .getByRole("button", {
      name: "Consultar novamente as referências da operação",
      exact: true,
    })
    .click();
  await expect(
    comparison.getByRole("article", {
      name: `Conteúdo preservado da versão ${f.document.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    comparison.getByRole("article", {
      name: `Conteúdo preservado da versão ${newer.version}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("historyVersion")).toBe(false);
  await audit(page, "COM exact official draft comparison");
  await info.attach("comparacao-oficial-operacao-com", {
    body: await page.screenshot({ fullPage: false, animations: "disabled" }),
    contentType: "image/png",
  });
  const afterChange = decisionFacts(f);
  await adopt.click();
  await expect(confirm).not.toBeChecked();
  await expect(
    page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }),
  ).toHaveValue(decisionReason);
  expect(decisionFacts(f)).toBe(afterChange);
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await confirm.check();
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar encerramento da expectativa",
    exact: true,
  });
  await review
    .getByRole("button", {
      name: "Confirmar encerramento da expectativa",
      exact: true,
    })
    .click();
  await expect(review).toHaveCount(0);
  expect(
    sql(
      `select purchased_quantity=5 and waived_quantity=5 from public.document_lines where document_id=${sqlLiteral(f.document.id)};`,
    ),
  ).toBe("t");
  expect(credit(f.patient, 0)).toBe("t");
});

test("COM recupera motivo de cancelamento e fechar a revisão preserva ficha e rascunho antes de confirmar", async ({
  page,
}) => {
  const f = await decisionFixture(false);
  await login(page, f.patient);
  await open(page, f.document.id, "Solicitar cancelamento", true);
  const before = decisionFacts(f);
  await page
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill(decisionReason);
  await save(page);
  await open(page, f.document.id, "Solicitar cancelamento", true);
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }),
  ).toHaveValue(decisionReason);
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Revisar operação definitiva",
    exact: true,
  });
  await expect(review).toBeVisible();
  await review.press("Escape");
  await expect(review).toHaveCount(0);
  expect(decisionFacts(f)).toBe(before);
  await page
    .getByRole("button", { name: "Revisar operação", exact: true })
    .click();
  await review
    .getByRole("button", { name: "Confirmar operação", exact: true })
    .click();
  await expect(review).toHaveCount(0);
  expect(
    (await rpc(f.admin, "operational_document", { p_id: f.document.id }))
      .status,
  ).toBe("cancelled");
  expect(credit(f.patient, 0)).toBe("t");
});

test("COM conserva desmarcação de confirmação salva ao retomar o rascunho", async ({
  page,
}) => {
  const f = await decisionFixture();
  await login(page, f.patient);
  await open(page, f.document.id, "Encerrar expectativa restante", true);
  const checkbox = page.getByRole("checkbox", {
    name: /Conferi o resumo e confirmo dispensar/,
  });
  await page
    .getByRole("textbox", { name: "Motivo / justificativa", exact: true })
    .fill(decisionReason);
  await checkbox.check();
  const before = decisionFacts(f);
  await save(page);
  await open(page, f.document.id, "Encerrar expectativa restante", true);
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await save(page);
  const response = await page.request.get(
    `/api/drafts?careRecipientId=${f.patient}&kind=COM&purpose=close_expectation&targetDocumentId=${f.document.id}`,
  );
  expect(response.ok()).toBe(true);
  expect((await response.json()).data.content.fields.confirmed).not.toBe("on");
  await open(page, f.document.id, "Encerrar expectativa restante", true);
  await page
    .getByRole("button", { name: "Continuar rascunho", exact: true })
    .click();
  await expect(checkbox).not.toBeChecked();
  expect(decisionFacts(f)).toBe(before);
});
