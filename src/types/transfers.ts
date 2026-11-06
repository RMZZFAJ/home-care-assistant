import type { Custody } from "./documents";

export type TransferPreparation = {
  patientId: string;
  actor: string;
  source: Custody;
  destination: Custody;
  referenceHash: string;
  checkedAt: string;
  people: { id: string; name: string; role: string }[];
  products: {
    id: string;
    name: string;
    category: string;
    unit: string;
    quantityDecimals: number;
    active: boolean;
    available: string;
  }[];
  origins: {
    id: string;
    code: string;
    createdAt: string;
    productIds: string[];
  }[];
  originTotal: number;
};
type Person = { id: string; name: string };
export type TransferFacts = {
  state: "pending" | "agreed" | "declined" | "withdrawn" | "dispatched";
  declaration: {
    actor: Person;
    counterparty: Person;
    recipient: Person;
    source: Custody;
    destination: Custody;
    reason: string;
    recordedAt: string;
    referenceHash: string;
  };
  agreement: {
    actor: Person;
    reason: string;
    decision: "agree" | "decline";
    recordedAt: string;
    documentVersion: number;
  } | null;
  withdrawal: {
    actor: Person;
    reason: string;
    recordedAt: string;
    kind: "initiator_withdrawal" | "administrative_close";
  } | null;
  originDocumentId: string | null;
  dispatchedAt: string | null;
  canAgree: boolean;
  canDispatch: boolean;
  canWithdraw: boolean;
};
