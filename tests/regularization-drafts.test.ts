import { expect, it } from "vitest";
import {
  regularizationPurposes,
  regularizationDraftReference,
  regularizationDraftContent,
  regularizationDraftValues,
  regularizationDraftStale,
  adoptRegularizationDraftReference,
} from "@/lib/forms/regularization-draft";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
import { parseRegularizationReference } from "@/lib/validation/regularization-reference";
import type { SupplyDocument } from "@/types/documents";
const id = "10000000-0000-4000-8000-000000000001",
  patient = "10000000-0000-4000-8000-000000000002",
  line = "10000000-0000-4000-8000-000000000003",
  person = "10000000-0000-4000-8000-000000000004";
const packet = {
  data: {
    id,
    care_recipient_id: patient,
    type: "ENT",
    version: 3,
    code: "ENT-0001",
    status: "disputed",
    payload: {},
    events: [],
    receipts: [],
    lines: [
      {
        id: line,
        product_id: "material-textual",
        name_snapshot: "Material preservado",
        unit_snapshot: "mL",
        quantity: "3",
        accepted_quantity: "2",
        reconciled_quantity: "0",
      },
    ],
    deliveryRegularization: {
      recipientAvailable: false,
      pendingTransit: "1",
      sourceReady: true,
      sourceLines: [{ lineId: line, quantityDecimals: 6, sourceReady: true }],
      cases: [],
      currentId: null,
      canPropose: true,
      canReview: false,
      canApprove: false,
      canRecordFinding: false,
      canClose: null,
      reviewers: [
        { id: person, name: "Conferente preservado", role: "family" },
      ],
      followUpPeople: [
        { id: person, name: "Responsável preservado", role: "family" },
      ],
    },
  },
};
const doc = () => structuredClone(packet.data) as unknown as SupplyDocument;
const values = {
  reason: "Motivo próprio",
  basis: "Base própria",
  reviewer: person,
  owner: person,
  entries: {
    [line]: {
      receivedQuantity: "0,",
      returnedQuantity: "",
      missingQuantity: "0",
    },
  },
};
it.each(Object.values(regularizationPurposes))(
  "%s has a closed ENT draft stage and bounded incomplete content",
  (purpose) => {
    const document = doc(),
      content = regularizationDraftContent(
        regularizationDraftReference(document),
        document,
        values,
      );
    const command = {
      careRecipientId: patient,
      kind: "ENT",
      purpose,
      targetDocumentId: id,
      id: null,
      expectedRevision: null,
      idempotencyKey: id,
      action: "save",
      content,
      navigation: navigationForStep(draftFlow("ENT", purpose)!, 0),
    };
    expect(creationDraftCommandSchema.safeParse(command).success).toBe(true);
    expect(
      creationDraftCommandSchema.safeParse({ ...command, kind: "COM" }).success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({
        ...command,
        navigation: { version: 1, stage: "receipt" },
      }).success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({
        ...command,
        content: {
          ...content,
          fields: { ...content.fields, reason: "a".repeat(3001) },
        },
      }).success,
    ).toBe(false);
  },
);
it("restores raw declarations and unavailable choices without copying physical or authority facts", () => {
  const document = doc(),
    baseline = regularizationDraftReference(document),
    saved = regularizationDraftContent(baseline, document, values);
  expect(regularizationDraftValues(saved)).toEqual(values);
  document.deliveryRegularization!.reviewers = [];
  document.deliveryRegularization!.followUpPeople = [];
  const restored = regularizationDraftContent(
    saved,
    document,
    regularizationDraftValues(saved),
  );
  expect(restored.fields.reviewerId).toBe(person);
  expect(restored.fields.reviewerLabel).toBe("Conferente preservado");
  expect(restored.fields.followUpOwnerLabel).toBe("Responsável preservado");
  const adopted = adoptRegularizationDraftReference(restored, document);
  expect(adopted.fields.reviewerLabel).toBe("Conferente preservado");
  expect(regularizationDraftValues(adopted)).toEqual(values);
  expect(JSON.stringify(restored)).not.toMatch(
    /accepted_quantity|canPropose|canApprove|before_snapshot|movementIds/,
  );
});
it("seals case identity and version while adopting only a new reference preserves own raw values", () => {
  const document = doc(),
    baseline = regularizationDraftContent(
      regularizationDraftReference(document),
      document,
      values,
    );
  expect(regularizationDraftStale(baseline, document)).toBe(false);
  document.version++;
  expect(regularizationDraftStale(baseline, document)).toBe(true);
  const adopted = regularizationDraftContent(
    regularizationDraftReference(document),
    document,
    regularizationDraftValues(baseline),
  );
  expect(adopted.documentVersion).toBe(4);
  expect(regularizationDraftValues(adopted)).toEqual(values);
  document.deliveryRegularization!.currentId = person;
  expect(regularizationDraftStale(adopted, document)).toBe(true);
});
it("initializes no-pending lines explicitly at zero and leaves pending declarations empty", () => {
  const document = doc();
  expect(
    regularizationDraftValues(regularizationDraftReference(document)).entries[
      line
    ].receivedQuantity,
  ).toBe("");
  document.lines[0].reconciled_quantity = "1";
  expect(
    Object.values(
      regularizationDraftValues(regularizationDraftReference(document)).entries[
        line
      ],
    ),
  ).toEqual(["0", "0", "0"]);
});
it("reads exact current regularization scope and handles the legacy null close flag explicitly", () => {
  const result = parseRegularizationReference(packet, {
    id,
    patientId: patient,
    minimumVersion: 3,
  });
  expect(result.deliveryRegularization!.canClose).toBe(false);
  for (const change of [
    { id: patient },
    { patientId: id },
    { minimumVersion: 4 },
  ])
    expect(() =>
      parseRegularizationReference(packet, {
        id,
        patientId: patient,
        minimumVersion: 3,
        ...change,
      }),
    ).toThrow();
});
it("rejects malformed200,duplicate lines,missing sources and case references absent from authorized facts", () => {
  for (const change of [
    (body: typeof packet) => {
      body.data.lines.push(body.data.lines[0]);
    },
    (body: typeof packet) => {
      body.data.deliveryRegularization.sourceLines = [];
    },
    (body: typeof packet) => {
      body.data.deliveryRegularization.currentId = person as never;
    },
    (body: typeof packet) => {
      (body.data.deliveryRegularization as Record<string, unknown>).canPropose =
        "yes";
    },
  ]) {
    const body = structuredClone(packet);
    change(body);
    expect(() =>
      parseRegularizationReference(body, {
        id,
        patientId: patient,
        minimumVersion: 3,
      }),
    ).toThrow();
  }
  expect(() =>
    parseRegularizationReference(
      { data: {} },
      { id, patientId: patient, minimumVersion: 3 },
    ),
  ).toThrow();
});
