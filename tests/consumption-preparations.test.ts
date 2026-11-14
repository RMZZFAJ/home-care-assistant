import { describe, it, expect } from "vitest";
import {
  consumptionPreparationCommandSchema,
  consumptionPreparationContentSchema,
  consumptionPreparationCommitSchema,
  parseConsumptionPreparationReceipt,
  parseConsumptionPreparationConfirmation,
  parseConsumptionPreparationReference,
  consumptionPendingConfirmedByRead,
} from "@/lib/validation/consumption-preparations";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
const patient = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  resource = "33333333-3333-4333-8333-333333333333",
  privateId = "44444444-4444-4444-8444-444444444444",
  key = "55555555-5555-4555-8555-555555555555",
  hash = "a".repeat(64),
  at = "2026-11-10T00:00:00.000Z";
const purpose = "consumption_report_family" as const;
function fixture() {
  const consumption = {
    kind: "consumption",
    location: "FAMILY",
    text: "Relato fictício preservado",
    reason: "",
    reminderId: "",
    lines: [
      {
        productId: "material",
        name: "Material fictício",
        unit: "unidade",
        quantity: "1,000000",
      },
    ],
  } as const;
  const reference = {
    patientId: patient,
    purpose,
    targetResourceId: patient,
    location: "FAMILY",
    report: null,
    catalog: [
      {
        id: "material",
        name: "Material fictício",
        unit: "unidade",
        decimals: 0,
        active: true,
      },
    ],
    reminder: null,
    ledgerHash: null,
  };
  const command = {
    action: "report",
    careRecipientId: patient,
    kind: "consumption",
    location: "FAMILY",
    text: consumption.text,
    lines: [{ productId: "material", unit: "unidade", quantity: "1" }],
    idempotencyKey: key,
  };
  const report = {
    id: resource,
    care_recipient_id: patient,
    kind: "consumption",
    location: "FAMILY",
    status: "reported",
    body: consumption.text,
    created_at: at,
    version: 1,
    reported_by: owner,
    reported_name: "Pessoa fictícia",
    lines: [
      {
        productId: "material",
        unit: "unidade",
        quantity: "1",
        name: "Material fictício",
      },
    ],
    current_lines: [
      {
        productId: "material",
        unit: "unidade",
        quantity: "1",
        name: "Material fictício",
      },
    ],
    confirmed_by: null,
    confirmed_at: null,
    source_reminder_id: null,
    revisions: [],
    decision: null,
    movements: [],
  };
  const receipt = {
    patientId: patient,
    purpose,
    targetResourceId: patient,
    resourceId: resource,
    actorId: owner,
    recordedAt: at,
    command,
    referenceHash: hash,
    preparedConsumption: consumption,
    preparedReference: reference,
    report,
  };
  return {
    content: { consumption, reference, referenceHash: hash },
    receipt,
    scope: {
      patientId: patient,
      purpose,
      targetResourceId: patient,
      userId: owner,
    },
  };
}
describe("private consumption discriminating contracts", () => {
  it("preserves incomplete raw quantities and UTF16 text while refusing duplicate products and overflow", () => {
    const f = fixture(),
      c = {
        ...f.content,
        reference: null,
        referenceHash: null,
        consumption: {
          ...f.content.consumption,
          kind: "",
          text: "",
          lines: [
            { ...f.content.consumption.lines[0], quantity: "0,00000001" },
          ],
        },
      };
    expect(consumptionPreparationContentSchema.parse(c)).toEqual(c);
    expect(
      consumptionPreparationContentSchema.safeParse({
        ...c,
        consumption: { ...c.consumption, text: "😀".repeat(1001) },
      }).success,
    ).toBe(false);
    expect(
      consumptionPreparationContentSchema.safeParse({
        ...c,
        consumption: {
          ...c.consumption,
          lines: [...c.consumption.lines, ...c.consumption.lines],
        },
      }).success,
    ).toBe(false);
  });
  it("uses real resources,purposes and one matching private revision rather than a document", () => {
    const f = fixture(),
      v = {
        careRecipientId: patient,
        kind: "CONSUMPTION",
        purpose,
        targetDocumentId: null,
        targetResourceId: patient,
        id: null,
        expectedRevision: null,
        idempotencyKey: key,
        action: "save",
        navigation: { version: 1, stage: "consumption_preparation" },
        content: f.content,
      };
    expect(consumptionPreparationCommandSchema.safeParse(v).success).toBe(true);
    expect(creationDraftCommandSchema.safeParse(v).success).toBe(true);
    for (const altered of [
      { ...v, targetResourceId: resource },
      { ...v, targetDocumentId: resource },
      { ...v, expectedRevision: 1 },
      { ...v, navigation: { version: 1, stage: "review" } },
    ])
      expect(
        consumptionPreparationCommandSchema.safeParse(altered).success,
      ).toBe(false);
  });
  it("refuses an unrelated or malformed source even when delivered as200", () => {
    const f = fixture();
    expect(
      parseConsumptionPreparationReference(
        { reference: f.content.reference, referenceHash: hash },
        f.scope,
      ).reference.patientId,
    ).toBe(patient);
    expect(() =>
      parseConsumptionPreparationReference(
        {
          reference: { ...f.content.reference, patientId: resource },
          referenceHash: hash,
        },
        f.scope,
      ),
    ).toThrow();
    expect(() =>
      parseConsumptionPreparationReference(
        {
          reference: { ...f.content.reference, catalog: [{}] },
          referenceHash: hash,
        },
        f.scope,
      ),
    ).toThrow();
  });
  it("checks receipt author,native facts and the actually saved fields independently", () => {
    const f = fixture();
    expect(
      parseConsumptionPreparationReceipt(f.receipt, f.scope).resourceId,
    ).toBe(resource);
    for (const v of [
      { ...f.receipt, actorId: resource },
      {
        ...f.receipt,
        preparedConsumption: {
          ...f.receipt.preparedConsumption,
          text: "Texto trocado",
        },
      },
      { ...f.receipt, report: { ...f.receipt.report, status: "confirmed" } },
      { ...f.receipt, purpose: "consumption_supplement" },
      { ...f.receipt, report: { ...f.receipt.report, lines: [] } },
    ])
      expect(() => parseConsumptionPreparationReceipt(v, f.scope)).toThrow();
  });
  it("does not accept another intention,key,revision or native result for a confirmation", () => {
    const f = fixture(),
      p = consumptionPreparationCommitSchema.parse({
        careRecipientId: patient,
        purpose,
        targetResourceId: patient,
        draftCommit: { id: privateId, revision: 1 },
        idempotencyKey: key,
        referenceHash: hash,
        command: f.receipt.command,
      });
    const r = {
      id: privateId,
      revision: 2,
      savedAt: at,
      state: "consumed",
      consumedDocumentId: null,
      consumedResourceId: resource,
      consumedResult: f.receipt,
      replayed: false,
    };
    expect(parseConsumptionPreparationConfirmation(r, p, owner).state).toBe(
      "consumed",
    );
    for (const altered of [
      { ...r, revision: 3 },
      { ...r, consumedResourceId: patient },
      {
        ...r,
        consumedResult: {
          ...f.receipt,
          command: { ...f.receipt.command, idempotencyKey: resource },
        },
      },
    ])
      expect(() =>
        parseConsumptionPreparationConfirmation(altered, p, owner),
      ).toThrow();
  });
  it("does not leak a foreign private preparation or represent consumed stock as an official document", () => {
    const f = fixture(),
      row = {
        id: privateId,
        revision: 1,
        savedAt: at,
        state: "active",
        consumedDocumentId: null,
        ownerId: owner,
        patientId: patient,
        kind: "CONSUMPTION",
        purpose,
        targetDocumentId: null,
        targetResourceId: patient,
        schemaVersion: 1,
        createdAt: at,
        contentHash: hash,
        content: f.content,
        navigation: { version: 1, stage: "consumption_preparation" },
        consumedResourceId: null,
        consumedResult: null,
      };
    expect(
      parsePrivateDraft(row, {
        ...f.scope,
        kind: "CONSUMPTION",
        targetDocumentId: null,
      })?.content,
    ).toEqual(f.content);
    expect(() =>
      parsePrivateDraft(
        { ...row, ownerId: resource },
        { ...f.scope, kind: "CONSUMPTION", targetDocumentId: null },
      ),
    ).toThrow();
  });
  it("reconciles a personal read only for the exact pending revision,intention and owner", () => {
    const f = fixture(),
      p = consumptionPreparationCommitSchema.parse({
        careRecipientId: patient,
        purpose,
        targetResourceId: patient,
        draftCommit: { id: privateId, revision: 1 },
        idempotencyKey: key,
        referenceHash: hash,
        command: f.receipt.command,
      }),
      row = {
        id: privateId,
        revision: 2,
        state: "consumed",
        consumedResourceId: resource,
        consumedResult: f.receipt,
      };
    expect(consumptionPendingConfirmedByRead(row, p, owner)).toBe(true);
    expect(
      consumptionPendingConfirmedByRead({ ...row, revision: 3 }, p, owner),
    ).toBe(false);
    expect(
      consumptionPendingConfirmedByRead(
        row,
        {
          ...p,
          idempotencyKey: resource,
          command: { ...p.command, idempotencyKey: resource },
        },
        owner,
      ),
    ).toBe(false);
    expect(consumptionPendingConfirmedByRead(row, p, resource)).toBe(false);
  });
  it("preserves the exact reference fingerprint payload,including scaled quantities and historical fields", () => {
    const f = fixture(),
      lines = [
        {
          productId: "material",
          quantity: "2.000000",
          unit: "unidade",
          name: "Nome histórico",
          historicalNote: "Campo preservado",
        },
      ],
      reference = {
        ...f.content.reference,
        purpose: "consumption_accept",
        targetResourceId: resource,
        report: {
          id: resource,
          version: 2,
          kind: "consumption",
          location: "FAMILY",
          status: "reported",
          body: "Original preservado",
          reportedBy: owner,
          reportedName: "Pessoa fictícia",
          createdAt: at,
          lines,
          lastSupplement: {
            id: privateId,
            version: 2,
            actor_id: owner,
            actor_name: "Pessoa fictícia",
            body: "Complemento com escala preservada",
            lines,
            created_at: at,
            report_id: resource,
          },
        },
      };
    const parsed = parseConsumptionPreparationReference(
      { reference, referenceHash: hash },
      {
        patientId: patient,
        purpose: "consumption_accept",
        targetResourceId: resource,
      },
    );
    expect(parsed.reference).toEqual(reference);
    expect(parsed.referenceHash).toBe(hash);
  });
});
