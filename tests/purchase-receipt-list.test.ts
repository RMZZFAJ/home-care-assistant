import { expect, it } from "vitest";
import { purchaseReceiptRows } from "../src/lib/documents/purchase-receipt-list";
import type { PurchaseReceipt } from "../src/types/documents";

const lines = [{ id: "line", name_snapshot: "Solução fisiológica" }];
const receipt = (id: string, created_at: string, state: PurchaseReceipt["state"] = "pending"): PurchaseReceipt => ({
  id, created_at, state, submitted_by: "author", submitted_name: "Juliana preservada",
  lines: [{ lineId: "line", quantity: "2.000000" }],
});
const old = receipt("old", "2026-11-10T23:00:00Z");
const first = receipt("a", "2026-11-11T05:00:00Z", "approved");
const last = receipt("b", "2026-11-11T08:00:00+03:00");
const all = { query: "", state: "" as const };

it("orders real instants and ties by identity without mutating the source", () => {
  const source = Object.freeze([last, old, first]);
  expect(purchaseReceiptRows(source, lines, all).map(row => row.receipt.id)).toEqual(["old", "a", "b"]);
  expect(source.map(row => row.id)).toEqual(["b", "old", "a"]);
});
it("retains the original ordinal when filtering decisions", () => {
  expect(purchaseReceiptRows([last, first, old], lines, { ...all, state: "pending" }).map(row => [row.receipt.id, row.ordinal])).toEqual([["old", 1], ["b", 3]]);
});
it("numeric search selects the receipt ordinal instead of digits in every identity", () => {
  expect(purchaseReceiptRows([last, first, old], lines, { ...all, query: "3" }).map(row => row.receipt.id)).toEqual(["b"]);
  expect(purchaseReceiptRows([last, first, old], lines, { ...all, query: "01" }).map(row => row.receipt.id)).toEqual(["old"]);
});
it("finds material and preserved author across accents and case", () => {
  expect(purchaseReceiptRows([old], lines, { ...all, query: "solucao JULIANA" })).toHaveLength(1);
  expect(purchaseReceiptRows([old], lines, { ...all, query: "outro material" })).toEqual([]);
});
it("keeps state and text filters together and permits an empty selection", () => {
  expect(purchaseReceiptRows([old, first], lines, { query: "validada", state: "pending" })).toEqual([]);
  expect(purchaseReceiptRows([old, first], lines, { query: "validada", state: "approved" }).map(row => row.receipt.id)).toEqual(["a"]);
});
it("searches a recorded decision without rewriting declaration quantities or authorship", () => {
  const rejected = { ...last, state: "rejected" as const, reason: "Embalagem recusada", validated_name: "Supervisão preservada" };
  const found = purchaseReceiptRows([rejected], lines, { ...all, query: "supervisao embalagem" });
  expect(found[0].receipt).toBe(rejected);
  expect(found[0].receipt.lines).toEqual([{ lineId: "line", quantity: "2.000000" }]);
  expect(found[0].receipt.submitted_name).toBe("Juliana preservada");
});
