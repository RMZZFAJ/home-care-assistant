import { describe, expect, it } from "vitest";
import { parseStockBalances, parseStockHistory } from "@/lib/validation/stock-reads";

const patient = "11111111-1111-4111-8111-111111111111";
const movementId = "22222222-2222-4222-8222-222222222222";
const instant = "2026-11-10T09:12:03.123456+00:00";
const custody = { confirmed: "-0.000001", incoming: "2.000000", minimum: null };
const product = { productId: "fralda", name: "Material histórico", unit: "unidade", decimals: 0, active: false,
  family: { ...custody, purchasePending: "3" }, team: null, disputed: "0" };
const balances = { careRecipientId: patient, custody: "FAMILY", data: [{ product_id: "fralda", location: "FAMILY", balance: -0.000001 }],
  overview: [product], transit: [], metrics: [{ productId: "fralda", location: "FAMILY", quantity: "1", averagePerDay: "0.03333333333333333333" }], updatedAt: instant };
const balanceScope = { careRecipientId: patient, custody: "FAMILY" };
const movement = { id: movementId, product_id: "fralda", quantity: "0.000001", source_location: null, destination_location: "FAMILY",
  justification: "Motivo histórico", created_at: instant, reference_type: "family_manual", reference_id: null };
const history = { careRecipientId: patient, data: [movement], balances: balances.data,
  total: 1, page: 1, pageSize: 20, filters: { productId: null, location: "FAMILY", from: null, to: null } };
const historyScope = { careRecipientId: patient, page: 1, pageSize: 20, productId: "", location: "FAMILY", from: "", to: "" };

describe("verified stock read models", () => {
  it("preserves signed legacy balances, missing custody, inactive identities and unrounded averages", () => {
    const result = parseStockBalances(balances, balanceScope);
    expect(result.overview[0]).toEqual({ ...product, family: { ...product.family, incoming: "2" } });
    expect(result.metrics[0].averagePerDay).toBe("0.03333333333333333333");
    expect(parseStockBalances({ ...balances, overview: [{ ...product, family: null, team: custody }] }, balanceScope).overview[0].family).toBeNull();
  });
  it.each([
    {}, { ...balances, overview: null },
    { ...balances, overview: [{ ...product, family: { ...custody } }] },
    { ...balances, overview: [{ ...product, disputed: "NaN" }] },
    { ...balances, metrics: [{ ...balances.metrics[0], averagePerDay: Infinity }] },
    { ...balances, updatedAt: "data desconhecida" },
    { ...balances, careRecipientId: movementId }, { ...balances, custody: "TRANSIT" },
    { ...balances, overview: [product, product] },
    { ...balances, data: [balances.data[0], balances.data[0]] },
  ])("rejects incomplete, invalid or mismatched balance data %j", value => {
    expect(() => parseStockBalances(value, balanceScope)).toThrow(/resposta/);
  });
  it("accepts explicit empty reads and distinguishes a configured zero minimum", () => {
    expect(parseStockBalances({ ...balances, data: [], overview: [], metrics: [] }, balanceScope).overview).toEqual([]);
    expect(parseStockBalances({ ...balances, overview: [{ ...product, family: { ...product.family, minimum: 0 } }] }, balanceScope).overview[0].family?.minimum).toBe("0");
  });
  it("validates transit without presenting it as confirmed stock", () => {
    const document = { id: movementId, code: "ENT-1", status: "disputed", source: "FAMILY", destination: "CARE_TEAM", createdAt: instant,
      lines: [{ productId: "fralda", name: "Material", unit: "un", dispatched: "2", accepted: "1", reconciled: "0", pending: "1", disputed: true }] };
    const read = { ...balances, custody: "TRANSIT", data: [], overview: [], metrics: [], transit: [document] };
    const scope = { ...balanceScope, custody: "TRANSIT" };
    expect(parseStockBalances(read, scope).transit[0]).toEqual(document);
    for (const transit of [[{ ...document, lines: null }], [{ ...document, destination: "FAMILY" }], [document, document]]) {
      expect(() => parseStockBalances({ ...read, transit }, scope)).toThrow();
    }
    expect(() => parseStockBalances({ ...read, overview: [product] }, scope)).toThrow();
  });
  it("keeps history quantities and optional administrative reference intact", () => {
    expect(parseStockHistory(history, historyScope).data).toEqual([movement]);
    const referenced = { ...movement, reference_type: "delivery_regularization", reference_document_id: patient };
    expect(parseStockHistory({ ...history, data: [referenced] }, historyScope).data[0]).toEqual(referenced);
    expect(parseStockHistory({ ...history, data: [], total: 0, page: 2 }, { ...historyScope, page: 2 }).data).toEqual([]);
  });
  it.each([
    {}, { ...history, data: [] }, { ...history, total: -1 }, { ...history, total: 2 },
    { ...history, total: 2, data: [movement, movement] },
    { ...history, page: 2 }, { ...history, pageSize: 30 },
    { ...history, careRecipientId: movementId },
    { ...history, filters: { ...history.filters, location: "CARE_TEAM" } },
    { ...history, filters: { ...history.filters, productId: "outro" } },
    { ...history, filters: { ...history.filters, from: "2026-11-01" } },
    { ...history, data: [{ ...movement, quantity: "Infinity" }] },
    { ...history, data: [{ ...movement, created_at: "ontem" }] },
  ])("rejects incomplete or mismatched history data %j", value => {
    expect(() => parseStockHistory(value, historyScope)).toThrow(/resposta/);
  });
});
