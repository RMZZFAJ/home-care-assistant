"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Notice, type WorkspaceContext } from "@/components/workspace";
import { governanceComparison, governanceFilterLabels, governanceKindLabels, governanceStatusLabels } from "@/lib/governance-presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { parseGovernanceListRead } from "@/lib/validation/governance-list";
import { useScopedRead } from "@/lib/use-scoped-read";

export function GovernanceProposals({ context, directory, version, revision, busy, configure, reissue }: {
  context: WorkspaceContext; version: number; revision: number; busy: boolean;
  directory: { id: string; name: string }[];
  configure: (kind: string, change: Record<string, unknown>, requestId?: string, decision?: string) => Promise<boolean>;
  reissue: (invitationId: string) => Promise<void>;
}) {
  const params = useSearchParams(), router = useRouter();
  const status = params.get("proposalStatus") ?? "open", kind = params.get("proposalKind") ?? "", query = (params.get("proposalQuery") ?? "").trim(), page = Number(params.get("proposalPage") ?? "1");
  const queryKey = JSON.stringify([status, kind, query]);
  const [draft, setDraft] = useState({ queryKey, status, kind, query });
  if (draft.queryKey !== queryKey) setDraft({ queryKey, status, kind, query });
  const patient = context.patient!;
  const decode = useCallback((value: unknown) => parseGovernanceListRead(value, { careRecipientId: patient.id, status, kind, query, page, pageSize: 20 }), [patient.id, status, kind, query, page]);
  const search = new URLSearchParams({ careRecipientId: patient.id, changesOnly: "true", status, query, page: String(page), pageSize: "20", ...(kind ? { kind } : {}) });
  const read = useScopedRead("/api/patient-settings?" + search, String(revision), decode);
  const { data, error, loading } = read, fresh = Boolean(data && !error && !loading);
  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    const sameSelection = (next.get("proposalStatus") ?? "open") === status &&
      (next.get("proposalKind") ?? "") === kind && (next.get("proposalQuery") ?? "").trim() === query &&
      Number(next.get("proposalPage") ?? "1") === page;
    if (sameSelection) read.refresh();
    if (next.toString() !== params.toString()) router.push("/configuracoes?" + next, { scroll: false });
  }
  const local = context.activeContext?.mode === "patient" && patient.role === "admin";
  return <section className="ui-card hca-governance-proposals space-y-4" aria-label="Propostas de configuração" aria-busy={loading}>
    <h2 className="font-semibold">Propostas de configuração</h2>
    <p>Paciente: {patient.display_name}. Compare a configuração vigente e a proposta antes de decidir. Consultar não altera permissões.</p>
    <form className="hca-toolbar" onSubmit={event => {
      event.preventDefault(); const values = new FormData(event.currentTarget);
      navigate({ proposalStatus: String(values.get("status")), proposalKind: String(values.get("kind")), proposalQuery: String(values.get("query")).trim(), proposalPage: "1" });
    }}>
      <FormField label="Situação da proposta"><SelectField name="status" value={draft.status} onChange={event => setDraft({ ...draft, status: event.currentTarget.value })}><option value="all">Todas</option>{Object.entries(governanceFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Tipo de proposta"><SelectField name="kind" value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.currentTarget.value })}><option value="">Todos os tipos</option>{Object.entries(governanceKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></FormField>
      <FormField label="Buscar proposta por referência ou conteúdo"><TextInput name="query" type="search" value={draft.query} onChange={event => setDraft({ ...draft, query: event.currentTarget.value })} maxLength={160} /></FormField>
      <ActionButton type="submit">Consultar propostas</ActionButton>
      <ActionButton type="button" onClick={() => navigate({ proposalStatus: "open", proposalKind: "", proposalQuery: "", proposalPage: "1" })}>Limpar filtros de propostas</ActionButton>
      <ActionButton type="button" disabled={loading} onClick={read.refresh}>Atualizar propostas</ActionButton>
    </form>
    {error ? <Notice error>{error} <ActionButton onClick={read.refresh}>Consultar propostas novamente</ActionButton></Notice> : null}
    {loading ? <Notice>Consultando propostas…</Notice> : null}
    {data && !fresh ? <p className="text-sm text-(--muted)">Última consulta confirmada{read.queriedAt ? " em " + formatBrazilDate(read.queriedAt) : ""}; aguardando atualização. Decisões suspensas até nova consulta válida.</p> : null}
    {data ? <>
      <p role="status">{data.total} {data.total === 1 ? "proposta encontrada" : "propostas encontradas"} · página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
      {fresh && !data.changes.length ? <p>Nenhuma proposta corresponde aos filtros consultados.</p> : null}
      {data.changes.map(change => {
        const comparison = governanceComparison(change, directory);
        return <article key={change.id} data-proposal-id={change.id} className="ui-card hca-admin-card hca-governance-proposal space-y-3" aria-label={"Proposta " + change.id.slice(0, 8)}>
          <h3 className="font-semibold">{comparison.title}</h3>
          <p>Referência: <span className="break-all">{change.id}</span></p>
          <p className="hca-proposal-state"><Pill tone={change.status === "applied" ? "success" : change.status === "rejected" ? "danger" : ["pending", "awaiting_acceptance"].includes(change.status) ? "warning" : "neutral"}>{Object.hasOwn(governanceStatusLabels, change.status) ? governanceStatusLabels[change.status] : "Situação não reconhecida"}</Pill><span>por {change.proposerName}</span><time dateTime={change.created_at}>{formatBrazilDate(change.created_at)}</time></p>
          <p>Versão de origem: {change.base_version}. Configuração vigente: {version}.</p>
          {change.base_version !== version && change.status === "pending" ? <Notice error>A configuração mudou após esta proposta. Preserve a proposta original e prepare outra após revisar a configuração vigente.</Notice> : null}
          <details><summary className="cursor-pointer font-semibold">Comparar configuração vigente e proposta</summary>
            <div className="hca-matrix-scroll mt-3" role="region" tabIndex={0} aria-label={"Comparação da proposta " + change.id.slice(0, 8)}>
              <DataTable className="hca-table" aria-label="Configuração vigente e proposta"><DataTableHead><DataTableRow><DataTableHeading>Campo</DataTableHeading><DataTableHeading>Vigente agora</DataTableHeading><DataTableHeading>Proposta registrada</DataTableHeading></DataTableRow></DataTableHead><DataTableBody>{comparison.rows.map(row => <DataTableRow key={row.key}><DataTableCell>{row.label}</DataTableCell><DataTableCell><span className="whitespace-pre-wrap wrap-break-word">{row.current}</span></DataTableCell><DataTableCell><span className="whitespace-pre-wrap wrap-break-word">{row.proposed}</span></DataTableCell></DataTableRow>)}</DataTableBody></DataTable>
            </div>
          </details>
          {!comparison.supported ? <Notice error>Esta proposta contém um tipo ou campo que esta versão não reconhece. Consulte a origem antes de aprovar.</Notice> : null}
          {change.status === "awaiting_acceptance" ? <div><p>O vínculo depende do aceite do destinatário.</p>{local && change.resolution?.invitationId ? <ActionButton disabled={busy || !fresh} onClick={() => void reissue(change.resolution!.invitationId!)}>Reemitir convite e invalidar link anterior</ActionButton> : null}</div> : null}
          {change.status === "pending" && local && change.proposed_by !== context.userId ? <div className="hca-toolbar">
            <ActionButton variant="primary" disabled={busy || !fresh || !comparison.supported || change.base_version !== version} onClick={() => void configure(change.kind, change.proposed, change.id, "approve")}>Aprovar proposta</ActionButton>
            <ActionButton disabled={busy || !fresh} onClick={() => void configure(change.kind, change.proposed, change.id, "reject")}>Rejeitar proposta</ActionButton>
          </div> : change.status === "pending" ? <p>Aguardando administrador local distinto do proponente.</p> : null}
        </article>;
      })}
      <nav className="hca-toolbar" aria-label="Páginas de propostas"><ActionButton disabled={!fresh || data.page === 1} onClick={() => navigate({ proposalPage: String(data.page - 1) })}>Propostas anteriores</ActionButton><ActionButton disabled={!fresh || data.page * data.pageSize >= data.total} onClick={() => navigate({ proposalPage: String(data.page + 1) })}>Próxima página de propostas</ActionButton></nav>
    </> : null}
  </section>;
}
