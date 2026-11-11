import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { purchaseEntrySource, purchaseId } from "./support/purchase-entry-balance-fixtures";
import { fidelityEmission } from "./support/pdf-fidelity-fixtures";
const emission = { ...fidelityEmission, rendererRevision: 13 as const };
const compact = (value: string) => value.normalize("NFKC").replaceAll(/\s/g, "");

it("COM V13 prints per-material historical balance, its validation and separate parcels without replacing cumulative quantities", async () => {
  const { source, facts } = purchaseEntrySource();
  const plan = await composeIssuance(source, "a".repeat(64), emission);
  expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(true);
  const text = compact((await PDF.load(plan.bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
  for (const value of ["SALDO APÓS ENTRADA", "38,125", "34", "3,125", "4", "2,125", "PARCELA 1", "PARCELA 2", "Responsável pela validação 1", "Responsável pela validação 2", "11/11/2026, 08:30", "11/11/2026, 09:30"])
    expect(text).toContain(compact(value));
  expect(plan.semanticFacts!["purchase-entry/" + facts[0].lineId + "/3"]).toBe("38,125 un");
  const altered = structuredClone(source);
  altered.purchaseEntryBalances = [{ ...facts[0], quantity: "39.125" }, facts[1]];
  const wrong = await composeIssuance(altered, "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, wrong)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf", { recursive: true });
  writeFileSync("output/pdf/com-entry-balances-controlled.pdf", plan.bytes);
}, 30000);

it("COM V13 prints restricted, unavailable and no-entry states explicitly and refuses a foreign cutoff", async () => {
  const { source, facts } = purchaseEntrySource();
  source.purchaseEntryBalances = [{ ...facts[0], state: "restricted", quantity: null },
    { ...facts[1], state: "unavailable", quantity: null }];
  const plan = await composeIssuance(source, "a".repeat(64), emission);
  expect(plan.semanticFacts!["purchase-entry/" + facts[0].lineId + "/3"]).toBe("Acesso restrito");
  expect(plan.semanticFacts!["purchase-entry/" + facts[1].lineId + "/3"]).toBe("Não disponível no registro");
  expect(plan.runs.some(run => run.text.includes("38,125"))).toBe(false);
  source.lines[0].accepted_quantity = "0";
  source.purchaseReceipts = [];
  source.purchaseEntryBalances = [{ lineId: facts[0].lineId, state: "not_validated", quantity: null, entry: null },
    { ...facts[1], state: "unavailable", quantity: null, entry: null }];
  const absent = await composeIssuance(source, "a".repeat(64), emission);
  expect(absent.semanticFacts!["purchase-entry/" + facts[0].lineId + "/3"]).toBe("Sem entrada validada");
  source.purchaseEntryBalances = [{ ...facts[0], entry: { ...facts[0].entry!, eventId: purchaseId(99) } }, facts[1]];
  await expect(composeIssuance(source, "a".repeat(64), emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
}, 30000);
