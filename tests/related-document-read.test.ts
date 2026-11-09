import { describe, expect, it } from "vitest";
import { parseRelatedSupplyRead } from "../src/lib/validation/related-document";

const id = "10000000-0000-4000-8000-000000000001";
const value = () => ({ data: { id, type: "ENT", status: "pending_receipt", code: "000001", created_at: "2026-11-08T12:00:00+00:00", lines: [{
  id, product_id: "legacy-text-id", name_snapshot: "Material", unit_snapshot: "mL", category_snapshot: "Insumo",
  quantity: "10.123456", approved_quantity: 0, purchased_quantity: "0", accepted_quantity: "2.123456", reconciled_quantity: "0",
  fully_checked: false, metadata: { issueOpen: true }, requisitionItemIds: [id],
}] } });
const parse = (body: unknown) => parseRelatedSupplyRead(body, id, "ENT");

describe("related supply read boundary", () => {
  it("preserves snapshots, units, leading-zero codes and exact decimals from the authorized response", () => {
    expect(parse(value()).data).toMatchObject({ code: "000001", lines: [{ product_id: "legacy-text-id", unit_snapshot: "mL", quantity: "10.123456", accepted_quantity: "2.123456", approved_quantity: "0" }] });
  });
  it("rejects a different document or type rather than displaying unrelated facts", () => {
    expect(() => parse({ data: { ...value().data, id: "20000000-0000-4000-8000-000000000001" } })).toThrow("não corresponde");
    expect(() => parse({ data: { ...value().data, type: "BAL" } })).toThrow("não corresponde");
  });
  it("fails closed on missing facts, malformed lines and invalid quantities without exposing decoder details", () => {
    for (const body of [null, { data: null }, { data: { ...value().data, lines: [{}] } }, { data: { ...value().data, lines: [{ ...value().data.lines[0], accepted_quantity: "NaN" }] } }])
      expect(() => parse(body)).toThrow("A ficha consultada não corresponde à referência. Atualize esta consulta.");
  });
  it("distinguishes a pending transfer declaration from an actual dispatch without manufacturing a transfer", () => {
    expect(parse(value()).data.transfer).toBeUndefined();
    for (const state of ["pending", "agreed", "declined", "withdrawn", "dispatched"])
      expect(parse({ data: { ...value().data, transfer: { state } } }).data.transfer?.state).toBe(state);
    expect(() => parse({ data: { ...value().data, transfer: { state: "unknown" } } })).toThrow("não corresponde");
  });
});
