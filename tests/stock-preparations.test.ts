import { stockPreparationDisplay } from "@/lib/forms/stock-preparation-display";
import type { CreationDraftController } from "@/components/forms/use-creation-draft";
import { describe, it, expect } from "vitest";
import {
  stockPreparationCommandSchema,
  stockPreparationCommitSchema,
  parseStockPreparationReceipt,
  parseStockPreparationConfirmation,
  parseStockPreparationReference,
} from "@/lib/validation/stock-preparations";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
const patient = "11111111-1111-4111-8111-111111111111",
  actor = "22222222-2222-4222-8222-222222222222",
  resource = "33333333-3333-4333-8333-333333333333",
  key = "44444444-4444-4444-8444-444444444444",
  hash = "a".repeat(64),
  instant = "2026-11-10T04:00:00Z";
const movement = {
  productId: "material-exato",
  productLabel: "Material preservado",
  unit: "unidade",
  action: "inbound" as const,
  quantity: "1,0",
  reason: " Minha entrada ",
  referenceId: "",
};
const content = { movement, referenceHash: hash };
const scope = {
  userId: actor,
  patientId: patient,
  kind: "STOCK" as const,
  purpose: "family_movement" as const,
  targetDocumentId: null,
  targetResourceId: patient,
};
const save = {
  careRecipientId: patient,
  kind: "STOCK",
  purpose: "family_movement",
  targetResourceId: patient,
  targetDocumentId: null,
  id: null,
  expectedRevision: null,
  idempotencyKey: key,
  action: "save",
  content,
  navigation: { version: 1, stage: "stock_family_movement" },
};
const command = {
  careRecipientId: patient,
  productId: movement.productId,
  quantity: "1",
  action: "inbound",
  reason: "Minha entrada",
  idempotencyKey: key,
};
const packet = stockPreparationCommitSchema.parse({
  careRecipientId: patient,
  draftCommit: { id: resource, revision: 1 },
  idempotencyKey: key,
  referenceHash: hash,
  command,
});
const receipt = {
  patientId: patient,
  purpose: "family_movement",
  targetResourceId: patient,
  resourceId: resource,
  actorId: actor,
  recordedAt: instant,
  command,
  referenceHash: hash,
  preparedMovement: movement,
  movement: {
    id: resource,
    productId: movement.productId,
    quantity: "1.000000",
    sourceLocation: null,
    destinationLocation: "FAMILY",
    reason: command.reason,
    performedBy: actor,
    referenceId: null,
  },
};
const result = {
  id: resource,
  revision: 2,
  patientId: patient,
  ownerId: actor,
  purpose: "family_movement",
  targetResourceId: patient,
  savedAt: instant,
  state: "consumed",
  consumedDocumentId: null,
  consumedResourceId: resource,
  consumedResult: receipt,
  replayed: false,
};
describe("private family stock exact preparation and receipts", () => {
  it("keeps a real resource scope and permits incomplete fields without creating a document", () => {
    expect(stockPreparationCommandSchema.safeParse(save).success).toBe(true);
    expect(creationDraftCommandSchema.safeParse(save).success).toBe(true);
    expect(
      stockPreparationCommandSchema.safeParse({
        ...save,
        content: {
          movement: { reason: "Ainda escrevendo" },
          referenceHash: null,
        },
      }).success,
    ).toBe(true);
    for (const invalid of [
      { ...save, targetResourceId: resource },
      { ...save, targetDocumentId: resource },
      { ...save, navigation: { version: 1, stage: "bal_configure" } },
      { ...save, content: { ...content, ledger: [] } },
      {
        ...save,
        content: { ...content, movement: { ...movement, role: "admin" } },
      },
    ]) {
      expect(stockPreparationCommandSchema.safeParse(invalid).success).toBe(
        false,
      );
      expect(creationDraftCommandSchema.safeParse(invalid).success).toBe(false);
    }
  });
  it("retains exact strings and UTF16 bounds while requiring a complete confirmation", () => {
    expect(stockPreparationCommandSchema.parse(save)).toMatchObject({
      content,
    });
    expect(
      stockPreparationCommandSchema.safeParse({
        ...save,
        content: { ...content, movement: { reason: "😀".repeat(501) } },
      }).success,
    ).toBe(false);
    expect(
      stockPreparationCommitSchema.safeParse({
        ...packet,
        command: { ...command, careRecipientId: resource },
      }).success,
    ).toBe(false);
    expect(
      stockPreparationCommitSchema.safeParse({
        ...packet,
        command: { ...command, idempotencyKey: resource },
      }).success,
    ).toBe(false);
    expect(
      stockPreparationCommitSchema.safeParse({
        ...packet,
        command: { ...command, quantity: "1.0000001" },
      }).success,
    ).toBe(false);
  });
  it("validates physical facts,prepared content,actor and same intention independently of a success flag", () => {
    expect(
      parseStockPreparationReceipt(receipt, scope, packet).resourceId,
    ).toBe(resource);
    expect(
      parseStockPreparationConfirmation(result, patient, actor, packet).command
        .quantity,
    ).toBe("1");
    for (const invalid of [
      { ...receipt, actorId: patient },
      { ...receipt, targetResourceId: resource },
      { ...receipt, movement: { ...receipt.movement, quantity: "2" } },
      {
        ...receipt,
        movement: { ...receipt.movement, destinationLocation: "CARE_TEAM" },
      },
      { ...receipt, preparedMovement: { ...movement, reason: "Outro motivo" } },
      { ...receipt, command: { ...command, idempotencyKey: resource } },
    ])
      expect(() =>
        parseStockPreparationReceipt(invalid, scope, packet),
      ).toThrow();
    for (const invalid of [
      { ...result, revision: 1 },
      { ...result, id: patient },
      { ...result, consumedResourceId: patient },
      { ...result, consumedDocumentId: resource },
      { ...result, ownerId: patient },
    ])
      expect(() =>
        parseStockPreparationConfirmation(invalid, patient, actor, packet),
      ).toThrow();
  });
  it("parses private reads and acknowledgements using resource identity without a fictitious fiche", () => {
    const row = {
      ...result,
      kind: "STOCK",
      state: "active",
      revision: 1,
      content,
      createdAt: instant,
      contentHash: hash,
      schemaVersion: 1,
      targetDocumentId: null,
      navigation: save.navigation,
      consumedResult: null,
      consumedResourceId: null,
    };
    expect(parsePrivateDraft(row, scope)?.content).toEqual(content);
    expect(
      parsePrivateDraft(
        {
          ...row,
          state: "consumed",
          revision: 2,
          content: null,
          navigation: null,
          consumedResult: receipt,
          consumedResourceId: resource,
        },
        scope,
      )?.consumedResourceId,
    ).toBe(resource);
    expect(() =>
      parsePrivateDraft({ ...row, ownerId: patient }, scope),
    ).toThrow();
    expect(() =>
      parsePrivateDraft({ ...row, targetResourceId: resource }, scope),
    ).toThrow();
    const ack = {
      ...save,
      id: resource,
      expectedRevision: 2,
      action: "acknowledge",
    };
    expect(
      parsePrivateDraftResult(
        { ...result, revision: 3, state: "completed" },
        ack,
        actor,
      ).state,
    ).toBe("completed");
  });
  it("rejects a reference for another patient,material or historical movement", () => {
    const ref = {
      patientId: patient,
      referenceHash: hash,
      product: {
        id: movement.productId,
        name: "Material",
        unit: "unidade",
        decimals: 0,
        active: true,
      },
      balance: "30",
      origin: null,
    };
    expect(
      parseStockPreparationReference(ref, patient, movement.productId, "")
        .balance,
    ).toBe("30");
    expect(() =>
      parseStockPreparationReference(ref, resource, movement.productId, ""),
    ).toThrow();
    expect(() =>
      parseStockPreparationReference(ref, patient, "outro-material", ""),
    ).toThrow();
    expect(() =>
      parseStockPreparationReference(
        ref,
        patient,
        movement.productId,
        resource,
      ),
    ).toThrow();
    expect(() =>
      parseStockPreparationReference(
        { ...ref, balance: "indisponível" },
        patient,
        movement.productId,
        "",
      ),
    ).toThrow();
  });
  it("accepts a masked write-only reference and rejects a balance or origin leak in that variant", () => {
    const ref = {
      patientId: patient,
      referenceHash: hash,
      canReadBalance: false,
      product: {
        id: movement.productId,
        name: "Material",
        unit: "unidade",
        decimals: 0,
        active: true,
      },
      balance: null,
      origin: {
        id: resource,
        productId: movement.productId,
        quantity: null,
        sourceLocation: null,
        destinationLocation: null,
        recordedAt: null,
        performedBy: null,
        reason: null,
      },
    };
    expect(
      parseStockPreparationReference(ref, patient, movement.productId, resource)
        .balance,
    ).toBeNull();
    expect(() =>
      parseStockPreparationReference(
        { ...ref, balance: "30" },
        patient,
        movement.productId,
        resource,
      ),
    ).toThrow();
    expect(() =>
      parseStockPreparationReference(
        { ...ref, origin: { ...ref.origin, quantity: "2" } },
        patient,
        movement.productId,
        resource,
      ),
    ).toThrow();
    const hidden = { ...receipt, preparedMovement: { ...movement } };
    expect(
      parseStockPreparationReceipt(hidden, scope, packet).command.quantity,
    ).toBe("1");
  });
});

it("display masking covers pending saves and private versions while preserving the original recovery packet", () => {
  const hiddenContent = {
    ...content,
    movement: {
      ...movement,
      observedBalance: "30",
      referenceLabel: "Origem física com saldo reservado",
    },
  };
  const row = parsePrivateDraft(
    {
      ...result,
      kind: "STOCK",
      state: "active",
      revision: 1,
      content: hiddenContent,
      createdAt: instant,
      contentHash: hash,
      schemaVersion: 1,
      targetDocumentId: null,
      navigation: save.navigation,
      consumedResult: null,
      consumedResourceId: null,
    },
    scope,
  )!;
  const consumed = parsePrivateDraft(
    {
      ...row,
      state: "consumed",
      revision: 2,
      content: null,
      navigation: null,
      consumedResourceId: resource,
      consumedResult: { ...receipt, preparedMovement: hiddenContent.movement },
    },
    scope,
  )!;
  const pending = { ...save, content: hiddenContent },
    recover = async () => undefined;
  const controller = {
    base: row,
    offered: row,
    comparison: row,
    consumed,
    pending,
    recover,
  } as unknown as CreationDraftController;
  const visible = stockPreparationDisplay(controller, false);
  for (const item of [visible.base, visible.offered, visible.comparison]) {
    expect(item?.content).toHaveProperty("movement");
    expect(item?.content).not.toHaveProperty("movement.observedBalance");
    expect(item?.content).not.toHaveProperty("movement.referenceLabel");
  }
  expect(visible.pending?.content).not.toHaveProperty(
    "movement.observedBalance",
  );
  expect(visible.consumed?.consumedResult).not.toHaveProperty(
    "preparedMovement.observedBalance",
  );
  expect(visible.recover).toBe(recover);
  expect(controller.pending?.content).toHaveProperty(
    "movement.observedBalance",
    "30",
  );
  expect(stockPreparationDisplay(controller, true)).toBe(controller);
});
