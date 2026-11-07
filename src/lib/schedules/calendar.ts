export function calendarPeriod(day: string, mode: "week" | "month") {
  const reference = new Date(day + "T12:00:00Z");
  const start = new Date(reference), end = new Date(reference);
  if (mode === "month") {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  }
  const dates: string[] = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) dates.push(date.toISOString().slice(0, 10));
  return { from: dates[0], until: dates[dates.length - 1], dates };
}

export function adjacentPeriod(day: string, mode: "week" | "month", direction: -1 | 1) {
  const date = new Date(day + "T12:00:00Z");
  if (mode === "month") { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + direction); }
  else date.setUTCDate(date.getUTCDate() + 7 * direction);
  return date.toISOString().slice(0, 10);
}
