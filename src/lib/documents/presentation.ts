/** Display the independent dimensions returned by the authoritative REQ read model. */
export function requisitionDocumentState(input: { historical?: boolean; status: string; archivedAt: string | null; completedAt: string | null; scienceSatisfied: boolean; fulfilled: number }) {
  if (input.historical) return "historical";
  if (input.status === "cancelled") return "cancelled";
  if (input.archivedAt) return "archived";
  if (input.completedAt) return input.scienceSatisfied ? "completed" : "completed_science_pending";
  if (input.fulfilled > 0) return "fulfillment_partial";
  return input.scienceSatisfied ? "awaiting_fulfillment" : "science_pending";
}

export function documentPatientName(snapshot: Record<string, unknown>, fallback: string) {
  const actors = snapshot.actors;
  const patient = actors && typeof actors === "object" ? (actors as Record<string, unknown>).patient : null;
  if (patient && typeof patient === "object" && typeof (patient as Record<string, unknown>).name === "string") return (patient as { name: string }).name;
  return typeof snapshot.patientName === "string" ? snapshot.patientName : fallback;
}
