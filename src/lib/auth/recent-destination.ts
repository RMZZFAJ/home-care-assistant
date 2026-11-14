import { safeReturnPath } from "@/lib/safe-return-path";
import type { ContextData } from "@/components/layout/workspace-context";

export const recentDestinationKey = "hca:recent-destination";
const returnWindow = 30 * 60 * 1000;
export type RecentDestination = { userId: string; patientId: string; path: string; at: number; };

/** Navigation eligibility from a new server read; APIs still authorize every operation. */
export function recentDestinationAllowed(target: RecentDestination, context: ContextData) {
  const patient = context.patients.find(row => row.id === target.patientId && row.hasMembership && row.is_active !== false);
  if (context.userId !== target.userId || !patient || context.activeContext?.mode !== "patient" || context.activeContext.care_recipient_id !== patient.id) return false;
  const url = new URL(target.path, "https://navigation.invalid");
  if (url.searchParams.has("careRecipientId") && url.searchParams.get("careRecipientId") !== patient.id) return false;
  const has = (...caps: string[]) => caps.some(cap => patient.capabilities?.[cap] === true);
  const document = /^\/(?:documentos|historico|fichas)\/([0-9a-f-]{36})(?:\/arquivos)?$/.exec(url.pathname);
  if (document) return context.documentContext?.id === document[1] && context.documentContext.patientId === patient.id && has(context.documentContext.type.toLowerCase() + ".read");
  if (["/", "/mais", "/perfil", "/guias", "/notificacoes"].includes(url.pathname)) return true;
  if (url.pathname === "/historico") return has("req.read", "com.read", "ent.read", "bal.read");
  if (url.pathname === "/estoque") {
    const custody = url.searchParams.get("custody");
    if (custody === "FAMILY") return has("stock.family.read");
    if (custody === "CARE_TEAM") return has("stock.team.read");
    if (custody === "TRANSIT") return has("ent.read");
    return !custody && has("stock.family.read", "stock.team.read", "ent.read");
  }
  if (url.pathname === "/admin") return has(url.searchParams.get("section") === "catalog" ? "catalog.manage" : "access.manage");
  const routeCaps: Record<string, string[]> = {
    "/balancos": ["bal.read"], "/escalas": ["schedule.read.own", "schedule.read.team"],
    "/consumo": ["consumption.report", "consumption.confirm"], "/entregas": ["ent.read"],
    "/configuracoes": ["access.manage"], "/unidades": ["catalog.manage"],
    "/comprovantes-catalogo": ["catalog.manage"],
    "/fichas": ["req.create", "com.create", "ent.create", "bal.create"],
  };
  if (routeCaps[url.pathname]) return has(...routeCaps[url.pathname]);
  const creation = /^\/fichas\/(req|com|ent|bal|devolucao)$/.exec(url.pathname);
  return Boolean(creation && has((creation[1] === "devolucao" ? "ent" : creation[1]) + ".create"));
}

/** A navigation preference only. The session and context API authorize the return. */
export function recentDestination(raw: string | null, userId: string, origin: string, now = Date.now()): RecentDestination | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return null;
    const row = value as Partial<RecentDestination>;
    if (row.userId !== userId || typeof row.patientId !== "string" || !row.patientId || typeof row.path !== "string" || typeof row.at !== "number" || !Number.isFinite(row.at) || now < row.at || now - row.at > returnWindow) return null;
    const path = safeReturnPath(row.path, origin);
    return path === row.path ? row as RecentDestination : null;
  } catch { return null; }
}
