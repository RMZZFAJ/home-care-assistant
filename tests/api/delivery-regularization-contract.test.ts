import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/documents/[id]/route";
import { supplyCommandSchema } from "@/lib/validation/documents";
import { ApiError, databaseError } from "@/lib/server/api";
const id = "20000000-0000-4000-8000-000000000001";
const proposal = {
  reason: "Minha justificativa",
  basis: "Evidências e ressalvas próprias",
  reviewerId: id,
  lines: [
    {
      lineId: id,
      receivedQuantity: "0",
      returnedQuantity: "1,5",
      missingQuantity: "0",
    },
  ],
};
const packet = (action: string, body: unknown) => ({
  action,
  body,
  idempotencyKey: id,
  expectedVersion: 3,
});
describe("administrative regularization boundary", () => {
  it("normalizes exact quantities and accepts only the own intent, never supplied unknown balance or actor", () => {
    const result = supplyCommandSchema.parse(
      packet("propose_regularization", proposal),
    );
    expect(result.body).toMatchObject({ lines: [{ returnedQuantity: "1.5" }] });
    for (const extra of [
      { actorId: id },
      { before_snapshot: {} },
      { unknownQuantity: "0" },
      { decision: { accept: true } },
    ])
      expect(
        supplyCommandSchema.safeParse(
          packet("propose_regularization", { ...proposal, ...extra }),
        ).success,
      ).toBe(false);
  });
  it("rejects malformed actions before authentication without treating absent facts as zero", async () => {
    for (const [action, body] of [
      [
        "propose_regularization",
        {
          ...proposal,
          lines: [{ ...proposal.lines[0], receivedQuantity: null }],
        },
      ],
      [
        "propose_regularization",
        {
          ...proposal,
          lines: [{ ...proposal.lines[0], unknownQuantity: "0" }],
        },
      ],
      ["propose_regularization", { ...proposal, reviewerId: null }],
      [
        "review_regularization",
        { caseId: id, accept: null, reason: "Motivo próprio" },
      ],
      [
        "review_regularization",
        { caseId: id, accept: true, reason: "Motivo próprio", lines: [] },
      ],
      ["withdraw_regularization", { caseId: id, reason: null }],
      [
        "record_regularization_finding",
        { caseId: id, text: "Relato próprio", actorId: id },
      ],
    ] as const) {
      const response = await POST(
        new Request("https://care.example/api/documents/" + id, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://care.example",
          },
          body: JSON.stringify(packet(action, body)),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
  it("separates obsolete decisions from input errors and masks authority details", () => {
    for (const [message, code] of [
      ["stale regularization version", "VERSION_CONFLICT"],
      ["regularization decision conflict", "VERSION_CONFLICT"],
      ["regularization proposal not eligible", "VERSION_CONFLICT"],
      ["regularization exceeds pending transit", "VALIDATION_ERROR"],
      [
        "unknown physical facts require an active follow-up owner",
        "VALIDATION_ERROR",
      ],
    ]) {
      try {
        databaseError({ code: "P0001", message });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ code });
      }
    }
  });
});
