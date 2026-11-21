export type DeliveryInboxSelection = { scope: string; status: string; page: number };
type QueryReader = { get(name: string): string | null };
export function deliveryInboxSelection(params: QueryReader, patientId: string): DeliveryInboxSelection {
  if (params.get("deliveryPatient") && params.get("deliveryPatient") !== patientId)
    return { scope: "own", status: "tasks", page: 1 };
  return { scope: params.get("deliveryScope") ?? "own", status: params.get("deliveryStatus") ?? "tasks", page: Number(params.get("deliveryPage") ?? "1") };
}
export function deliveryInboxHref(query: string, patientId: string, values: DeliveryInboxSelection) {
  const params = new URLSearchParams(query);
  params.set("careRecipientId", patientId); params.set("deliveryPatient", patientId);
  params.set("deliveryScope", values.scope); params.set("deliveryStatus", values.status); params.set("deliveryPage", String(values.page));
  return "/entregas?" + params;
}
