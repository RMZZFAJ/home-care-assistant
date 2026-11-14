import { describe, expect, it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
import {
  transferPurpose,
  transferDecisionReference,
  adoptTransferDecisionReference,
} from "@/lib/forms/transfer-decision-draft";
import { parseTransferReference } from "@/lib/validation/transfer-reference";
import { transferCommandSchema } from "@/lib/validation/transfers";
import type { SupplyDocument } from "@/types/documents";
const id = "10000000-0000-4000-8000-000000000001",
  patient = "10000000-0000-4000-8000-000000000002",
  line = "10000000-0000-4000-8000-000000000003";
const actor = {
  id: "10000000-0000-4000-8000-000000000004",
  name: "Declarante fictício",
};
const counterparty = {
  id: "10000000-0000-4000-8000-000000000005",
  name: "Contraparte fictícia",
};
const packet = {
  data: {
    id,
    care_recipient_id: patient,
    type: "ENT",
    version: 2,
    status: "transfer_pending",
    payload: {},
    events: [],
    lines: [
      {
        id: line,
        product_id: "fralda",
        name_snapshot: "Nome documental",
        unit_snapshot: "unidade",
        quantity: "5",
      },
    ],
    transfer: {
      state: "pending",
      declaration: {
        actor,
        counterparty,
        recipient: counterparty,
        source: "CARE_TEAM",
        destination: "FAMILY",
        reason: "Declaração original preservada",
        recordedAt: "2026-11-09T10:00:00Z",
        referenceHash: "ab".repeat(32),
      },
      agreement: null,
      withdrawal: null,
      originDocumentId: null,
      dispatchedAt: null,
      canAgree: true,
      canDispatch: false,
      canWithdraw: false,
    },
  },
};
const expected = { id, patientId: patient, minimumVersion: 2 };
describe("transfer decision private preparations", () => {
  for (const action of ["agree", "decline", "withdraw", "dispatch"] as const) {
    it(
      action + " accepts only its own ENT stage,target and private shape",
      () => {
        const purpose = transferPurpose(action),
          navigation = navigationForStep(draftFlow("ENT", purpose)!, 0);
        const content = transferDecisionReference(
          packet.data as unknown as SupplyDocument,
        );
        content.fields.reason = "\uFEFF\n Rascunho próprio \u00A0";
        const save = {
          careRecipientId: patient,
          kind: "ENT",
          purpose,
          targetDocumentId: id,
          id: null,
          expectedRevision: null,
          idempotencyKey: id,
          action: "save",
          content,
          navigation,
        };
        const parsed = creationDraftCommandSchema.parse(save);
        expect("content" in parsed ? parsed.content : null).toEqual(content);
        for (const invalid of [
          { targetDocumentId: null },
          { kind: "COM" },
          { navigation: { version: 1, stage: "receipt" } },
          { content: { ...content, documentVersion: null } },
          { content: { ...content, stockPool: [] } },
        ])
          expect(
            creationDraftCommandSchema.safeParse({ ...save, ...invalid })
              .success,
          ).toBe(false);
        const official = {
          action,
          body: action === "dispatch" ? {} : { reason: content.fields.reason },
          expectedVersion: 2,
          idempotencyKey: id,
          draftCommit: { id, revision: 1 },
        };
        const command = transferCommandSchema.parse(official);
        if (command.action !== "dispatch")
          expect(command.body.reason).toBe(content.fields.reason.trim());
        expect(
          transferCommandSchema.safeParse({
            ...official,
            draftCommit: { id, revision: 0 },
          }).success,
        ).toBe(false);
        expect(
          transferCommandSchema.safeParse({
            ...official,
            body: { ...official.body, acceptedBy: id },
          }).success,
        ).toBe(false);
      },
    );
  }
  it("adopts current document names and version without changing the raw personal reason or importing a stock pool", () => {
    const row = packet.data as unknown as SupplyDocument,
      content = transferDecisionReference(row);
    content.fields.reason = "\n  Texto próprio sem normalização privada\t";
    const next = adoptTransferDecisionReference(content, {
      ...row,
      version: 3,
    });
    expect(next.documentVersion).toBe(3);
    expect(next.fields.reason).toBe(content.fields.reason);
    expect(next.fields.transferCounterparty).toBe(counterparty.name);
    expect(next.materials[0].name).toBe("Nome documental");
    expect(JSON.stringify(next)).not.toContain("available");
  });
  it("requires the exact document,patient,monotonic version and complete facts on a fresh Auth read", () => {
    expect(parseTransferReference(packet, expected).id).toBe(id);
    const mutations = [
      (r: typeof packet) => {
        r.data.id = patient;
      },
      (r: typeof packet) => {
        r.data.care_recipient_id = id;
      },
      (r: typeof packet) => {
        r.data.version = 1;
      },
      (r: typeof packet) => {
        r.data.lines.push(r.data.lines[0]);
      },
      (r: typeof packet) => {
        r.data.transfer.declaration.destination = "CARE_TEAM";
      },
      (r: typeof packet) => {
        r.data.transfer.canDispatch = true;
      },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(packet);
      mutate(copy);
      expect(() => parseTransferReference(copy, expected)).toThrow();
    }
    expect(() => parseTransferReference({ data: { id } }, expected)).toThrow();
  });
  it("accepts terminal consultations without creating an available command and rejects inconsistent agreement authors", () => {
    const copy = structuredClone(packet) as unknown as { data: SupplyDocument };
    copy.data.transfer!.state = "declined";
    copy.data.transfer!.canAgree = false;
    copy.data.transfer!.agreement = {
      actor: counterparty,
      reason: "Recusa própria",
      decision: "decline",
      recordedAt: "2026-11-09T10:01:00Z",
      documentVersion: 2,
    };
    expect(parseTransferReference(copy, expected).transfer?.canAgree).toBe(
      false,
    );
    copy.data.transfer!.agreement.actor = actor;
    expect(() => parseTransferReference(copy, expected)).toThrow();
  });
});
