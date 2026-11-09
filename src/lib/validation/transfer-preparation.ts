import { z } from "zod";
import { quantity } from "@/lib/quantity";
import { requireSupplyConfirmation } from "./supply-confirmation";
import { parseTransferReference } from "./transfer-reference";
import type { TransferDeclaration } from "./transfers";
import type { Custody } from "@/types/documents";
import type { TransferPreparation } from "@/types/transfers";
const custody = z.enum(["FAMILY", "CARE_TEAM"]);
const amount = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const packet = z.object({
  data: z.object({
    patientId: z.uuid(),
    actor: z.uuid(),
    source: custody,
    destination: custody,
    referenceHash: z.string().regex(/^[a-f0-9]{64}$/),
    checkedAt: z.iso.datetime({ offset: true }),
    people: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        role: z.enum(["admin", "family", "professional", "supervisor"]),
      }),
    ),
    products: z.array(
      z.object({
        id: z.string().min(1).max(120),
        name: z.string(),
        category: z.string(),
        unit: z.string(),
        quantityDecimals: z.number().int().min(0).max(6),
        active: z.boolean(),
        available: amount,
      }),
    ),
    origins: z
      .array(
        z.object({
          id: z.uuid(),
          code: z.string(),
          createdAt: z.iso.datetime({ offset: true }),
          productIds: z.array(z.string().min(1).max(120)),
        }),
      )
      .max(100),
    originTotal: z.number().int().nonnegative(),
  }),
});
/** An authenticated response must still match its exact actor,patient and custody. */
export function parseTransferPreparation(
  value: unknown,
  expected: { patientId: string; userId: string; source: Custody },
): TransferPreparation {
  const parsed = packet.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta da preparação não pôde ser conferida. Consulte novamente.",
    );
  const row = parsed.data.data;
  if (
    row.patientId !== expected.patientId ||
    row.actor !== expected.userId ||
    row.source !== expected.source ||
    row.destination === row.source ||
    row.people.some((p) => p.id === expected.userId) ||
    new Set(row.people.map((p) => p.id)).size !== row.people.length ||
    new Set(row.products.map((p) => p.id)).size !== row.products.length ||
    new Set(row.origins.map((p) => p.id)).size !== row.origins.length ||
    row.originTotal < row.origins.length ||
    row.origins.some((o) => new Set(o.productIds).size !== o.productIds.length)
  )
    throw new Error(
      "A referência não corresponde ao paciente,perfil e custódia consultados. Seu preenchimento foi preservado.",
    );
  return row;
}

/** Correlate a new declaration to the exact submitted facts,including lost-response recovery. */
export function requireTransferDeclarationConfirmation(
  value: unknown,
  expected: {
    patientId: string;
    userId: string;
    declaration: TransferDeclaration["declaration"];
  },
) {
  const row = requireSupplyConfirmation(value, {
    patientId: expected.patientId,
    type: "ENT",
  });
  parseTransferReference(
    { data: row },
    { id: row.id, patientId: expected.patientId, minimumVersion: 1 },
  );
  const actual = row.transfer!,
    sent = expected.declaration,
    person = actual.declaration;
  const sameId = (left: string, right: string) =>
    left.toLowerCase() === right.toLowerCase();
  if (
    !sameId(person.actor.id, expected.userId) ||
    person.source !== sent.source ||
    person.reason !== sent.reason ||
    person.referenceHash !== sent.referenceHash ||
    !sameId(person.counterparty.id, sent.counterpartyId) ||
    !sameId(person.recipient.id, sent.recipientId) ||
    (actual.originDocumentId ?? "").toLowerCase() !==
      (sent.originDocumentId ?? "").toLowerCase() ||
    row.lines.length !== sent.lines.length ||
    new Set(row.lines.map((line) => line.product_id)).size !==
      row.lines.length ||
    row.lines.some(
      (line) =>
        !sent.lines.some(
          (item) =>
            item.productId === line.product_id &&
            quantity(item.quantity).eq(line.quantity),
        ),
    )
  )
    throw new Error(
      "A confirmação não corresponde à declaração enviada. Recupere a mesma tentativa.",
    );
  return row;
}
