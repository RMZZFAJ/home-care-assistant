import { expect, it } from "vitest";
import {
  parseConsentReference,
  type ConsentReferenceExpectation,
} from "@/lib/validation/consent-reference";
import {
  consentReferenceReady,
  deliveryConsentDraftFields,
} from "@/lib/forms/delivery-draft-reference";
import type { SupplyDocument } from "@/types/documents";

const id = "10000000-0000-4000-8000-000000000001";
const patient = "10000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000003";
const lineId = "10000000-0000-4000-8000-000000000004";
const hash = "a".repeat(64);
const expected: ConsentReferenceExpectation = {
  id,
  patientId: patient,
  version: 4,
  requestId,
  referenceHash: hash,
  lineIds: [lineId],
};
const reference = {
  request: {
    id: requestId,
    source: "server_record",
    requestedBy: id,
    requestedName: "Solicitante preservado",
    requestedAt: "2026-11-09T12:00:00Z",
    requestedVersion: 4,
    previousStatus: "accepted",
    reason: "Pedido preservado",
    status: "pending",
  },
  sourceReady: true,
  referenceHash: hash,
  unresolvedTransit: "0",
  lines: [
    {
      lineId,
      productId: id,
      name: "Material preservado",
      unit: "mL",
      acceptedQuantity: "3",
      availableConsumedQuantity: "1",
      minimumReturnQuantity: "2",
      quantityDecimals: 6,
      consumptionReferences: [
        {
          movementId: id,
          reportId: requestId,
          recordedAt: "2026-11-09T12:00:00Z",
          quantity: "1",
        },
      ],
    },
  ],
};
const packet = {
  data: {
    id,
    care_recipient_id: patient,
    type: "ENT",
    version: 4,
    deliveryCancellation: reference,
  },
};

it("reads source facts only for the exact candidate document, patient, version, request, hash and lines", () => {
  expect(
    parseConsentReference(packet, expected).lines[0].minimumReturnQuantity,
  ).toBe("2");
  for (const change of [
    { id: patient },
    { patientId: id },
    { version: 5 },
    { requestId: id },
    { referenceHash: "b".repeat(64) },
    { lineIds: [id] },
  ])
    expect(() =>
      parseConsentReference(packet, { ...expected, ...change }),
    ).toThrow();
});

it("rejects malformed200, duplicate source lines and invalid quantities instead of displaying invented facts", () => {
  for (const body of [
    {},
    { data: {} },
    {
      ...packet,
      data: {
        ...packet.data,
        deliveryCancellation: {
          ...reference,
          lines: [reference.lines[0], reference.lines[0]],
        },
      },
    },
    {
      ...packet,
      data: {
        ...packet.data,
        deliveryCancellation: {
          ...reference,
          lines: [{ ...reference.lines[0], minimumReturnQuantity: "1," }],
        },
      },
    },
  ])
    expect(() => parseConsentReference(body, expected)).toThrow();
});

it("preserves textual catalogue identities instead of requiring a UUID for products", () => {
  const textual = {
    ...packet,
    data: {
      ...packet.data,
      deliveryCancellation: {
        ...reference,
        lines: [{ ...reference.lines[0], productId: "material-legado.v4-001" }],
      },
    },
  };
  expect(parseConsentReference(textual, expected).lines[0].productId).toBe(
    "material-legado.v4-001",
  );
});

it("keeps a source-access refusal as unavailable rather than requiring old cached consumption facts", () => {
  const refused = {
    ...packet,
    data: {
      ...packet.data,
      deliveryCancellation: {
        ...reference,
        sourceReady: false,
        sourceAccess: false,
        lines: [],
        referenceHash: null,
      },
    },
  };
  const parsed = parseConsentReference(refused, {
    ...expected,
    referenceHash: null,
  });
  expect(parsed.sourceAccess).toBe(false);
  expect(parsed.lines).toEqual([]);
  expect(consentReferenceReady(refused.data as unknown as SupplyDocument)).toBe(
    false,
  );
});

it("stores only the sealed reference and request display identity, never the consumption source pool", () => {
  const document = packet.data as unknown as SupplyDocument;
  const fields = deliveryConsentDraftFields(document);
  expect(fields).toEqual({
    requestId,
    requestLabel: expect.stringContaining("Pedido preservado"),
    referenceHash: hash,
  });
  expect(Object.keys(fields).sort()).toEqual([
    "referenceHash",
    "requestId",
    "requestLabel",
  ]);
  expect(consentReferenceReady(document)).toBe(true);
  expect(
    consentReferenceReady({
      ...document,
      deliveryCancellation: {
        ...document.deliveryCancellation!,
        sourceReady: false,
      },
    }),
  ).toBe(false);
});

it("rejects ready references missing the current return or consumption facts", () => {
  for (const field of [
    "availableConsumedQuantity",
    "minimumReturnQuantity",
    "quantityDecimals",
  ]) {
    const incomplete = structuredClone(packet);
    delete (
      incomplete.data.deliveryCancellation.lines[0] as Record<string, unknown>
    )[field];
    expect(() => parseConsentReference(incomplete, expected)).toThrow();
  }
  const incomplete = structuredClone(packet);
  delete (incomplete.data.deliveryCancellation as Record<string, unknown>)
    .unresolvedTransit;
  expect(() => parseConsentReference(incomplete, expected)).toThrow();
});
