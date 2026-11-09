import { expect, it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import { createTransferSchema } from "@/lib/validation/transfers";
import {
  parseTransferPreparation,
  requireTransferDeclarationConfirmation,
} from "@/lib/validation/transfer-preparation";
import {
  transferDeclarationPurpose,
  emptyTransferDeclarationDraft,
  transferDeclarationDraftContent,
  transferDeclarationValues,
  adoptTransferDeclarationReference,
} from "@/lib/forms/transfer-declaration-draft";
import type { Custody } from "@/types/documents";
const patient = "10000000-0000-4000-8000-000000000001",
  user = "10000000-0000-4000-8000-000000000002",
  person = "10000000-0000-4000-8000-000000000003",
  origin = "10000000-0000-4000-8000-000000000004",
  id = "10000000-0000-4000-8000-000000000005",
  lineId = "10000000-0000-4000-8000-000000000006";
function fixture(source: Custody) {
  const reference = {
    patientId: patient,
    actor: user,
    source,
    destination:
      source === "FAMILY" ? ("CARE_TEAM" as const) : ("FAMILY" as const),
    referenceHash: "ab".repeat(32),
    checkedAt: "2026-11-09T12:00:00Z",
    people: [{ id: person, name: "Pessoa escolhida", role: "admin" }],
    products: [
      {
        id: "material",
        name: "Material escolhido",
        category: "higiene",
        unit: "unidade",
        quantityDecimals: 0,
        active: true,
        available: "20",
      },
    ],
    origins: [
      {
        id: origin,
        code: "ENT de origem",
        createdAt: "2026-11-08T12:00:00Z",
        productIds: ["material"],
      },
    ],
    originTotal: 1,
  };
  const values = {
    counterpartyId: person,
    recipientId: person,
    originId: origin,
    reason: "\uFEFF\n Justificativa própria \u00A0",
    query: "Busca preservada",
    lines: [{ productId: "material", quantity: "0002,0000000000" }],
  };
  const content = transferDeclarationDraftContent(
    adoptTransferDeclarationReference(
      emptyTransferDeclarationDraft(source),
      reference,
    ),
    reference,
    values,
  );
  const purpose = transferDeclarationPurpose(source);
  const save = {
    careRecipientId: patient,
    kind: "ENT",
    purpose,
    targetDocumentId: null,
    id: null,
    expectedRevision: null,
    idempotencyKey: id,
    action: "save",
    content,
    navigation: { version: 1, stage: "ent_transfer_declaration" },
  };
  const scope = {
    userId: user,
    patientId: patient,
    kind: "ENT" as const,
    purpose,
    targetDocumentId: null,
  };
  const row = {
    id,
    ownerId: user,
    patientId: patient,
    kind: "ENT",
    purpose,
    targetDocumentId: null,
    schemaVersion: 1,
    revision: 1,
    state: "active",
    createdAt: reference.checkedAt,
    savedAt: reference.checkedAt,
    contentHash: "hash",
    content,
    consumedDocumentId: null,
    navigation: save.navigation,
  };
  const declaration = createTransferSchema.parse({
    careRecipientId: patient,
    idempotencyKey: id,
    declaration: {
      source,
      counterpartyId: person,
      recipientId: person,
      originDocumentId: origin,
      referenceHash: reference.referenceHash,
      reason: values.reason,
      lines: values.lines,
    },
  }).declaration;
  const document = {
    id,
    care_recipient_id: patient,
    type: "ENT",
    version: 1,
    status: "transfer_pending",
    payload: {},
    events: [],
    lines: [
      {
        id: lineId,
        product_id: "material",
        name_snapshot: "Material escolhido",
        unit_snapshot: "unidade",
        quantity: "2",
      },
    ],
    transfer: {
      state: "pending",
      declaration: {
        actor: { id: user, name: "Autor" },
        counterparty: { id: person, name: "Pessoa escolhida" },
        recipient: { id: person, name: "Pessoa escolhida" },
        source,
        destination: reference.destination,
        reason: declaration.reason,
        recordedAt: reference.checkedAt,
        referenceHash: reference.referenceHash,
      },
      agreement: null,
      withdrawal: null,
      dispatchedAt: null,
      originDocumentId: origin,
      canAgree: false,
      canDispatch: false,
      canWithdraw: true,
    },
  };
  return {
    reference,
    values,
    content,
    purpose,
    save,
    scope,
    row,
    declaration,
    document,
  };
}
for (const source of ["FAMILY", "CARE_TEAM"] as const) {
  it(
    source +
      " declaration uses a separate nil-target/nil-version slot and preserves partial text without an official version",
    () => {
      const f = fixture(source);
      expect(creationDraftCommandSchema.parse(f.save)).toMatchObject({
        targetDocumentId: null,
        content: { documentVersion: null },
      });
      const partial = {
        ...f.content,
        fields: { ...f.content.fields, ["material:transferQuantity"]: "0," },
      };
      expect(
        creationDraftCommandSchema.safeParse({ ...f.save, content: partial })
          .success,
      ).toBe(true);
      for (const override of [
        { targetDocumentId: id },
        { kind: "COM" },
        { navigation: { version: 1, stage: "ent_transfer_dispatch" } },
        { content: { ...f.content, documentVersion: 1 } },
        {
          content: {
            ...f.content,
            fields: {
              ...f.content.fields,
              source: source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
            },
          },
        },
        {
          content: {
            ...f.content,
            materials: [...f.content.materials, ...f.content.materials],
          },
        },
        { content: { ...f.content, stockPool: [] } },
      ])
        expect(
          creationDraftCommandSchema.safeParse({ ...f.save, ...override })
            .success,
        ).toBe(false);
      expect(
        createTransferSchema.parse({
          careRecipientId: patient,
          idempotencyKey: id,
          declaration: f.declaration,
          draftCommit: { id, revision: 1 },
        }).declaration.lines[0].quantity,
      ).toBe("2");
    },
  );
  it(
    source +
      " private reads reject another owner,direction,stage or counterfeit official version",
    () => {
      const f = fixture(source);
      expect(parsePrivateDraft(f.row, f.scope)?.content).toEqual(f.content);
      for (const row of [
        { ...f.row, ownerId: person },
        {
          ...f.row,
          purpose:
            source === "FAMILY"
              ? "transfer_declare_team"
              : "transfer_declare_family",
        },
        { ...f.row, content: { ...f.content, documentVersion: 1 } },
        { ...f.row, navigation: { version: 1, stage: "review" } },
        {
          ...f.row,
          content: {
            ...f.content,
            fields: {
              ...f.content.fields,
              source: source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
            },
          },
        },
      ])
        expect(() => parsePrivateDraft(row, f.scope)).toThrow();
    },
  );
  it(
    source +
      " adoption preserves exact own values and missing selections without copying balances or silently replacing an identity",
    () => {
      const f = fixture(source),
        next = {
          ...f.reference,
          referenceHash: "cd".repeat(32),
          people: [],
          products: [],
          origins: [],
          originTotal: 0,
        };
      const adopted = adoptTransferDeclarationReference(f.content, next);
      expect(transferDeclarationValues(adopted)).toEqual(f.values);
      expect(adopted.fields.counterpartyLabel).toBe("Pessoa escolhida");
      expect(adopted.fields.originLabel).toBe("ENT de origem");
      expect(adopted.materials[0].name).toBe("Material escolhido");
      expect(JSON.stringify(adopted)).not.toContain("available");
      expect(JSON.stringify(adopted)).not.toContain("originTotal");
      const changed = adoptTransferDeclarationReference(f.content, {
        ...f.reference,
        products: [
          { ...f.reference.products[0], unit: "mL", quantityDecimals: 3 },
        ],
      });
      expect(changed.materials[0].unit).toBe("mL");
      expect(transferDeclarationValues(changed).lines).toEqual(f.values.lines);
    },
  );
  it(
    source +
      " fresh preparations require exact actor,patient,custody and coherent identities",
    () => {
      const f = fixture(source),
        expected = { patientId: patient, userId: user, source };
      expect(parseTransferPreparation({ data: f.reference }, expected)).toEqual(
        f.reference,
      );
      const invalid = [
        { ...f.reference, actor: person },
        { ...f.reference, patientId: origin },
        { ...f.reference, source: f.reference.destination },
        { ...f.reference, destination: source },
        {
          ...f.reference,
          people: [...f.reference.people, ...f.reference.people],
        },
        { ...f.reference, people: [{ ...f.reference.people[0], id: user }] },
        {
          ...f.reference,
          products: [...f.reference.products, ...f.reference.products],
        },
        { ...f.reference, originTotal: 0 },
        {
          ...f.reference,
          origins: [
            { ...f.reference.origins[0], productIds: ["material", "material"] },
          ],
        },
      ];
      for (const data of invalid)
        expect(() => parseTransferPreparation({ data }, expected)).toThrow();
      expect(() =>
        parseTransferPreparation({ data: { patientId: patient } }, expected),
      ).toThrow();
    },
  );
  it(
    source +
      " confirmations bind the actual declaration and quantities while malformed or unrelated successes remain uncertain",
    () => {
      const f = fixture(source),
        expected = {
          patientId: patient,
          userId: user,
          declaration: f.declaration,
        };
      expect(
        requireTransferDeclarationConfirmation(
          { persistence: "confirmed", data: f.document },
          expected,
        ).id,
      ).toBe(id);
      const mutations = [
        (d: typeof f.document) => {
          d.care_recipient_id = person;
        },
        (d: typeof f.document) => {
          d.transfer.declaration.actor.id = person;
        },
        (d: typeof f.document) => {
          d.transfer.declaration.referenceHash = "00".repeat(32);
        },
        (d: typeof f.document) => {
          d.transfer.declaration.recipient.id = origin;
        },
        (d: typeof f.document) => {
          d.transfer.declaration.reason += " alterada";
        },
        (d: typeof f.document) => {
          d.transfer.originDocumentId = patient;
        },
        (d: typeof f.document) => {
          d.lines[0].quantity = "3";
        },
      ];
      for (const mutate of mutations) {
        const copy = structuredClone(f.document);
        mutate(copy);
        expect(() =>
          requireTransferDeclarationConfirmation(
            { persistence: "confirmed", data: copy },
            expected,
          ),
        ).toThrow();
      }
      expect(() =>
        requireTransferDeclarationConfirmation({ data: f.document }, expected),
      ).toThrow();
    },
  );
}
