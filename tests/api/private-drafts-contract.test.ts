import { describe, it, expect } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { createSupplySchema } from "@/lib/validation/documents";
import { GET, POST } from "@/app/api/drafts/route";
import { databaseError, ApiError } from "@/lib/server/api";
const patient = "10000000-0000-4000-8000-000000000001",
  key = "20000000-0000-4000-8000-000000000001";
const content = {
  lines: [
    {
      productId: "material",
      productName: "Nome no preenchimento privado",
      category: "higiene",
      unit: "unidade",
      currentStock: "1,",
      stockObservation: "legacy_unclassified",
      stockObservationAt: null,
      urgent: false,
    },
  ],
  extraItems: [{ id: "extra", name: "", currentStock: null, urgent: false }],
  observations: [""],
};
const save = {
  careRecipientId: patient,
  kind: "REQ",
  targetDocumentId: null,
  id: null,
  expectedRevision: null,
  idempotencyKey: key,
  action: "save",
  content,
};
function request(body: unknown, origin = "https://care.example") {
  return new Request("https://care.example/api/drafts", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("private typed REQ/BAL draft boundary", () => {
  it("keeps the private legacy BAL ledger reference separate from purchases and scheduled assignments", () => {
    const base = {
      careRecipientId: patient,
      type: "BAL",
      payload: {
        lines: [{ productId: "material", quantity: "0" }],
        balanceReferenceRevision: "12",
      },
      idempotencyKey: key,
      draft: false,
    };
    expect(createSupplySchema.safeParse(base).success).toBe(true);
    expect(createSupplySchema.safeParse({ ...base, type: "COM" }).success).toBe(
      false,
    );
    expect(
      createSupplySchema.safeParse({
        ...base,
        payload: { ...base.payload, balanceReferenceRevision: "yesterday" },
      }).success,
    ).toBe(false);
    expect(
      createSupplySchema.safeParse({
        ...base,
        payload: {
          ...base.payload,
          balanceAssignment: { id: key, version: 1, referenceRevision: "12" },
        },
      }).success,
    ).toBe(false);
  });
  it("preserves incomplete values privately while the issuance contract still rejects them", () => {
    const result = creationDraftCommandSchema.parse(save);
    expect(result.action).toBe("save");
    if (result.action === "save" && result.kind === "REQ")
      expect(result.content.lines[0].currentStock).toBe("1,");
    expect(
      requisitionInputSchema.safeParse({
        careRecipientId: patient,
        idempotencyKey: key,
        ...content,
      }).success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({ ...save, kind: "BAL" }).success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({
        ...save,
        id: key,
        expectedRevision: null,
      }).success,
    ).toBe(false);
  });
  it("refuses owner, authority, technical state, unknown payload and malformed dates before authentication", async () => {
    for (const body of [
      { ...save, ownerId: key },
      { ...save, state: "consumed" },
      { ...save, revision: 99 },
      { ...save, kind: "ENT" },
      { ...save, content: { ...content, actorId: key } },
      {
        ...save,
        content: {
          ...content,
          lines: [{ ...content.lines[0], requestedQuantity: 3 }],
        },
      },
      {
        ...save,
        content: {
          ...content,
          lines: [{ ...content.lines[0], stockObservationAt: "tomorrow" }],
        },
      },
    ]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("rejects cross-site writes and unsupported read contexts without resolving a private row", async () => {
    expect((await POST(request(save, "https://attacker.example"))).status).toBe(
      403,
    );
    for (const query of [
      `kind=UNKNOWN&careRecipientId=${patient}`,
      `kind=COM&purpose=divergence&targetDocumentId=${key}&careRecipientId=${patient}`,
      `kind=ENT&purpose=approve&targetDocumentId=${key}&careRecipientId=${patient}`,
      `kind=ENT&purpose=divergence&careRecipientId=${patient}`,
      `kind=REQ&careRecipientId=${patient}&targetDocumentId=${key}`,
      `kind=BAL&careRecipientId=${patient}&targetDocumentId=bad`,
    ])
      expect(
        (await GET(new Request("https://care.example/api/drafts?" + query)))
          .status,
      ).toBe(400);
  });
  it("COM ENT and BAL confirmations may consume a private draft while saving cannot emit one", () => {
    const base = {
      careRecipientId: patient,
      type: "COM",
      payload: {
        origin: "purchase",
        lines: [{ productId: "material", quantity: "1" }],
      },
      idempotencyKey: key,
      draft: false,
    };
    expect(createSupplySchema.safeParse(base).success).toBe(true);
    const draftCommit = { id: key, revision: 5 };
    expect(createSupplySchema.safeParse({ ...base, draftCommit }).success).toBe(
      true,
    );
    expect(
      createSupplySchema.safeParse({ ...base, type: "BAL", draftCommit })
        .success,
    ).toBe(true);
    expect(
      createSupplySchema.safeParse({
        ...base,
        type: "BAL",
        draft: true,
        draftCommit,
      }).success,
    ).toBe(false);
    expect(createSupplySchema.safeParse({...base,type:"ENT",payload:{lines:base.payload.lines,source:"FAMILY",destination:"CARE_TEAM",recipientId:key,recipientReason:"Pessoa indicada para a entrega"},draftCommit}).success).toBe(true);
    expect(createSupplySchema.safeParse({...base,draft:true,draftCommit}).success).toBe(false);
  });
  it("classifies private CAS conflicts without asking for a new physical count", () => {
    try {
      databaseError({ code: "PT409", message: "stale private draft revision" });
      throw new Error("must reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "DRAFT_VERSION_CONFLICT",
        status: 409,
      });
    }
  });
});
