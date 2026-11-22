export const maximumIssuanceObservations = 50;
export const maximumIssuanceObservationLength = 1000;

export function issuanceObservations(payload: {
  notes?: unknown;
  observations?: unknown;
  intent?: unknown;
}): string[] {
  const legacy = typeof payload.notes === "string" && payload.notes ? [payload.notes] : [];
  if (Array.isArray(payload.observations) && payload.observations.every(value => typeof value === "string"))
    return [...legacy, ...payload.observations];
  const intent = payload.intent as { observations?: string[] } | undefined;
  return legacy.length ? legacy : intent?.observations ?? [];
}

export function issuanceObservationErrors(observations: readonly string[]) {
  const errors: Record<string, string> = {};
  observations.forEach((value, index) => {
    if (!value.trim()) errors["observation:" + index] = "Preencha a observação ou remova-a.";
    else if (value.length > maximumIssuanceObservationLength)
      errors["observation:" + index] = "Use até 1.000 caracteres.";
  });
  return errors;
}
