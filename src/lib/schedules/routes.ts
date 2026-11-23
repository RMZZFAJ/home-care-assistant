export function scheduleSettingsHref(patientId: string, day?: string) {
  const query = new URLSearchParams({ area: "schedules", careRecipientId: patientId });
  if (day) query.set("day", day);
  return "/configuracoes?" + query;
}
