export const balancePreparationPurposes = [
  "configure",
  "assign",
  "request_deferral",
  "defer",
  "approve_deferral",
  "reject_deferral",
] as const;
export type BalancePreparationPurpose =
  (typeof balancePreparationPurposes)[number];
export function isBalancePreparationPurpose(
  value: string,
): value is BalancePreparationPurpose {
  return (balancePreparationPurposes as readonly string[]).includes(value);
}
export const balancePreparationTitles: Record<
  BalancePreparationPurpose,
  string
> = {
  configure: "Programação do balanço",
  assign: "Resolver atribuição",
  request_deferral: "Solicitar adiamento",
  defer: "Adiar com decisão familiar",
  approve_deferral: "Aprovar adiamento",
  reject_deferral: "Rejeitar adiamento",
};
