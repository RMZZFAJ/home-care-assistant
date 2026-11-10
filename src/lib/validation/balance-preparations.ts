import { z } from "zod";
import { balancePreparationPurposes } from "../forms/balance-preparation-purposes";
import { balanceCommandSchema } from "./balances";
import { draftNavigationSchema } from "./draft-navigation";

const id = z.uuid(),
  version = z.number().int().positive().max(2147483647),
  hash = z.string().regex(/^[0-9a-f]{64}$/);
const field = z
  .string()
  .refine(
    (value) => value.length <= 3000,
    "Este campo permite até 3.000 caracteres.",
  )
  .optional();
export const balancePreparationPurposeSchema = z.enum(
  balancePreparationPurposes,
);
export const balancePreparationFieldsSchema = z
  .object({
    reason: field,
    enabled: field,
    weekday: field,
    shiftTypeId: field,
    shiftTypeLabel: field,
    professionalId: field,
    professionalLabel: field,
    timezone: field,
    startsOn: field,
    targetShiftId: field,
    targetShiftLabel: field,
    targetShiftQuery: field,
  })
  .strict();
export const balancePreparationContentSchema = z
  .object({
    values: balancePreparationFieldsSchema,
    referenceHash: hash.nullable(),
    referenceVersion: version.nullable(),
  })
  .strict();
const scope = {
  careRecipientId: id,
  kind: z.literal("BAL"),
  purpose: balancePreparationPurposeSchema,
  targetDocumentId: z.null(),
  targetResourceId: id,
  id: id.nullable(),
  expectedRevision: version.nullable(),
  idempotencyKey: id,
};
export const balancePreparationSaveSchema = z.object({
  ...scope,
  action: z.literal("save"),
  content: balancePreparationContentSchema,
  navigation: draftNavigationSchema,
});
export const balancePreparationMutationSchema = z
  .object({ ...scope, action: z.enum(["discard", "acknowledge"]) })
  .strict();
export const balancePreparationCommandSchema = z
  .union([
    balancePreparationSaveSchema.strict(),
    balancePreparationMutationSchema,
  ])
  .superRefine((v, ctx) => {
    if (
      (v.id === null) !== (v.expectedRevision === null) ||
      (v.action !== "save" && v.id === null)
    )
      ctx.addIssue({
        code: "custom",
        message: "Confira a identidade e a revisão do preenchimento.",
      });
    if (v.action === "save" && v.navigation.stage !== "bal_" + v.purpose)
      ctx.addIssue({
        code: "custom",
        path: ["navigation"],
        message: "Confira a etapa do preenchimento.",
      });
    if (v.purpose === "configure" && v.targetResourceId !== v.careRecipientId)
      ctx.addIssue({
        code: "custom",
        path: ["targetResourceId"],
        message: "A programação pertence ao paciente selecionado.",
      });
  });
export const balancePreparationCommitSchema = z
  .object({
    careRecipientId: id,
    purpose: balancePreparationPurposeSchema,
    targetResourceId: id,
    draftCommit: z.object({ id, revision: version }).strict(),
    idempotencyKey: id,
    referenceHash: hash,
    expectedVersion: version.nullable(),
    command: balanceCommandSchema.shape.command,
  })
  .strict()
  .superRefine((v, ctx) => {
    const c = v.command,
      action =
        v.purpose === "approve_deferral" || v.purpose === "reject_deferral"
          ? "decide_deferral"
          : v.purpose;
    if (
      c.action !== action ||
      (c.action === "configure" && v.targetResourceId !== v.careRecipientId) ||
      (c.action === "assign" && c.body.cycleId !== v.targetResourceId) ||
      ((c.action === "request_deferral" || c.action === "defer") &&
        c.body.assignmentId !== v.targetResourceId) ||
      (c.action === "decide_deferral" &&
        (c.body.id !== v.targetResourceId ||
          c.body.approve !== (v.purpose === "approve_deferral"))) ||
      ((c.action === "assign" || c.action === "decide_deferral") &&
        v.expectedVersion !== null)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "A confirmação precisa corresponder à decisão e ao registro preservados.",
      });
  });
export const balancePreparationReceiptSchema = z
  .object({
    patientId: id,
    purpose: balancePreparationPurposeSchema,
    targetResourceId: id,
    resourceId: id,
    actorId: id,
    recordedAt: z.iso.datetime({ offset: true }),
    command: balanceCommandSchema.shape.command,
    expectedVersion: version.nullable(),
    referenceHash: hash,
    nativeResult: z.record(z.string(), z.unknown()),
    preparedValues: balancePreparationFieldsSchema,
  })
  .strict();
export type BalancePreparationFields = z.infer<
  typeof balancePreparationFieldsSchema
>;
export type BalancePreparationContent = z.infer<
  typeof balancePreparationContentSchema
>;
export type BalancePreparationCommit = z.infer<
  typeof balancePreparationCommitSchema
>;
export type BalancePreparationReceipt = z.infer<
  typeof balancePreparationReceiptSchema
>;

const instant = z.iso.datetime({ offset: true });
const assignment = z.object({
  id,
  cycle_id: id,
  shift_id: id,
  professional_id: id,
  starts_at: instant,
  ends_at: instant,
  status: z.string().min(1),
  version,
  kind: z.string().min(1),
  missed_at: instant.nullable(),
});
const shift = z
  .object({
    id,
    version,
    professional_id: id,
    professional_name: z.string(),
    type_name: z.string(),
    starts_at: instant,
    ends_at: instant,
    timezone: z.string().min(1),
    status: z.string().min(1),
  })
  .refine(
    (v) => Date.parse(v.ends_at) > Date.parse(v.starts_at),
    "O período do plantão é inválido.",
  );
const targetFacts = z.object({
  starts_at: instant,
  ends_at: instant,
  professional_name: z.string(),
  type_name: z.string(),
});
const deferral = z.object({
  id,
  assignment_id: id.nullable(),
  target_shift_id: id,
  target_shift_version: version,
  target_snapshot: targetFacts,
  reason: z.string(),
  requested_by: id,
  status: z.string(),
  decided_by: id.nullable(),
  decision_reason: z.string().nullable(),
  created_at: instant,
  decided_at: instant.nullable(),
  decision_snapshot: z
    .object({
      actor: z.object({ id, name: z.string() }),
      recordedAt: instant,
      outcome: z.enum(["approved", "rejected"]),
      reason: z.string(),
      deadlineChanged: z.boolean(),
    })
    .nullable(),
  decisionContext: z.object({
    canApprove: z.boolean(),
    canReject: z.boolean(),
    sourceCurrent: z.boolean(),
    sourceDeadline: instant.nullable(),
    targetState: z.enum(["unchanged", "changed", "ineligible", "unavailable"]),
    proposedVersion: version,
    currentTarget: targetFacts
      .extend({ version, status: z.string() })
      .nullable(),
  }),
});
export const balancePreparationReferenceSchema = z
  .object({
    patientId: id,
    purpose: balancePreparationPurposeSchema,
    targetResourceId: id,
    referenceHash: hash,
    workspace: z.object({
      enabled: z.boolean(),
      regime: z
        .object({
          enabled: z.boolean(),
          activated_at: instant.nullable(),
          weekday: z.number().int().min(0).max(6),
          timezone: z.string().min(1),
          shift_type_id: id,
          designated_professional_id: id.nullable(),
          starts_on: z.iso.date(),
          version,
        })
        .nullable(),
      types: z.array(
        z.object({
          id,
          name: z.string(),
          starts_local: z.string(),
          duration_minutes: z.number().int().positive(),
          is_active: z.boolean(),
        }),
      ),
      professionals: z.array(z.object({ id, name: z.string() })),
      targets: z.array(shift),
      assignments: z.array(assignment),
      obligations: z.array(
        z.object({
          id,
          cycle_id: id,
          state: z.string(),
          effective_due: instant,
          original_start: instant,
        }),
      ),
      eligibility: z.object({ assignment: assignment.nullable() }),
      deferrals: z.array(deferral),
    }),
  })
  .superRefine((v, ctx) => {
    for (const [name, rows] of Object.entries({
      types: v.workspace.types,
      professionals: v.workspace.professionals,
      targets: v.workspace.targets,
      assignments: v.workspace.assignments,
      obligations: v.workspace.obligations,
      deferrals: v.workspace.deferrals,
    })) {
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        ctx.addIssue({
          code: "custom",
          path: ["workspace", name],
          message: "Há referências repetidas na resposta.",
        });
    }
    if (v.purpose === "configure" && v.patientId !== v.targetResourceId)
      ctx.addIssue({
        code: "custom",
        path: ["targetResourceId"],
        message: "A programação não corresponde ao paciente.",
      });
  });
export type BalancePreparationReference = z.infer<
  typeof balancePreparationReferenceSchema
>;

export function parseBalancePreparationReference(
  value: unknown,
  scope: { patientId: string; purpose: string; targetResourceId: string },
): BalancePreparationReference {
  const parsed = balancePreparationReferenceSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.patientId !== scope.patientId ||
    parsed.data.purpose !== scope.purpose ||
    parsed.data.targetResourceId !== scope.targetResourceId
  )
    throw new Error(
      "Não foi possível conferir a referência autorizada do balanço. Consulte novamente; seu preenchimento foi preservado.",
    );
  return parsed.data;
}
export const balancePreparationListSchema = z.object({
  items: z
    .array(
      z.object({
        id,
        purpose: balancePreparationPurposeSchema,
        targetResourceId: id,
        state: z.enum(["active", "consumed"]),
        createdAt: instant,
        savedAt: instant,
      }),
    )
    .max(50),
  total: z.number().int().nonnegative(),
});
export type BalancePreparationList = z.infer<
  typeof balancePreparationListSchema
>;
export const balancePreparationPendingSchema = z
  .object({
    packet: balancePreparationCommitSchema,
    content: balancePreparationContentSchema,
  })
  .strict()
  .refine(
    (v) =>
      v.packet.referenceHash === v.content.referenceHash &&
      v.packet.expectedVersion === v.content.referenceVersion &&
      preparationValuesMatchCommand(v.content.values, v.packet.command),
    "A tentativa preservada não corresponde ao preenchimento.",
  );
const confirmationSchema = z.object({
  id,
  ownerId: id,
  patientId: id,
  purpose: balancePreparationPurposeSchema,
  targetResourceId: id,
  revision: version,
  savedAt: instant,
  state: z.literal("consumed"),
  consumedDocumentId: z.null(),
  consumedResourceId: id,
  consumedResult: balancePreparationReceiptSchema,
  replayed: z.boolean(),
});
export function parseBalancePreparationConfirmation(
  value: unknown,
  intent: BalancePreparationCommit,
  userId: string,
) {
  const parsed = confirmationSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta não confirmou a decisão preservada. Recupere a mesma tentativa.",
    );
  const row = parsed.data;
  if (
    row.id !== intent.draftCommit.id ||
    row.revision !== intent.draftCommit.revision + 1 ||
    row.ownerId !== userId ||
    row.patientId !== intent.careRecipientId ||
    row.purpose !== intent.purpose ||
    row.targetResourceId !== intent.targetResourceId
  )
    throw new Error(
      "A resposta não confirmou a decisão preservada. Recupere a mesma tentativa.",
    );
  const receipt = parseBalancePreparationReceipt(
    row.consumedResult,
    {
      patientId: intent.careRecipientId,
      purpose: intent.purpose,
      targetResourceId: intent.targetResourceId,
      userId,
    },
    intent,
  );
  if (receipt.resourceId !== row.consumedResourceId)
    throw new Error(
      "A resposta não confirmou o registro da decisão. Recupere a mesma tentativa.",
    );
  return receipt;
}

function preparationValuesMatchCommand(
  f: BalancePreparationFields,
  c: BalancePreparationCommit["command"],
): boolean {
  let matches = "reason" in c.body && f.reason?.trim() === c.body.reason;
  if (c.action === "configure")
    matches =
      matches &&
      f.enabled === String(c.body.enabled) &&
      f.weekday === String(c.body.weekday) &&
      f.timezone === c.body.timezone &&
      f.shiftTypeId === c.body.shiftTypeId &&
      (f.professionalId || null) === (c.body.professionalId ?? null) &&
      f.startsOn === c.body.startsOn;
  if (
    c.action === "assign" ||
    c.action === "request_deferral" ||
    c.action === "defer"
  )
    matches = matches && f.targetShiftId === c.body.targetShiftId;
  return matches;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export function parseBalancePreparationReceipt(
  value: unknown,
  scope: {
    patientId: string;
    purpose: string;
    targetResourceId: string;
    userId: string;
  },
  intent?: BalancePreparationCommit,
): BalancePreparationReceipt {
  const parsed = balancePreparationReceiptSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta não confirmou a decisão preservada. Recupere a mesma tentativa.",
    );
  const r = parsed.data,
    n = r.nativeResult,
    c = r.command;
  const expectedAction =
    r.purpose === "approve_deferral" || r.purpose === "reject_deferral"
      ? "decide_deferral"
      : r.purpose;
  const matches =
    r.patientId === scope.patientId &&
    r.purpose === scope.purpose &&
    r.targetResourceId === scope.targetResourceId &&
    r.actorId === scope.userId &&
    c.action === expectedAction;
  let nativeMatches = false;
  const preparedMatches = preparationValuesMatchCommand(r.preparedValues, c);
  if (c.action === "configure")
    nativeMatches =
      r.resourceId === r.patientId &&
      n.care_recipient_id === r.patientId &&
      n.updated_by === r.actorId &&
      n.version === (r.expectedVersion ?? 0) + 1 &&
      n.enabled === c.body.enabled &&
      n.weekday === c.body.weekday &&
      n.timezone === c.body.timezone &&
      n.shift_type_id === c.body.shiftTypeId &&
      (n.designated_professional_id ?? null) ===
        (c.body.professionalId ?? null) &&
      n.starts_on === c.body.startsOn;
  if (c.action === "assign")
    nativeMatches =
      n.assignmentId === r.resourceId && c.body.cycleId === r.targetResourceId;
  if (c.action === "request_deferral" || c.action === "defer")
    nativeMatches =
      n.id === r.resourceId &&
      n.care_recipient_id === r.patientId &&
      n.assignment_id === r.targetResourceId &&
      c.body.assignmentId === r.targetResourceId &&
      n.target_shift_id === c.body.targetShiftId &&
      n.reason === c.body.reason &&
      n.requested_by === r.actorId &&
      n.status === (c.action === "defer" ? "approved" : "pending");
  if (c.action === "decide_deferral")
    nativeMatches =
      n.id === r.resourceId &&
      r.resourceId === r.targetResourceId &&
      c.body.id === r.targetResourceId &&
      n.care_recipient_id === r.patientId &&
      n.decided_by === r.actorId &&
      n.decision_reason === c.body.reason &&
      n.status === (c.body.approve ? "approved" : "rejected") &&
      c.body.approve === (r.purpose === "approve_deferral");
  if (
    !matches ||
    !nativeMatches ||
    !preparedMatches ||
    (intent &&
      (canonical(r.command) !== canonical(intent.command) ||
        r.referenceHash !== intent.referenceHash ||
        r.expectedVersion !== intent.expectedVersion))
  )
    throw new Error(
      "A resposta não corresponde à sua decisão. Recupere a mesma tentativa.",
    );
  return r;
}
