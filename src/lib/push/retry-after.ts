export function retryAfterTime(value: string | null, now: number): number | undefined {
  if (!value) return;
  const time = /^\d+$/.test(value) ? now + Number(value) * 1000 : Date.parse(value);
  if (Number.isFinite(time) && time > now && time <= Date.UTC(9999, 11, 31))
    return time;
}
