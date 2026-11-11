import { expect, it } from "vitest";
import { parseDocumentListRead, type DocumentListScope } from "../src/lib/validation/document-list";

const id = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const scope: DocumentListScope = { careRecipientId: id, page: 1, pageSize: 20, search: "", type: "", status: "", from: "", to: "" };
const row = { id, type: "REQ", version: 1, code: "REQ-1", protocol: "HC-1", status: "science_pending", created_at: "2026-11-11T06:00:00+00:00", recipient_id: null, fulfillment: { fulfilled: 0, total: 1 }, document_lines: null, task: null };
const body = { careRecipientId: id, page: 1, pageSize: 20, total: 1, filters: { search: null, type: null, status: null, from: null, to: null }, data: [row] };

it("accepts native nullable projections and preserves independent REQ progress", () => {
  const value = parseDocumentListRead(body, scope);
  expect(value.data[0].fulfillment).toEqual({ fulfilled: 0, total: 1 });
  expect(value.data[0].document_lines).toBeUndefined();
  expect(body.data[0].document_lines).toBeNull();
});
it("accepts unshipped documents and exact ENT line quantities without inventing a protocol", () => {
  const data = [{ ...row, type: "ENT", code: null, protocol: null, fulfillment: null, document_lines: [{ id: other, fully_checked: false, accepted_quantity: "0.000000", quantity: "2.250000" }] }];
  expect(parseDocumentListRead({ ...body, data }, scope).data[0]).toMatchObject({ protocol: null, document_lines: [{ fully_checked: false, quantity: "2.250000" }] });
});
it("requires total and scope rather than treating incomplete successful responses as empty", () => {
  for (const value of [{ data: [] }, { ...body, total: undefined }, { ...body, total: NaN }, { ...body, filters: undefined }, { ...body, careRecipientId: undefined }]) {
    expect(() => parseDocumentListRead(value, scope)).toThrow("resposta");
  }
});
it("rejects a different patient,page,size or selected filter", () => {
  for (const value of [{ ...body, careRecipientId: other }, { ...body, page: 2 }, { ...body, pageSize: 100 }, { ...body, filters: { ...body.filters, type: "BAL" } }]) {
    expect(() => parseDocumentListRead(value, scope)).toThrow("resposta");
  }
});
it("rejects missing rows,duplicated identity and impossible fulfillment without hiding unknown status labels", () => {
  for (const value of [{ ...body, total: 0 }, { ...body, total: 21 }, { ...body, total: 2, data: [row, row] }, { ...body, data: [{ ...row, fulfillment: { fulfilled: 2, total: 1 } }] }, { ...body, data: [{ ...row, id: "not-a-reference" }] }]) {
    expect(() => parseDocumentListRead(value, scope)).toThrow("resposta");
  }
  expect(parseDocumentListRead({ ...body, data: [{ ...row, status: "future_document_state" }] }, scope).data[0].status).toBe("future_document_state");
});
it("accepts a genuine empty page beyond the end and rejects truncated intermediate pages", () => {
  expect(parseDocumentListRead({ ...body, page: 2, data: [] }, { ...scope, page: 2 }).data).toEqual([]);
  expect(() => parseDocumentListRead({ ...body, total: 22, page: 2 }, { ...scope, page: 2 })).toThrow("resposta");
  expect(parseDocumentListRead({ ...body, total: 21, page: 2 }, { ...scope, page: 2 }).data).toHaveLength(1);
});
it("normalizes a selected search and accepts task filters whose status is derived", () => {
  expect(parseDocumentListRead({ ...body, filters: { ...body.filters, search: "REQ", status: "science_required" } }, { ...scope, search: " REQ ", status: "science_required" }).data[0].status).toBe("science_pending");
});
it("refuses rows of another type even with matching envelope metadata", () => {
  expect(() => parseDocumentListRead({ ...body, filters: { ...body.filters, type: "COM" } }, { ...scope, type: "COM" })).toThrow("resposta");
});
