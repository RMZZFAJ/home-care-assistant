import { z } from "zod";
import { consumptionPreparationPurposes } from "../forms/consumption-preparation-purposes";
import { consumptionCommand } from "./consumption";
import { exactQuantity } from "./exact-quantity";
import { draftNavigationSchema } from "./draft-navigation";
import { quantity } from "../quantity";

const id = z.uuid(),
  version = z.number().int().positive(),
  hash = z.string().regex(/^[0-9a-f]{64}$/);
const text = (max: number) =>
  z
    .string()
    .refine(
      (v) => v.length <= max,
      `Este campo permite até ${max} caracteres.`,
    );
const location = z.enum(["FAMILY", "CARE_TEAM"]),
  kind = z.enum(["consumption", "shortage"]);
const purpose = z.enum(consumptionPreparationPurposes),
  instant = z.iso.datetime({ offset: true });
const line = z.object({
  productId: text(120).min(1),
  quantity: exactQuantity,
  unit: text(80),
  name: text(300).optional(),
});
const revision = z.object({
  id,
  version,
  actor_id: id,
  actor_name: z.string().nullable(),
  body: z.string(),
  lines: z.array(line),
  created_at: instant,
});
export const consumptionReportSchema = z.object({
  id,
  care_recipient_id: id,
  kind,
  location,
  status: z.enum(["reported", "confirmed", "rejected"]),
  body: z.string(),
  created_at: instant,
  version,
  reported_by: id,
  reported_name: z.string().nullable(),
  lines: z.array(line),
  current_lines: z.array(line),
  confirmed_by: id.nullable(),
  confirmed_at: instant.nullable(),
  source_reminder_id: id.nullable().optional(),
  revisions: z.array(revision),
  decision: z
    .object({
      id,
      version,
      actor_id: id,
      actor_name: z.string().nullable(),
      accepted: z.boolean(),
      reason: z.string().nullable(),
      created_at: instant,
    })
    .nullable(),
  movements: z.array(
    z.object({
      id,
      productId: z.string(),
      quantity: exactQuantity,
      source: location,
      destination: location.nullable(),
      createdAt: instant,
    }),
  ),
  replayed: z.boolean().optional(),
});
// A hash-bound reference is a preserved payload;do not normalize its values.
const referenceLine = line
  .extend({
    quantity: z
      .string()
      .max(64)
      .refine(
        (v) => exactQuantity.safeParse(v).success,
        "A quantidade preservada não pôde ser conferida.",
      ),
  })
  .passthrough();
const referenceRevision = revision
  .extend({ lines: z.array(referenceLine) })
  .passthrough();
const reportReference = z
  .object({
    id,
    version,
    kind,
    location,
    status: z.enum(["reported", "confirmed", "rejected"]),
    body: z.string(),
    reportedBy: id,
    reportedName: z.string().nullable(),
    createdAt: instant,
    lines: z.array(referenceLine),
    lastSupplement: referenceRevision.nullable(),
  })
  .strict();
export const consumptionPreparationFieldsSchema = z
  .object({
    kind: z.union([kind, z.literal("")]),
    location,
    text: text(2000),
    reason: text(1000),
    reminderId: z.union([id, z.literal("")]),
    lines: z
      .array(
        z
          .object({
            productId: text(120).min(1),
            name: text(300),
            unit: text(80),
            quantity: text(64),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .refine(
    (v) => new Set(v.lines.map((l) => l.productId)).size === v.lines.length,
    "Não repita materiais.",
  );
export const consumptionPreparationReferenceSchema = z
  .object({
    patientId: id,
    purpose,
    targetResourceId: id,
    location,
    report: reportReference.nullable(),
    catalog: z.array(
      z
        .object({
          id: text(120),
          name: z.string(),
          unit: z.string(),
          decimals: z.number().int().min(0).max(6),
          active: z.boolean(),
        })
        .strict(),
    ),
    reminder: z.record(z.string(), z.unknown()).nullable(),
    ledgerHash: hash.nullable(),
  })
  .strict();
export const consumptionPreparationContentSchema = z
  .object({
    consumption: consumptionPreparationFieldsSchema,
    reference: consumptionPreparationReferenceSchema.nullable(),
    referenceHash: hash.nullable(),
  })
  .strict();
const scope = {
  careRecipientId: id,
  kind: z.literal("CONSUMPTION"),
  purpose,
  targetDocumentId: z.null(),
  targetResourceId: id,
  id: id.nullable(),
  expectedRevision: version.nullable(),
  idempotencyKey: id,
};
export const consumptionPreparationSaveSchema = z
  .object({
    ...scope,
    action: z.literal("save"),
    content: consumptionPreparationContentSchema,
    navigation: draftNavigationSchema,
  })
  .strict();
export const consumptionPreparationMutationSchema = z
  .object({ ...scope, action: z.enum(["discard", "acknowledge"]) })
  .strict();
export const consumptionPreparationCommandSchema = z
  .union([
    consumptionPreparationSaveSchema,
    consumptionPreparationMutationSchema,
  ])
  .superRefine((v, c) => {
    if (
      (v.id === null) !== (v.expectedRevision === null) ||
      (v.action !== "save" && v.id === null) ||
      (v.purpose.startsWith("consumption_report_") &&
        v.targetResourceId !== v.careRecipientId) ||
      (v.action === "save" && v.navigation.stage !== "consumption_preparation")
    )
      c.addIssue({
        code: "custom",
        message: "Confira o alvo, a revisão e a etapa do preenchimento.",
      });
  });
export const consumptionPreparationReferenceQuery = z
  .object({
    careRecipientId: id,
    purpose,
    targetResourceId: id,
    fields: consumptionPreparationFieldsSchema,
  })
  .strict();
export const consumptionPreparationCommitSchema = z
  .object({
    careRecipientId: id,
    purpose,
    targetResourceId: id,
    draftCommit: z.object({ id, revision: version }).strict(),
    idempotencyKey: id,
    referenceHash: hash,
    command: consumptionCommand,
  })
  .strict()
  .superRefine((v, c) => {
    const cmd = v.command,
      report = v.purpose.startsWith("consumption_report_");
    if (
      cmd.idempotencyKey !== v.idempotencyKey ||
      (report
        ? cmd.action !== "report" ||
          cmd.careRecipientId !== v.careRecipientId ||
          v.targetResourceId !== v.careRecipientId ||
          cmd.location !==
            (v.purpose.endsWith("family") ? "FAMILY" : "CARE_TEAM")
        : cmd.action === "report" || cmd.id !== v.targetResourceId) ||
      (v.purpose === "consumption_supplement" && cmd.action !== "supplement") ||
      (v.purpose === "consumption_accept" &&
        (cmd.action !== "confirm" || !cmd.accept)) ||
      (v.purpose === "consumption_reject" &&
        (cmd.action !== "confirm" || cmd.accept))
    )
      c.addIssue({
        code: "custom",
        message:
          "A confirmação precisa conservar a intenção e o mesmo recurso.",
      });
  });
export const consumptionPreparationReceiptSchema = z
  .object({
    patientId: id,
    purpose,
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: instant,
    command: consumptionCommand,
    referenceHash: hash,
    preparedConsumption: consumptionPreparationFieldsSchema,
    preparedReference: consumptionPreparationReferenceSchema,
    report: consumptionReportSchema,
  })
  .strict();
export type ConsumptionPreparationFields = z.infer<
  typeof consumptionPreparationFieldsSchema
>;
export type ConsumptionPreparationContent = z.infer<
  typeof consumptionPreparationContentSchema
>;
export type ConsumptionPreparationReference = z.infer<
  typeof consumptionPreparationReferenceSchema
>;
export type ConsumptionPreparationCommit = z.infer<
  typeof consumptionPreparationCommitSchema
>;
export type ConsumptionPreparationReceipt = z.infer<
  typeof consumptionPreparationReceiptSchema
>;
function checked<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const p = schema.safeParse(value);
  if (!p.success)
    throw new Error(
      "Não foi possível conferir a resposta do relato. Consulte novamente ou recupere a mesma tentativa.",
    );
  return p.data;
}
export function parseConsumptionPreparationReference(
  value: unknown,
  scope: { patientId: string; purpose: string; targetResourceId: string },
) {
  const row = checked(
      z
        .object({
          reference: consumptionPreparationReferenceSchema,
          referenceHash: hash,
        })
        .strict(),
      value,
    ),
    r = row.reference;
  if (
    r.patientId !== scope.patientId ||
    r.purpose !== scope.purpose ||
    r.targetResourceId !== scope.targetResourceId ||
    (r.report && r.report.id !== scope.targetResourceId)
  )
    throw new Error(
      "A referência não corresponde ao relato e ao paciente selecionados.",
    );
  return row;
}
export function parseConsumptionPreparationReceipt(
  value: unknown,
  scope: {
    patientId: string;
    purpose: string;
    targetResourceId?: string | null;
    userId: string;
  },
) {
  const row = checked(consumptionPreparationReceiptSchema, value),
    cmd = row.command,
    r = row.report,
    f = row.preparedConsumption;
  let invalid =
    row.patientId !== scope.patientId ||
    row.purpose !== scope.purpose ||
    row.targetResourceId !== scope.targetResourceId ||
    row.actorId !== scope.userId ||
    r.id !== row.resourceId ||
    r.care_recipient_id !== scope.patientId ||
    r.location !== f.location;
  const pair = (
    a: readonly { productId: string; quantity: string; unit?: string }[],
    b: readonly { productId: string; quantity: string; unit?: string }[],
  ) =>
    a.length === b.length &&
    a.every((l) =>
      b.some(
        (v) =>
          v.productId === l.productId &&
          exactQuantity.safeParse(v.quantity).success &&
          exactQuantity.safeParse(l.quantity).success &&
          quantity(v.quantity).eq(quantity(l.quantity)) &&
          v.unit === l.unit,
      ),
    );
  invalid ||= row.preparedReference.location !== f.location;
  if (cmd.action === "report" || cmd.action === "supplement")
    invalid ||=
      f.text.trim() !== cmd.text ||
      !pair(f.lines, cmd.lines) ||
      f.lines.some(
        (l) =>
          !row.preparedReference.catalog.some(
            (c) =>
              c.id === l.productId && c.name === l.name && c.unit === l.unit,
          ),
      );
  if (cmd.action === "report")
    invalid ||=
      !row.purpose.startsWith("consumption_report_") ||
      f.kind !== cmd.kind ||
      (f.reminderId || undefined) !== cmd.reminderId ||
      row.preparedReference.report !== null ||
      row.targetResourceId !== row.patientId;
  else {
    invalid ||=
      cmd.id !== row.targetResourceId ||
      row.preparedReference.report?.id !== cmd.id ||
      row.preparedReference.report?.version !== cmd.expectedVersion ||
      row.preparedReference.report?.kind !== f.kind;
    if (cmd.action === "supplement")
      invalid ||= row.purpose !== "consumption_supplement";
    else
      invalid ||=
        row.purpose !==
          (cmd.accept ? "consumption_accept" : "consumption_reject") ||
        f.lines.length !== 0 ||
        (!cmd.accept && f.reason.trim() !== cmd.reason) ||
        !pair(row.preparedReference.report?.lines ?? [], r.current_lines);
  }
  if (cmd.action === "report")
    invalid ||=
      r.reported_by !== scope.userId ||
      r.version !== 1 ||
      r.status !== "reported" ||
      r.kind !== cmd.kind ||
      r.body !== cmd.text ||
      r.location !== cmd.location ||
      (r.source_reminder_id !== undefined &&
        (r.source_reminder_id ?? undefined) !== cmd.reminderId) ||
      !pair(r.lines, cmd.lines);
  else if (cmd.action === "supplement") {
    const last = r.revisions.at(-1);
    invalid ||=
      r.id !== cmd.id ||
      r.version !== cmd.expectedVersion + 1 ||
      r.status !== "reported" ||
      !last ||
      last.actor_id !== scope.userId ||
      last.body !== cmd.text ||
      last.version !== r.version ||
      !pair(r.current_lines, cmd.lines);
  } else {
    invalid ||=
      r.id !== cmd.id ||
      r.version !== cmd.expectedVersion ||
      r.status !== (cmd.accept ? "confirmed" : "rejected") ||
      r.confirmed_by !== scope.userId ||
      r.decision?.actor_id !== scope.userId ||
      r.decision?.accepted !== cmd.accept ||
      (r.decision?.reason ?? undefined) !== cmd.reason;
    if (cmd.accept && r.kind === "consumption")
      invalid ||=
        r.movements.length !== r.current_lines.length ||
        r.current_lines.some(
          (l) =>
            !r.movements.some(
              (m) =>
                m.productId === l.productId &&
                quantity(m.quantity).eq(l.quantity) &&
                m.source === r.location &&
                m.destination === null,
            ),
        );
    else invalid ||= r.movements.length !== 0;
  }
  if (
    row.preparedReference.patientId !== scope.patientId ||
    row.preparedReference.purpose !== scope.purpose ||
    row.preparedReference.targetResourceId !== scope.targetResourceId
  )
    invalid = true;
  if (invalid)
    throw new Error(
      "O resultado não corresponde à intenção, à autoria e ao relato preservados.",
    );
  return row;
}
export function parseConsumptionPreparationConfirmation(
  value: unknown,
  packet: ConsumptionPreparationCommit,
  userId: string,
) {
  const row = checked(
    z
      .object({
        id,
        revision: version,
        savedAt: instant,
        state: z.literal("consumed"),
        consumedDocumentId: z.null(),
        consumedResourceId: id,
        consumedResult: consumptionPreparationReceiptSchema,
        replayed: z.boolean(),
      })
      .strict(),
    value,
  );
  const receipt = parseConsumptionPreparationReceipt(row.consumedResult, {
    patientId: packet.careRecipientId,
    purpose: packet.purpose,
    targetResourceId: packet.targetResourceId,
    userId,
  });
  const stable = (v: unknown): string =>
    JSON.stringify(v, (_, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(
            Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
          )
        : x,
    );
  if (
    row.id !== packet.draftCommit.id ||
    row.revision !== packet.draftCommit.revision + 1 ||
    row.consumedResourceId !== receipt.resourceId ||
    receipt.referenceHash !== packet.referenceHash ||
    stable(receipt.command) !== stable(packet.command)
  )
    throw new Error(
      "A confirmação não corresponde à mesma tentativa preservada.",
    );
  return { ...row, consumedResult: receipt };
}
export const consumptionPreparationPendingSchema = z
  .object({
    version: z.literal(1),
    userId: id,
    packet: consumptionPreparationCommitSchema,
  })
  .strict();

/** Prove an exact pending act from an authenticated personal read without a new POST. */
export function consumptionPendingConfirmedByRead(
  row: {
    id: string;
    revision: number;
    state: string;
    consumedResourceId?: string | null;
    consumedResult?: unknown;
  } | null,
  packet: ConsumptionPreparationCommit,
  userId: string,
) {
  if (
    !row ||
    row.state !== "consumed" ||
    !consumptionPreparationCommitSchema.safeParse(packet).success ||
    row.id !== packet.draftCommit.id ||
    row.revision !== packet.draftCommit.revision + 1
  )
    return false;
  try {
    const receipt = parseConsumptionPreparationReceipt(row.consumedResult, {
      patientId: packet.careRecipientId,
      purpose: packet.purpose,
      targetResourceId: packet.targetResourceId,
      userId,
    });
    const stable = (v: unknown): string =>
      JSON.stringify(v, (_, x) =>
        x && typeof x === "object" && !Array.isArray(x)
          ? Object.fromEntries(
              Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
            )
          : x,
      );
    return (
      row.consumedResourceId === receipt.resourceId &&
      receipt.referenceHash === packet.referenceHash &&
      stable(receipt.command) === stable(packet.command)
    );
  } catch {
    return false;
  }
}
