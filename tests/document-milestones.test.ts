import { expect, it } from "vitest";
import {
  requisitionMilestones,
  supplyMilestones,
} from "../src/lib/documents/milestones";

const req = {
  historical: false,
  issued: true,
  scienceRequired: true,
  scienceSatisfied: false,
  fulfilled: 1,
  total: 2,
  state: "active",
};
const facts = {
  type: "BAL" as const,
  protocol: "BAL-teste",
  status: "approved",
  fullyCheckedLines: 0,
  totalLines: 2,
};

it("does not invent historical issuance/science or turn waived science into a receipt", () => {
  expect(
    requisitionMilestones({ ...req, historical: true }).map((m) => m.state),
  ).toEqual(["unknown", "unknown", "unknown", "unknown"]);
  expect(
    requisitionMilestones({ ...req, scienceRequired: false })[1].state,
  ).toBe("waived");
  expect(
    requisitionMilestones({
      ...req,
      state: "completed_science_pending",
      fulfilled: 2,
    })[3].state,
  ).toBe("pending");
  expect(
    requisitionMilestones({ ...req, total: 0, fulfilled: 0 })[2].state,
  ).toBe("pending");
});

it("does not complete an unissued cancelled count, stale review or a count with a new recount", () => {
  expect(
    supplyMilestones({ ...facts, protocol: null, status: "cancelled" }).map(
      (m) => m.state,
    ),
  ).toEqual(["pending", "unknown", "unknown", "closed"]);
  const review = {
    reviewRequired: false,
    referenceState: "historical" as const,
    reconciliationApplied: true,
  };
  expect(supplyMilestones({ ...facts, balanceReview: review })[3].state).toBe(
    "done",
  );
  expect(
    supplyMilestones({
      ...facts,
      balanceReview: review,
      balanceRecount: { activeAssignment: null, requiresDesignation: true },
    })[3].state,
  ).toBe("pending");
  expect(
    supplyMilestones({
      ...facts,
      balanceReview: { ...review, reconciliationApplied: false },
    })[3].state,
  ).toBe("unknown");
  expect(
    supplyMilestones({
      ...facts,
      status: "submitted",
      balanceReview: review,
    })[3].state,
  ).toBe("unknown");
});

it("keeps administrative delivery closure distinct from physical receipt", () => {
  expect(
    supplyMilestones({
      ...facts,
      type: "ENT",
      status: "administratively_closed",
    }).map((m) => m.state),
  ).toEqual(["done", "done", "unknown", "closed"]);
});

it("does not turn purchase waivers into acquisition or receipt", () => {
  const progress = {
    state: "closed",
    expectationClosed: true,
    expectationPending: false,
    physicalPending: false,
    validationPending: false,
    closure: null,
    lines: [
      {
        lineId: "line",
        name: "Material",
        unit: "unidade",
        plannedQuantity: "2",
        approvedQuantity: "2",
        purchasedQuantity: "0",
        validatedQuantity: "0",
        pendingValidationQuantity: "0",
        unarrivedQuantity: "0",
        waivedQuantity: "2",
        waivableQuantity: "0",
        remainingExpectation: "0",
      },
    ],
  };
  expect(
    supplyMilestones({ ...facts, type: "COM", purchaseProgress: progress }).map(
      (m) => m.state,
    ),
  ).toEqual(["done", "waived", "waived", "done"]);
  expect(
    supplyMilestones({
      ...facts,
      type: "COM",
      purchaseProgress: { ...progress, physicalPending: true },
    })[3].state,
  ).toBe("pending");
});

it("shows partial progress by completed lines without aggregating different units", () => {
  expect(requisitionMilestones(req)[2].percent).toBe(50);
  expect(
    requisitionMilestones({ ...req, historical: true })[2].percent,
  ).toBeUndefined();
  expect(
    supplyMilestones({
      ...facts,
      type: "ENT",
      status: "disputed",
      fullyCheckedLines: 1,
      totalLines: 2,
    })[2].percent,
  ).toBe(50);
  const line = {
    lineId: "a",
    name: "Solução",
    unit: "mL",
    plannedQuantity: "1000",
    approvedQuantity: "1000",
    purchasedQuantity: "1000",
    validatedQuantity: "0",
    pendingValidationQuantity: "0",
    unarrivedQuantity: "1000",
    waivedQuantity: "0",
    waivableQuantity: "0",
    remainingExpectation: "0",
  };
  const progress = {
    state: "acquisition_partial",
    expectationClosed: false,
    expectationPending: true,
    physicalPending: true,
    validationPending: false,
    closure: null,
    lines: [
      line,
      {
        ...line,
        lineId: "b",
        name: "Compressa",
        unit: "unidade",
        plannedQuantity: "1",
        approvedQuantity: "1",
        purchasedQuantity: "0",
      },
    ],
  };
  const acquisition = supplyMilestones({
    ...facts,
    type: "COM",
    purchaseProgress: progress,
  })[1];
  expect(acquisition.percent).toBe(50);
  expect(acquisition.detail).toContain("1/2 linhas integralmente adquiridas");
});
