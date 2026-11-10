export const consumptionPreparationPurposes = [
  "consumption_report_family",
  "consumption_report_team",
  "consumption_supplement",
  "consumption_accept",
  "consumption_reject",
] as const;
export type ConsumptionPreparationPurpose =
  (typeof consumptionPreparationPurposes)[number];
export function isConsumptionPreparationPurpose(
  value: string,
): value is ConsumptionPreparationPurpose {
  return (consumptionPreparationPurposes as readonly string[]).includes(value);
}
export const consumptionPreparationTitles: Record<
  ConsumptionPreparationPurpose,
  string
> = {
  consumption_report_family: "Relato da família",
  consumption_report_team: "Relato da equipe",
  consumption_supplement: "Complemento do relato",
  consumption_accept: "Conferência do relato",
  consumption_reject: "Rejeição do relato",
};
