import { z } from "zod";
const id = z.uuid();
const date = z.iso.date();
const instant = z.iso.datetime({ offset: true });
const reason = z.string().trim().min(3).max(1000);
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
          validUntil: date,
          notes: z.string().max(2000),
          reason: reason.optional(),
          replacesId: id.optional(),
        })
        .strict()
        .superRefine((value, ctx) => {
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
                  (day) => day < value.anchorDate || day > value.validUntil,
                ))
            )
              ctx.addIssue({
                code: "custom",
                path: ["dates"],
                message: "Confira as datas únicas dentro do período escolhido.",
              });
          } else if (
            value.dates !== undefined ||
            value.shiftTypeVersion !== undefined
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
      body: z.object({ id, fromDate: date, reason }).strict(),
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
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("cancel"),
      body: z.object({ id, reason }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("decide_change"),
      body: z
        .object({ id, approve: z.boolean(), reason: reason.optional() })
        .strict()
        .refine(
          (value) => value.approve || Boolean(value.reason),
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
