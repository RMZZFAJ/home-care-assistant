import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHistorySnapshot, snapshotFacts, type DocumentVersion, type VersionComparison } from "../documents/version-history";
import { ApiError, databaseError, rpc } from "./api";

type EventRow = { id: string; version: number; action: string; actor_id: string | null; actor_name: string | null; created_at: string; content_hash: string; body_text: string };
function project(row: EventRow, documentId: string): DocumentVersion {
  let b: Record<string, unknown>;
  try { b = parseHistorySnapshot(row.body_text); } catch { throw new ApiError("CONTENT_INVALID", "O conteúdo preservado desta versão não pôde ser conferido. Atualize esta seção.", 409, true); }
  if (b.id !== documentId || String(b.version) !== String(row.version) || !["REQ", "COM", "ENT", "BAL"].includes(String(b.type)))
    throw new ApiError("CONTENT_INVALID", "O conteúdo preservado desta versão não pôde ser conferido. Atualize esta seção.", 409, true);
  const preserved = typeof row.actor_name === "string" && row.actor_name.trim() ? row.actor_name
    : typeof b.actorName === "string" && b.actorName.trim() ? b.actorName : null;
  return { id: row.id, version: row.version, action: row.action, recordedAt: row.created_at, hash: row.content_hash,
    actorId: row.actor_id, actorName: row.actor_id === null ? null : preserved, actorSource: row.actor_id === null ? "system" : preserved ? "event_snapshot" : "unknown",
    code: typeof b.code === "string" ? b.code : "Sem código preservado", protocol: typeof b.protocol === "string" ? b.protocol : null, type: String(b.type), ...snapshotFacts(b) };
}

/** Existing per-document authority plus Auth RLS; no service-role history reads. */
export async function documentHistory(client: SupabaseClient, id: string, version: number, before?: number): Promise<VersionComparison> {
  const doc = await rpc(client, "operational_document", { p_id: id }) as { events: VersionComparison["versions"] };
  const versions = doc.events.toSorted((a, b) => a.version - b.version);
  if (!versions.some(v => v.version === version) || before !== undefined && (before >= version || !versions.some(v => v.version === before)))
    throw new ApiError("NOT_FOUND", "A versão escolhida não está disponível. Nenhuma versão atual foi usada em seu lugar.", 404, false);
  const previous = before ?? versions.findLast(v => v.version < version)?.version;
  // PostgREST column casting retains jsonb numeric tokens inside a string.
  const { data, error } = await client.from("document_events").select("id,version,action,actor_id,actor_name,created_at,content_hash,body_text:body::text")
    .eq("document_id", id).in("version", previous === undefined ? [version] : [previous, version]).order("version");
  if (error) databaseError(error);
  const selected = data?.find(row => row.version === version) as EventRow | undefined;
  const prior = data?.find(row => row.version === previous) as EventRow | undefined;
  if (!selected || previous !== undefined && !prior) throw new ApiError("NOT_FOUND", "Não foi possível consultar a versão exata. Atualize esta seção.", 404, false);
  const result = { documentId: id, selected: project(selected, id), before: prior ? project(prior, id) : null, versions };
  await rpc(client, "operational_document", { p_id: id });
  return result;
}
