import { describe, expect, it } from "vitest";
import {
  createTransferSchema,
  transferCommandSchema,
} from "@/lib/validation/transfers";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const input = {
  careRecipientId: id,
  idempotencyKey: id,
  declaration: {
    source: "CARE_TEAM",
    counterpartyId: id,
    recipientId: id,
    originDocumentId: null,
    referenceHash: "ab".repeat(32),
    reason: "Declaração física própria",
    lines: [{ productId: "fralda", quantity: "3,5" }],
  },
};
describe("bilateral transfer boundary", () => {
  it("normalizes exact positive base quantities and refuses authority, receipt and malformed declaration fields", () => {
    expect(
      createTransferSchema.parse(input).declaration.lines[0].quantity,
    ).toBe("3.5");
    for (const override of [
      { source: "TRANSIT" },
      { reason: null },
      { referenceHash: "old" },
      { counterpartyId: null },
      { acceptedBy: id },
      { agreement: true },
      { lines: [{ productId: "fralda", quantity: "0" }] },
      { lines: [{ productId: "fralda", quantity: "NaN" }] },
      { lines: [...input.declaration.lines, ...input.declaration.lines] },
    ])
      expect(
        createTransferSchema.safeParse({
          ...input,
          declaration: { ...input.declaration, ...override },
        }).success,
      ).toBe(false);
  });
  it("keeps declaration, counterparty decision, dispatch and personal receipt as distinct commands", () => {
    const command = {
      idempotencyKey: id,
      expectedVersion: 2,
      action: "agree",
      body: { reason: "Concordância da própria pessoa" },
    };
    expect(transferCommandSchema.safeParse(command).success).toBe(true);
    expect(
      transferCommandSchema.safeParse({
        ...command,
        action: "dispatch",
        body: {},
      }).success,
    ).toBe(true);
    for (const override of [
      { action: "receive" },
      { action: "dispatch", body: { reason: "Não integra a expedição" } },
      { body: { reason: "Concordância", actorId: id } },
      { expectedVersion: null },
      { expectedVersion: 2147483648 },
      { body: { reason: "😀".repeat(501) } },
    ])
      expect(
        transferCommandSchema.safeParse({ ...command, ...override }).success,
      ).toBe(false);
  });
  it("returns safe actionable conflicts without including database identity or private reasons", () => {
    for (const message of [
      "stale transfer preparation",
      "stale transfer version",
      "transfer decision already settled",
      "insufficient transfer stock",
    ]) {
      try {
        databaseError({ code: "PT409", message });
        throw Error("expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe("VERSION_CONFLICT");
        expect((error as ApiError).status).toBe(409);
      }
    }
  });
});
