import { expect, it } from "vitest";
import { parseDeliveryListRead } from "../src/lib/validation/document-list";

const id = "10000000-0000-4000-8000-000000000001", other = "10000000-0000-4000-8000-000000000002";
const scope = { careRecipientId: id, scope: "own", status: "tasks", page: 1, pageSize: 20 };
const row = { id, type: "ENT", version: 1, code: "ENT-1", protocol: "HC-1", status: "pending_receipt", created_at: "2026-11-11T06:00:00Z", recipient_id: other, document_lines: [], task: { code: "receive", label: "Conferir recebimento pessoal" } };
const body = { careRecipientId: id, filters: { scope: "own", status: "tasks" }, page: 1, pageSize: 20, total: 1, data: [row] };
it("accepts authorized personal tasks without deriving authority from the recipient ID", () => {
  expect(parseDeliveryListRead(body, scope).data[0].recipient_id).toBe(other);
});
it("accepts the unshipped transfer task without inventing its protocol", () => {
  expect(parseDeliveryListRead({ ...body, data: [{ ...row, code: null, protocol: null, status: "transfer_pending", task: { code: "transfer_decision", label: "Decidir concordância da transferência" } }] }, scope).data[0].protocol).toBeNull();
});
it("rejects missing or inconsistent totals and repeated identity", () => {
  for (const value of [{ data: [] }, { ...body, total: undefined }, { ...body, total: 0 }, { ...body, total: 2, data: [row, row] }]) expect(() => parseDeliveryListRead(value, scope)).toThrow("resposta");
});
it("rejects another patient,page,size,scope or status instead of changing current selection", () => {
  for (const value of [{ ...body, careRecipientId: other }, { ...body, page: 2 }, { ...body, pageSize: 100 }, { ...body, filters: { scope: "team", status: "pending_receipt" } }, { ...body, filters: { scope: "own", status: "confirmed" } }]) expect(() => parseDeliveryListRead(value, scope)).toThrow("resposta");
});
it("rejects non-ENT rows and unsupported task scope but accepts a genuine empty page", () => {
  expect(() => parseDeliveryListRead({ ...body, data: [{ ...row, type: "COM" }] }, scope)).toThrow("resposta");
  expect(() => parseDeliveryListRead({ ...body, filters: { scope: "team", status: "tasks" } }, { ...scope, scope: "team" })).toThrow("resposta");
  expect(parseDeliveryListRead({ ...body, total: 0, data: [] }, scope).data).toEqual([]);
});
