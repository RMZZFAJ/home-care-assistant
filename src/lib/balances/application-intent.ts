import { z } from "zod";
import { balanceApplicationPacket } from "@/lib/validation/balance-application";

export type BalanceApplicationScope = { userId: string; patientId: string; documentId: string };
const saved = z.object({ userId: z.uuid(), patientId: z.uuid(), documentId: z.uuid(), packet: balanceApplicationPacket }).strict();
export function parseBalanceApplicationIntent(raw: string, scope: BalanceApplicationScope) {
  const value = saved.parse(JSON.parse(raw));
  if (value.userId !== scope.userId || value.patientId !== scope.patientId || value.documentId !== scope.documentId)
    throw new Error("A referência preservada não corresponde à conta, ao paciente e à ficha atuais.");
  return value.packet;
}
export function balanceApplicationStorageKey(scope: BalanceApplicationScope) {
  return `hca:balance-application:${scope.userId}:${scope.patientId}:${scope.documentId}`;
}
