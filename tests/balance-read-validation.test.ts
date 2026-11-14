import { expect, it } from "vitest";
import { parseBalanceCountReference, parseBalanceCountReview } from "@/lib/validation/balances";

const patient = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const reference = { careRecipientId: patient, data: { revision: "123", quantities: { material: "-0.000001" } } };
const review = { careRecipientId: patient, data: { referenceRevision: "123", eligibility: { available: true, assignment: { id: other } } } };

it("preserves the scoped native BAL reference, including signed and zero values", () => {
  expect(parseBalanceCountReference(reference, patient)).toEqual(reference);
  expect(parseBalanceCountReference({ ...reference, data: { revision: "0", quantities: {} } }, patient).data.quantities).toEqual({});
  expect(parseBalanceCountReview(review, patient)).toEqual(review);
  expect(parseBalanceCountReview({ ...review, data: { ...review.data, eligibility: { available: false, assignment: null } } }, patient).data.eligibility.available).toBe(false);
});
it.each([
  {}, { ...reference, careRecipientId: other }, { ...reference, data: { revision: "123" } },
  { ...reference, data: { revision: 123, quantities: {} } },
  { ...reference, data: { revision: "123", quantities: { material: "NaN" } } },
  { ...reference, data: { revision: "123", quantities: { material: null } } },
])("refuses an unreadable or foreign BAL stock reference %j", value => {
  expect(() => parseBalanceCountReference(value, patient)).toThrow(/referência/);
});
it.each([
  {}, { ...review, careRecipientId: other },
  { ...review, data: { ...review.data, eligibility: {} } },
  { ...review, data: { ...review.data, eligibility: { available: "unknown", assignment: null } } },
  { ...review, data: { ...review.data, eligibility: { available: true, assignment: { id: "missing" } } } },
])("refuses an incomplete BAL review state %j", value => {
  expect(() => parseBalanceCountReview(value, patient)).toThrow(/disponibilidade/);
});
