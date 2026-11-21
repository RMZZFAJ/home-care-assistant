import { z } from "zod";
import {
  createSupplySchema,
  reviseSupplySchema,
} from "@/lib/validation/documents";
import { balanceDraftContent } from "@/lib/validation/creation-drafts";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import {
  supplyWriteConfirmationSchema,
  supplyWriteConfirmation,
} from "@/lib/supply/write-confirmation";
import { quantity } from "@/lib/quantity";

const reviseUrl = /^\/api\/documents\/([0-9a-f-]{36})\/revise$/;
const wire = z
  .object({
    url: z.string(),
    body: z.record(z.string(), z.unknown()),
    draft: z.boolean(),
  })
  .strict();
const sameAttempt = (a: unknown, b: unknown) =>
  JSON.stringify(a, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
            .map((k) => [k, v[k]]),
        )
      : v,
  ) ===
  JSON.stringify(b, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
            .map((k) => [k, v[k]]),
        )
      : v,
  );
export type CountAttempt = z.infer<typeof wire>;
export type CountScope = {
  userId: string;
  patientId: string;
  documentId: string | null;
};
export function countAttemptTarget(value: unknown): string | null {
  const v = wire.parse(value);
  if (v.url === "/api/documents") return null;
  return z.uuid().parse(reviseUrl.exec(v.url)?.[1]);
}
/** Validate the packet without normalizing or replacing the original wire body. */
export function checkCountAttempt(
  value: unknown,
  scope: CountScope,
): CountAttempt {
  const v = wire.parse(value),
    target = countAttemptTarget(v);
  if (target === null) {
    const body = createSupplySchema.parse(v.body);
    if (
      body.careRecipientId !== scope.patientId ||
      body.type !== "BAL" ||
      body.draft !== v.draft
    )
      throw Error("Wrong balance creation scope");
  } else {
    const body = reviseSupplySchema.parse(v.body);
    if (
      target !== scope.documentId ||
      body.draftKind !== "BAL" ||
      body.submit === v.draft
    )
      throw Error("Wrong balance revision scope");
  }
  return v;
}
const cache = z
  .object({
    content: balanceDraftContent.optional(),
    version: z.literal(2).optional(),
    userId: z.uuid().optional(),
    patientId: z.uuid().optional(),
    savedAt: z.number().finite(),
    assignmentId: z.uuid().nullable().optional(),
    referenceRevision: z.string().regex(/^\d+$/).nullable().optional(),
    counts: balanceDraftContent.shape.counts.optional(),
    notes: balanceDraftContent.shape.notes.optional(),
    observationTimes: balanceDraftContent.shape.observationTimes.optional(),
    pending: wire.nullable().optional(),
  })
  .strict();
export function parseCountCache(raw: string, scope: CountScope) {
  const v = cache.parse(JSON.parse(raw));
  if (
    v.content &&
    (v.content.context.documentId !==
      (v.pending ? countAttemptTarget(v.pending) : scope.documentId) ||
      !sameAttempt(v.content.counts, v.counts ?? {}) ||
      v.content.notes !== (v.notes ?? "") ||
      !sameAttempt(v.content.observationTimes, v.observationTimes ?? {}))
  )
    throw Error("Preserved balance content differs from its fields");
  if (
    (v.version === 2 || v.userId !== undefined || v.patientId !== undefined) &&
    (v.version !== 2 ||
      v.userId !== scope.userId ||
      v.patientId !== scope.patientId)
  )
    throw Error("Wrong preserved balance scope");
  if (v.pending) {
    checkCountAttempt(v.pending, scope);
    const payload = (
      countAttemptTarget(v.pending) === null
        ? createSupplySchema.parse(v.pending.body)
        : reviseSupplySchema.parse(v.pending.body)
    ).payload;
    const counts =
      v.counts ??
      Object.fromEntries(payload.lines.map((l) => [l.productId, l.quantity]));
    const notes = v.notes ?? payload.notes ?? "";
    if (
      Object.keys(counts).length !== payload.lines.length ||
      payload.lines.some(
        (l) =>
          !Object.hasOwn(counts, l.productId) ||
          !quantity(counts[l.productId]).eq(l.quantity),
      ) ||
      notes.trim() !== (payload.notes ?? "")
    )
      throw Error("Preserved fields differ from the frozen balance attempt");
    return { ...v, counts, notes };
  }
  return v;
}
type CountFields = Pick<
  z.infer<typeof cache>,
  | "assignmentId"
  | "referenceRevision"
  | "counts"
  | "notes"
  | "observationTimes"
  | "content"
>;
export function preserveCountCache(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  scope: CountScope,
  fields: CountFields,
  pending: CountAttempt | null,
  expected: CountAttempt | null = pending,
) {
  const raw = storage.getItem(key);
  if (raw) {
    const current = parseCountCache(raw, scope);
    if (current.pending && !sameAttempt(current.pending, expected))
      throw Error(
        "Há outra tentativa preservada neste aparelho. A cópia foi mantida.",
      );
  }
  const next = {
    ...fields,
    version: 2 as const,
    userId: scope.userId,
    patientId: scope.patientId,
    savedAt: Date.now(),
    pending,
  };
  parseCountCache(JSON.stringify(next), scope);
  storage.setItem(key, JSON.stringify(next));
}
export function clearCountCache(
  storage: Pick<Storage, "getItem" | "removeItem">,
  key: string,
  scope: CountScope,
  intent: CountAttempt,
) {
  checkCountAttempt(intent, scope);
  const raw = storage.getItem(key),
    current = raw ? parseCountCache(raw, scope) : null;
  if (!current?.pending || !sameAttempt(current.pending, intent))
    throw Error(
      "A referência neste aparelho mudou. Ela foi preservada; confira a tentativa correspondente.",
    );
  storage.removeItem(key);
}
export function clearIdleCountCache(
  storage: Pick<Storage, "getItem" | "removeItem">,
  key: string,
  scope: CountScope,
) {
  const raw = storage.getItem(key);
  if (raw && parseCountCache(raw, scope).pending)
    throw Error(
      "Há uma tentativa de contagem preservada; o descarte privado não a encerra.",
    );
  storage.removeItem(key);
}
export function requireCountConfirmation(
  value: unknown,
  attempt: CountAttempt,
  scope: CountScope,
) {
  checkCountAttempt(attempt, scope);
  const target = countAttemptTarget(attempt),
    body =
      target === null
        ? createSupplySchema.parse(attempt.body)
        : reviseSupplySchema.parse(attempt.body);
  const expected = supplyWriteConfirmation(scope.userId, body, target),
    actual = supplyWriteConfirmationSchema.parse(
      z.object({ confirmation: z.unknown() }).parse(value).confirmation,
    );
  if (
    Object.keys(expected).some(
      (k) =>
        expected[k as keyof typeof expected] !==
        actual[k as keyof typeof actual],
    )
  )
    throw Error(
      "A confirmação não corresponde à tentativa da contagem. A referência foi preservada.",
    );
  const result = requireSupplyConfirmation(value, {
    patientId: scope.patientId,
    type: "BAL",
    id: target ?? undefined,
    minimumVersion: "expectedVersion" in body ? body.expectedVersion + 1 : 1,
  });
  if (target === null) {
    const identity = z
      .object({ created_by: z.uuid(), idempotency_key: z.uuid() })
      .parse(result);
    if (
      identity.created_by !== scope.userId ||
      identity.idempotency_key !== body.idempotencyKey
    )
      throw Error("A ficha não pertence à tentativa preservada.");
  }
  const lines = new Map(
    body.payload.lines.map((l) => [l.productId, l.quantity]),
  );
  if (
    lines.size !== body.payload.lines.length ||
    result.lines.length !== lines.size ||
    result.lines.some(
      (l) =>
        !lines.has(l.product_id) ||
        !quantity(lines.get(l.product_id)!).eq(l.quantity),
    ) ||
    (result.payload.notes ?? "") !== (body.payload.notes ?? "")
  )
    throw Error(
      "O resultado não confirma os valores desta contagem. Recupere a mesma tentativa.",
    );
  return result;
}
