"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { ActionButton, SelectField } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { ApiError } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { deliveryLabels } from "@/lib/notifications/presentation";
const channelLabels = { internal: "Aplicativo", push: "Push", whatsapp: "WhatsApp", email: "E-mail" };
const channel = z.enum(["internal", "push", "whatsapp", "email"]);
const row = z.object({ id: z.uuid(), originId: z.uuid().nullable(), purpose: z.string(), recipient: z.string(), channel, state: z.string(), createdAt: z.string(), attemptedAt: z.string().nullable(), deliveredAt: z.string().nullable(), readAt: z.string().nullable(), seenAt: z.string().nullable(), attemptCount: z.number().int().nonnegative(), historyCoverage: z.enum(["last_result_only", "recorded_attempts"]), attempts: z.array(z.object({ id: z.uuid(), ordinal: z.number(), at: z.string(), outcome: z.string().nullable(), completedAt: z.string().nullable() })), canResend: z.boolean(), sourceId: z.uuid() });
const packet = z.object({ key: z.uuid(), originalId: z.uuid(), channel }).strict();
type Packet = z.infer<typeof packet>;
export function DocumentCommunications({ id, version = 0 }: { id: string; version?: number ;}) {
  const { data } = useWorkspaceState();
  return data ? <Communications key={data.userId + ":" + id} id={id} version={version} userId={data.userId} /> : <p role="status">Validando acesso às comunicações…</p>;
}
function Communications({ id, version, userId }: { id: string; version: number; userId: string ;}) {
  const revision = useLiveRevision(), [page, setPage] = useState(1);
  const decode = useCallback((raw: unknown) => {
    const parsed = z.object({ data: z.object({ documentId: z.uuid(), page: z.number(), size: z.literal(20), total: z.number(), data: z.array(row).max(20) }), channels: z.object({ internal: z.boolean(), push: z.boolean(), whatsapp: z.boolean(), email: z.boolean() }) }).parse(raw);
    if (parsed.data.documentId !== id || parsed.data.page !== page) throw new Error("A consulta não corresponde a esta ficha."); return parsed;
  }, [id, page]);
  const read = useScopedRead(`/api/documents/${id}/communications?page=${page}`, version + ":" + revision, decode);
  const key = `hca:communication:${userId}:${id}`;
  const [pending, setPending] = useState<Packet | null>(() => { try { const parsed = packet.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null")); return parsed.success ? parsed.data : null; } catch { return null; } });
  const [selected, setSelected] = useState<z.infer<typeof row> | null>(null), [selectedChannel, setSelectedChannel] = useState<Packet["channel"]>("internal"), [error, setError] = useState(""), [message, setMessage] = useState("");
  const command = useCommandIntent<Packet, unknown>((raw, p) => { const result = z.object({ key: z.uuid(), documentId: z.uuid(), originalId: z.uuid(), notificationId: z.uuid(), channel, state: z.literal("queued"), recovered: z.boolean() }).safeParse(raw); return result.success && result.data.documentId === id && result.data.key === p.key && result.data.originalId === p.originalId && result.data.channel === p.channel; });
  async function send() {
    if (command.busy || !pending && !selected) return;
    const recovering = Boolean(pending), intent = pending ?? { key: crypto.randomUUID(), originalId: selected!.sourceId, channel: selectedChannel };
    setPending(intent); setError(""); setMessage("");
    try { sessionStorage.setItem(key, JSON.stringify(intent)); } catch {/* Recovery remains available while this page is open. */ }
    try { if (command.uncertain) await command.recover(); else await command.send(`/api/documents/${id}/communications`, intent); setPending(null); try { sessionStorage.removeItem(key); } catch {/* Confirmed state remains authoritative. */ } setSelected(null); setMessage("Pedido de reforço registrado. A fila e as tentativas abaixo mostram o resultado conhecido; o registro não comprova entrega ou leitura."); read.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o pedido."); if (!recovering && reason instanceof ApiError && reason.status >= 400 && reason.status < 500) { setPending(null); try { sessionStorage.removeItem(key); } catch {/* Confirmed state remains authoritative. */ } } }
  }
  return <section className="ui-card hca-form-stack" aria-label="Comunicações da ficha"><div className="hca-section-heading"><h2>Comunicações da ficha</h2><ActionButton onClick={read.refresh} disabled={read.loading}>Atualizar comunicações</ActionButton></div><p className="hca-field-help">Avisos, tentativas, leitura conhecida, ciência familiar e recebimento são fatos separados. Push aceito pelo serviço não comprova entrega ao aparelho.</p>
    {error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
    {pending ? <Notice>O resultado deste pedido ainda precisa ser verificado. A tentativa e o canal permanecem preservados.<ActionButton disabled={command.busy} onClick={() => void send()}>Verificar resultado do mesmo pedido</ActionButton></Notice> : null}
    {read.loading ? <p role="status">Consultando comunicações autorizadas…</p> : read.error ? <Notice error>{read.error}</Notice> : read.data ? <>
      {!read.data.data.data.length ? <p>Nenhuma comunicação registrada para esta ficha.</p> : <ul className="hca-communication-list">{read.data.data.data.map(item => <li key={item.id} data-important={/science|ent.issued|ent.submit/.test(item.purpose) || undefined}><div className="hca-section-heading"><strong>{documentEventLabel(item.purpose)}</strong><span>{channelLabels[item.channel]}</span></div><p>{item.recipient}</p><p><strong>{item.channel === "internal" ? "Aviso criado no aplicativo" : deliveryLabels[item.state] ?? item.state}</strong> · {formatBrazilDate(item.createdAt)}</p><p className="hca-field-help">{item.channel === "internal" ? item.seenAt ? "Aviso visto no aplicativo em " + formatBrazilDate(item.seenAt) : "Aviso ainda sem registro de visualização no aplicativo" : item.readAt ? "Leitura informada pelo provedor em " + formatBrazilDate(item.readAt) : "Sem confirmação de leitura"}. {item.attemptCount} tentativa(s) registrada(s).</p>{item.originId ? <p className="hca-field-help">Reforço deliberado de uma comunicação anterior.</p> : null}{item.attempts.length ? <details><summary>Consultar tentativas</summary><ol>{item.attempts.map(attempt => <li key={attempt.id}>Tentativa {attempt.ordinal} · {formatBrazilDate(attempt.at)} · {attempt.outcome ? deliveryLabels[attempt.outcome] ?? attempt.outcome : "Resultado ainda desconhecido"}</li>)}</ol></details> : item.historyCoverage === "last_result_only" && item.attemptCount > 0 ? <p className="hca-field-help">Este canal conserva o último resultado; o histórico individual anterior não foi registrado.</p> : null}{item.canResend ? <ActionButton disabled={Boolean(pending) || command.busy} onClick={() => { setSelected(item); setSelectedChannel(item.channel); setError(""); }}>Reforçar esta comunicação</ActionButton> : null}</li>)}</ul>}
      <nav className="hca-toolbar" aria-label="Páginas de comunicações"><ActionButton disabled={page === 1} onClick={() => setPage(n => n - 1)}>Anteriores</ActionButton><span>{page} / {Math.max(1, Math.ceil(read.data.data.total / 20))}</span><ActionButton disabled={page * 20 >= read.data.data.total} onClick={() => setPage(n => n + 1)}>Próximas</ActionButton></nav>
    </> : null}
    <Dialog open={Boolean(selected)} title="Reforçar comunicação" closeDisabled={command.busy} onClose={() => setSelected(null)}><div className="hca-form-stack"><p>Destinatário: {selected?.recipient}. Este comando registra uma nova tentativa ligada à comunicação original.</p><label className="hca-field">Canal<SelectField value={selectedChannel} disabled={Boolean(pending) || command.busy} onChange={event => setSelectedChannel(event.currentTarget.value as Packet["channel"])}>{Object.entries(channelLabels).map(([id, label]) => <option key={id} value={id} disabled={!read.data?.channels[id as Packet["channel"]]}>{label}{read.data?.channels[id as Packet["channel"]] ? "" : " · indisponível neste ambiente"}</option>)}</SelectField></label>{error ? <Notice error>{error}</Notice> : null}<p>O envio respeita as permissões, preferências, horários e canais disponíveis. O resultado pode continuar desconhecido até o retorno do serviço.</p><div className="hca-toolbar"><ActionButton disabled={command.busy} onClick={() => setSelected(null)}>Fechar por enquanto</ActionButton><ActionButton variant="primary" disabled={command.busy || !pending && !read.data?.channels[selectedChannel]} onClick={() => void send()}>{command.busy ? "Confirmando pedido…" : pending ? "Verificar mesmo pedido" : "Confirmar novo pedido de envio"}</ActionButton></div></div></Dialog>
  </section>;
}
