import { expect, it } from "vitest";
import { requirePurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import { purchaseEntrySource, purchaseId } from "./support/purchase-entry-balance-fixtures";

it("keeps decimal historical stock distinct from cumulative accepted and the last parcel, with each material's date", () => {
  const { facts, scope } = purchaseEntrySource();
  expect(requirePurchaseEntryBalances(facts, scope)).toEqual(facts);
  expect(facts[0].quantity).toBe("38.125");
  expect(facts[0].entry!.enteredQuantity).toBe("2.125");
  expect(scope.lines[0].accepted_quantity).toBe("3.125");
  expect(facts[0].entry!.validatedAt).not.toBe(facts[1].entry!.validatedAt);
  const restricted = facts.map(fact => ({ ...fact, state: "restricted", quantity: null }));
  expect(requirePurchaseEntryBalances(restricted, scope)).toEqual(restricted);
});

it("rejects foreign, repeated, future, incomplete or contradictory reporting facts", () => {
  const { facts, scope } = purchaseEntrySource();
  const variants = [facts.slice(0, 1), [...facts, facts[0]],
    [{ ...facts[0], lineId: purchaseId(99) }, facts[1]],
    [{ ...facts[0], entry: { ...facts[0].entry!, receiptId: purchaseId(99) } }, facts[1]],
    [{ ...facts[0], entry: { ...facts[0].entry!, eventVersion: 99 } }, facts[1]],
    [{ ...facts[0], entry: { ...facts[0].entry!, eventId: purchaseId(99) } }, facts[1]],
    [{ ...facts[0], entry: { ...facts[0].entry!, enteredQuantity: "3.125" } }, facts[1]],
    [{ ...facts[0], entry: { ...facts[0].entry!, validatedAt: facts[1].entry!.validatedAt } }, facts[1]],
    [{ ...facts[0], state: "restricted" }, facts[1]],
    [{ lineId: facts[0].lineId, state: "not_validated", quantity: null, entry: null }, facts[1]],
  ];
  for (const value of variants) expect(() => requirePurchaseEntryBalances(value, scope)).toThrow();
});

it("distinguishes no validated entry from missing historical stock without inventing zero", () => {
  const { facts, scope } = purchaseEntrySource();
  const noEntry = [{ lineId: facts[0].lineId, state: "not_validated", quantity: null, entry: null },
    { ...facts[1], state: "unavailable", quantity: null }];
  scope.lines[0].accepted_quantity = "0";
  expect(() => requirePurchaseEntryBalances(noEntry, scope)).toThrow();
  scope.receipts = scope.receipts.filter(receipt => !receipt.lines.some(line => line.lineId === facts[0].lineId));
  expect(requirePurchaseEntryBalances(noEntry, scope)).toEqual(noEntry);
  expect(() => requirePurchaseEntryBalances([{ ...facts[0], state: "unavailable" }, facts[1]], scope)).toThrow();
});
