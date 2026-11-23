import { z } from "zod";
import { shiftDayPeriod, shiftLocalTime } from "@/lib/schedules/residence-hours";
const id = z.uuid();
const date = z.iso.date();
const instant = z.iso.datetime({ offset: true });
const reason = z.string().trim().min(3).max(1000);
const version = z.number().int().positive().max(2147483647);
export const scheduleBalanceDecisionFields = z.object({
  decision: z.enum(["keep", "assign", "defer"]),
  assignmentId: id,
  assignmentVersion: version,
  sourceVersion: version,
  targetShiftId: id.optional(),
  targetShiftVersion: version.optional(),
  reason: z.string().max(1000),
}).strict().refine(
  (value) => (value.targetShiftId === undefined) === (value.targetShiftVersion === undefined),
);
const balanceImpact = scheduleBalanceDecisionFields.refine(
  (value) => reason.safeParse(value.reason).success &&
    (value.decision === "keep" ? !value.targetShiftId : Boolean(value.targetShiftId)),
).optional();
const person = {
  professionalId: id.optional(),
  startsAt: instant.optional(),
  endsAt: instant.optional(),
};
export const scheduleBody = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("type"),
      body: z
        .object({
          id: id.optional(),
          name: z.string().trim().min(2).max(100),
          startsLocal: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
          durationMinutes: z.number().int().min(15).max(1440),
          active: z.boolean().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("series"),
      body: z
        .object({
          professionalId: id,
          shiftTypeId: id,
          timezone: z.string().min(1).max(80),
          recurrence: z.enum(["once", "weekly", "cycle", "dates"]),
          weekdays: z.array(z.number().int().min(0).max(6)).max(7),
          dates: z.array(date).min(1).max(367).optional(),
          shiftTypeVersion: z
            .number()
            .int()
            .positive()
            .max(2147483647)
            .optional(),
          workHours: z.union([z.literal(12), z.literal(24)]).optional(),
          restHours: z
            .union([z.literal(24), z.literal(36), z.literal(48)])
            .optional(),
          anchorDate: date,
          validUntil: date.nullable(),
          notes: z.string().max(2000),
          reason: reason.optional(),
          replacesId: id.optional(),
          residenceHours: z.object({
            version: z.number().int().positive().max(2147483647),
            period: shiftDayPeriod,
            startsLocal: shiftLocalTime,
            endsLocal: shiftLocalTime.nullable(),
          }).strict().optional(),
        })
        .strict()
        .superRefine((value, ctx) => {
          if (value.validUntil === null && (!value.residenceHours || !["weekly", "cycle"].includes(value.recurrence)))
            ctx.addIssue({ code: "custom", path: ["validUntil"], message: "Informe o último dia desta programação." });
          if (value.residenceHours && (!value.shiftTypeVersion || value.replacesId))
            ctx.addIssue({ code: "custom", path: ["shiftTypeVersion"], message: "Confira a referência do tipo e dos horários da residência." });
          if (value.recurrence === "dates") {
            if (
              !value.dates?.length ||
              !value.shiftTypeVersion ||
              value.weekdays.length ||
              value.workHours !== undefined ||
              value.restHours !== undefined
            )
              ctx.addIssue({
                code: "custom",
                path: ["dates"],
                message:
                  "Selecione as datas e a referência do tipo de plantão.",
              });
            if (
              value.dates &&
              (new Set(value.dates).size !== value.dates.length ||
                value.dates.some(
                  (day) => day < value.anchorDate || !value.validUntil || day > value.validUntil,
                ))
            )
              ctx.addIssue({
                code: "custom",
                path: ["dates"],
                message: "Confira as datas únicas dentro do período escolhido.",
              });
          } else if (
            value.dates !== undefined ||
            value.shiftTypeVersion !== undefined && !value.residenceHours
          )
            ctx.addIssue({
              code: "custom",
              path: ["dates"],
              message:
                "As datas avulsas pertencem à repetição por datas escolhidas.",
            });
        }),
    })
    .strict(),
  z
    .object({
      action: z.enum(["approve", "reject"]),
      body: z.object({ id, reason: reason.optional() }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("end_series"),
      body: z.object({ id, fromDate: date, reason, balanceImpact }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.enum(["change", "propose_change"]),
      body: z
        .object({
          id,
          ...person,
          reason,
          notes: z.string().max(2000).optional(),
          balanceImpact,
        })
        .strict(),
    })
    .strict()
    .refine((value) => value.action === "change" || !value.body.balanceImpact),
  z
    .object({
      action: z.literal("cancel"),
      body: z.object({ id, reason, balanceImpact }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("decide_change"),
      body: z
        .object({ id, approve: z.boolean(), reason: reason.optional(), balanceImpact })
        .strict()
        .refine(
          (value) => value.approve || Boolean(value.reason) && !value.balanceImpact,
          "Informe o motivo da rejeição.",
        ),
    })
    .strict(),
  z
    .object({
      action: z.literal("close_obsolete"),
      body: z.object({ id, reason }).strict(),
    })
    .strict(),
]);
export const scheduleCommandSchema = z
  .object({
    careRecipientId: id,
    command: scheduleBody,
    idempotencyKey: id,
    expectedVersion: z.number().int().positive().nullable().default(null),
  })
  .strict()
  .refine(
    (value) =>
      ![
        "approve",
        "reject",
        "decide_change",
        "close_obsolete",
        "change",
        "cancel",
        "end_series",
        "propose_change",
      ].includes(value.command.action) || value.expectedVersion !== null,
    {
      message: "Atualize a versão da programação antes de decidir.",
      path: ["expectedVersion"],
    },
  );
export type ScheduleCommand = z.infer<typeof scheduleBody>;
