/** Civil time is converted with the patient's zone, never the device's zone. */
export function localMinute(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const get = (part: string) => parts.find(p => p.type === part)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function civilInstant(value: string, timezone: string) {
  const civil = Date.parse(value + ":00Z");
  let instant = civil;
  for (let i = 0; i < 4; i++) instant += civil - Date.parse(localMinute(new Date(instant).toISOString(), timezone) + ":00Z");
  if (localMinute(new Date(instant).toISOString(), timezone) !== value) throw new Error("Este horário não existe no fuso selecionado. Escolha outro horário.");
  return new Date(instant).toISOString();
}
