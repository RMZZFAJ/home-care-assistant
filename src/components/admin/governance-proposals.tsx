"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, FormField, SelectField, TextInput } from "@/components/ui/controls";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api, Notice, type WorkspaceContext } from "@/components/workspace";
import { governanceComparison, governanceFilterLabels, governanceKindLabels, governanceStatusLabels, type GovernanceChange } from "@/lib/governance-presentation";
import { formatBrazilDate } from "@/lib/receipt";

type PageData = { changes: GovernanceChange[]; total: number; page: number; pageSize: number };
export function GovernanceProposals({ context, directory, version, revision, busy, configure, reissue }: {
  context: WorkspaceContext; version: number; revision: number; busy: boolean;
  directory: { id: string; name: string }[];
  configure: (kind: string, change: Record<string, unknown>, requestId?: string, decision?: string) => Promise<boolean>;
  reissue: (invitationId: string) => Promise<void>;
}) {
  const params = useSearchParams(), router = useRouter();
  const status = params.get("proposalStatus") ?? "open", kind = params.get("proposalKind") ?? "", query = params.get("proposalQuery") ?? "", page = params.get("proposalPage") ?? "1";
  const [data, setData] = useState<PageData | null>(null), [error, setError] = useState("");
  const [retry, setRetry] = useState(0), [loading, setLoading] = useState(true);
  const patient = context.patient!;
  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams({ careRecipientId: patient.id, changesOnly: "true", status, query, page, pageSize: "20", ...(kind ? { kind } : {}) });
    void api<PageData>("/api/patient-settings?" + search, undefined, controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setError(""); setLoading(false); }
    }).catch(reason => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Não foi possível consultar as propostas."); setLoading(false); } });
    return () => controller.abort();
  }, [patient.id, status, kind, query, page, revision, retry]);
  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    setLoading(true);
    setRetry(value => value + 1);
    router.replace("/configuracoes?" + next, { scroll: false });
  }
  const local = context.activeContext?.mode === "patient" && patient.role === "admin";
  return <section className="ui-card hca-governance-proposals space-y-4" aria-label="Propostas de configuração" aria-busy={loading}>
    <h2 className="font-semibold">Propostas de configuração</h2>
    <p>Paciente: {patient.display_name}. Compare a configuração vigente e a proposta antes de decidir. Consultar não altera permissões.</p>
    <form key={[status, kind, query].join(":")} className="hca-toolbar" onSubmit={event => {
      event.preventDefault(); const values = new FormData(event.currentTarget);
      navigate({ proposalStatus: String(values.get("status")), proposalKind: String(values.get("kind")), proposalQuery: String(values.get("query")).trim(), proposalPage: "1" });
    }}>
      <FormField label="Situação da proposta"><SelectField name="status" defaultValue={status}><option value="all">Todas</option>{Object.entries(governanceFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Tipo de proposta"><SelectField name="kind" defaultValue={kind}><option value="">Todos os tipos</option>{Object.entries(governanceKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Buscar proposta por referência ou conteúdo"><TextInput name="query" type="search" defaultValue={query} maxLength={160} /></FormField>
      <ActionButton type="submit">Consultar propostas</ActionButton>
      <ActionButton type="button" onClick={() => navigate({ proposalStatus: "open", proposalKind: "", proposalQuery: "", proposalPage: "1" })}>Limpar filtros de propostas</ActionButton>
    </form>
    {error ? <Notice error>{error} <ActionButton onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Consultar propostas novamente</ActionButton></Notice> : null}
    {loading ? <Notice>Consultando propostas…</Notice> : null}
    {!loading && !error && data ? <>
      <p role="status">{data.total} {data.total === 1 ? "proposta encontrada" : "propostas encontradas"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {!data.changes.length ? <p>Nenhuma proposta corresponde aos filtros consultados.</p> : null}
      {data.changes.map(change => {
        const comparison = governanceComparison(change, directory);
        return <article key={change.id} className="rounded-lg border border-(--line) p-3 space-y-3" aria-label={"Proposta " + change.id.slice(0, 8)}>
          <h3 className="font-semibold">{comparison.title}</h3>
          <p>Referência: <span className="break-all">{change.id}</span></p>
          <p>{Object.hasOwn(governanceStatusLabels, change.status) ? governanceStatusLabels[change.status] : "Situação não reconhecida"} · por {change.proposerName} · {formatBrazilDate(change.created_at)}</p>
          <p>Versão de origem: {change.base_version}. Configuração vigente: {version}.</p>
          {change.base_version !== version && change.status === "pending" ? <Notice error>A configuração mudou após esta proposta. Preserve a proposta original e prepare outra após revisar a configuração vigente.</Notice> : null}
          <details><summary className="cursor-pointer font-semibold">Comparar configuração vigente e proposta</summary>
            <div className="hca-matrix-scroll mt-3" role="region" tabIndex={0} aria-label={"Comparação da proposta " + change.id.slice(0, 8)}>
              <DataTable className="hca-table" aria-label="Configuração vigente e proposta"><DataTableHead><DataTableRow><DataTableHeading>Campo</DataTableHeading><DataTableHeading>Vigente agora</DataTableHeading><DataTableHeading>Proposta registrada</DataTableHeading></DataTableRow></DataTableHead><DataTableBody>{comparison.rows.map(row => <DataTableRow key={row.key}><DataTableCell>{row.label}</DataTableCell><DataTableCell><span className="whitespace-pre-wrap break-words">{row.current}</span></DataTableCell><DataTableCell><span className="whitespace-pre-wrap break-words">{row.proposed}</span></DataTableCell></DataTableRow>)}</DataTableBody></DataTable>
            </div>
          </details>
          {!comparison.supported ? <Notice error>Esta proposta contém um tipo ou campo que esta versão não reconhece. Consulte a origem antes de aprovar.</Notice> : null}
          {change.status === "awaiting_acceptance" ? <div><p>O vínculo depende do aceite do destinatário.</p>{local && change.resolution?.invitationId ? <ActionButton disabled={busy} onClick={() => void reissue(change.resolution!.invitationId!)}>Reemitir convite e invalidar link anterior</ActionButton> : null}</div> : null}
          {change.status === "pending" && local && change.proposed_by !== context.userId ? <div className="hca-toolbar">
            <ActionButton variant="primary" disabled={busy || !comparison.supported || change.base_version !== version} onClick={() => void configure(change.kind, change.proposed, change.id, "approve")}>Aprovar proposta</ActionButton>
            <ActionButton disabled={busy} onClick={() => void configure(change.kind, change.proposed, change.id, "reject")}>Rejeitar proposta</ActionButton>
          </div> : change.status === "pending" ? <p>Aguardando administrador local distinto do proponente.</p> : null}
        </article>;
      })}
      <nav className="hca-toolbar" aria-label="Páginas de propostas"><ActionButton disabled={data.page === 1} onClick={() => navigate({ proposalPage: String(data.page - 1) })}>Propostas anteriores</ActionButton><ActionButton disabled={data.page * data.pageSize >= data.total} onClick={() => navigate({ proposalPage: String(data.page + 1) })}>Próxima página de propostas</ActionButton></nav>
    </> : null}
  </section>;
}
