import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplyDocument } from "@/types/documents";
import { databaseError } from "./api";

// Resolve only the native document's links, through the reader's RLS session.
export async function withRequisitionLinks(
  client: SupabaseClient,
  document: SupplyDocument,
) {
  if (document.type !== "ENT") return document;
  const ids = [
    ...new Set(document.lines.flatMap((line) => line.requisitionItemIds)),
  ];
  if (!ids.length)
    return {
      ...document,
      linkedRequisitions: [],
      unavailableRequisitionItems: 0,
    };
  const { data, error } = await client
    .from("requisition_items")
    .select("id,requisitions(id,code,protocol)")
    .eq("care_recipient_id", document.care_recipient_id)
    .in("id", ids);
  if (error) databaseError(error);
  const links = new Map<
    string,
    NonNullable<SupplyDocument["linkedRequisitions"]>[number]
  >();
  let available = 0;
  for (const row of (data ?? []) as unknown as {
    id: string;
    requisitions: { id: string; code: string; protocol: string } | null;
  }[]) {
    if (!row.requisitions) continue;
    available++;
    const req = row.requisitions;
    const link = links.get(req.id) ?? { ...req, itemIds: [] };
    link.itemIds.push(row.id);
    links.set(req.id, link);
  }
  return {
    ...document,
    linkedRequisitions: [...links.values()],
    unavailableRequisitionItems: ids.length - available,
  };
}
