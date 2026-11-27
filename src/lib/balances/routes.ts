export function balanceCountHref(patientId: string, documentId: string | null, assignment: { id: string; version: number; kind: string }) {
  const query = new URLSearchParams({
    careRecipientId: patientId, assignmentId: assignment.id, assignmentVersion: String(assignment.version),
  });
  if (documentId) {
    query.set("documentId", documentId);
    if (assignment.kind === "recount") query.set("recount", "true");
  }
  return "/fichas/bal?" + query;
}
