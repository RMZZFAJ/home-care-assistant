import { z } from "zod";
import type { VersionComparison } from "../documents/version-history";

const version = z.number().int().positive().max(999_999_999);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const instant = z.string().datetime({ offset: true });
const event = z.object({ version, action: z.string(), createdAt: instant, hash });
const snapshot = z.object({
  id: z.string().uuid(), version, action: z.string(), recordedAt: instant, hash,
  actorId: z.string().uuid().nullable(), actorName: z.string().nullable(),
  actorSource: z.enum(["event_snapshot", "unknown", "system"]),
  code: z.string(), protocol: z.string().nullable(), type: z.enum(["REQ", "COM", "ENT", "BAL"]),
  facts: z.array(z.object({ key: z.string(), label: z.string(), value: z.string() })),
  additionalFields: z.boolean(),
}).refine(value => new Set(value.facts.map(fact => fact.key)).size === value.facts.length)
  .refine(value => value.actorSource === "system" ? value.actorId === null && value.actorName === null
    : value.actorId !== null && (value.actorSource === "unknown" ? value.actorName === null : Boolean(value.actorName?.trim())));
const response = z.object({ data: z.object({ documentId: z.string().uuid(), selected: snapshot, before: snapshot.nullable(), versions: z.array(event).min(1) }) });

/** Validate a read projection, without turning its historical facts into inputs. */
export function parseDocumentHistoryRead(value: unknown, documentId: string, selected: number, before: number | null): { data: VersionComparison } {
  const parsed = response.safeParse(value);
  const failed = () => new Error("A resposta do histórico não pôde ser conferida. Atualize esta seção; os fatos registrados não podem ser corrigidos aqui.");
  if (!parsed.success) throw failed();
  const result = parsed.data.data;
  const numbers = result.versions.map(item => item.version);
  const previous = before ?? numbers.reduce((latest, number) => number < selected && number > latest ? number : latest, 0);
  const matches = (item: VersionComparison["selected"]) => result.versions.some(entry => entry.version === item.version && entry.hash === item.hash && entry.action === item.action);
  if (result.documentId !== documentId || result.selected.version !== selected || new Set(numbers).size !== numbers.length || !matches(result.selected)
    || (previous === 0 ? result.before !== null : result.before?.version !== previous)
    || (result.before !== null && (result.before.version >= selected || result.before.id === result.selected.id || result.before.type !== result.selected.type || !matches(result.before)))) throw failed();
  return parsed.data;
}
