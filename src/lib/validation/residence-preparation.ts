import { z } from "zod";

const administratorEmail = z.string().trim().max(254).pipe(z.email("Informe o e-mail completo da conta inicial."));
export const preparationCreateContent = z.object({
  displayName: z.string().trim().min(2, "Informe o nome da residência.").max(160),
  isActive: z.boolean(),
  timeZone: z.string().min(1, "Escolha o fuso da residência.").max(100),
  administratorEmail,
  ownerId: z.uuid("Escolha o titular da continuidade.").transform(value => value.toLowerCase()),
  substituteId: z.uuid("Escolha o substituto da continuidade.").transform(value => value.toLowerCase()),
  responseMinutes: z.number().int().min(15, "Informe um prazo de 15 a 10.080 minutos.").max(10080, "Informe um prazo de 15 a 10.080 minutos."),
  showGuide: z.boolean(),
  isDevelopment: z.boolean(),
  teamIds: z.array(z.uuid()).max(100).optional(),
}).strict().refine(content => content.ownerId !== content.substituteId, {
  path: ["substituteId"], message: "Escolha uma pessoa diferente do titular.",
});

const creationPacket = z.object({
  action: z.literal("create"),
  content: preparationCreateContent,
  reviewedAdministratorId: z.uuid(),
  idempotencyKey: z.uuid(),
}).strict();

export const residencePreparationOperation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), administratorEmail }).strict(),
  creationPacket,
  z.object({ action: z.literal("resolve"), idempotencyKey: z.uuid() }).strict(),
]);

export const reviewedAdministrator = z.object({ id: z.uuid(), name: z.string().min(1) }).strict();
export const residenceCreationReceipt = z.object({
  creationKey: z.uuid(),
  administratorId: z.uuid(),
  id: z.uuid(),
  patientId: z.uuid(),
  state: z.literal("preparing"),
  revision: z.literal(1),
  step: z.literal(0),
  content: preparationCreateContent,
  people: z.record(z.uuid(), z.string()).optional(),
  savedAt: z.iso.datetime({ offset: true }),
  productionApproved: z.literal(false),
  replayed: z.boolean(),
}).strict();

export const residenceCreationResult = z.discriminatedUnion("state", [
  residenceCreationReceipt,
  z.object({ creationKey: z.uuid(), state: z.literal("closed_without_creation") }).strict(),
]);

export type PreparationContent = z.infer<typeof preparationCreateContent>;
export type ReviewedAdministrator = z.infer<typeof reviewedAdministrator>;
export type ResidenceCreationPacket = z.infer<typeof creationPacket>;
export type ResidenceCreationReceipt = z.infer<typeof residenceCreationReceipt>;

export function preparationConfirmed(value: unknown, intent: ResidenceCreationPacket) {
  const result = z.object({ data: residenceCreationReceipt }).safeParse(value);
  if (!result.success) return false;
  const { data } = result.data;
  return data.creationKey === intent.idempotencyKey && data.administratorId === intent.reviewedAdministratorId
    && JSON.stringify(data.content) === JSON.stringify(intent.content);
}
