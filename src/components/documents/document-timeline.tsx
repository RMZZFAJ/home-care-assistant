"use client";
import { Suspense, useCallback } from "react";
import { DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { SettingsSection } from "@/components/forms/settings-section";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { Notice } from "@/components/workspace";
import { compareVersionFacts, versionEventLabel, type DocumentVersion, type VersionComparison } from "@/lib/documents/version-history";
import { parseDocumentHistoryRead } from "@/lib/validation/document-history";

export type TimelineEvent = {
  id: string;
  action: string;
  createdAt: string;
  actorName?: string;
  actorId?: string;
  version?: number;
};
export function VersionFacts({ version }: { version: DocumentVersion }) {
  return <article className="hca-version-facts hca-form-stack" aria-label={`Conteúdo preservado da versão ${version.version}`}>
    <h3>Versão {version.version} · {versionEventLabel(version)}</h3>
    <p>{version.code} · Registro do evento: {formatBrazilDate(version.recordedAt)}</p>
    <p>Autoria do evento: {version.actorSource === "system" ? "Sistema, conforme o evento sem autor pessoal"
      : version.actorName ?? "Nome histórico não preservado"}.
      {version.actorSource === "event_snapshot" ? " Nome preservado no evento; não consultado no cadastro atual." : null}</p>
    {version.actorId ? <details><summary>Identidade vinculada ao evento</summary><p className="break-all">{version.actorId}</p></details> : null}
    <DefinitionGrid items={version.facts.map(fact => ({ key: fact.key, label: fact.label, value: fact.value }))} />
    <details><summary>Hash canônico desta versão</summary><code className="block break-all text-xs">{version.hash}</code></details>
  </article>;
}

type TimelineProps = { id: string; version: number; events: TimelineEvent[]; title?: string };
export function DocumentTimeline(props: TimelineProps) {
  return <Suspense fallback={<p role="status">Preparando histórico de versões…</p>}><TimelineContent {...props} /></Suspense>;
}
function TimelineContent({ id, version, events, title = "Linha do tempo" }: TimelineProps) {
  const params = useSearchParams();
  const positive = (name: string) => /^[1-9]\d{0,8}$/.test(params.get(name) ?? "") ? Number(params.get(name)) : null;
  const selected = positive("historyVersion"), before = positive("historyBefore");
  const revision = useLiveRevision();
  const query = selected === null ? null : `/api/documents/${id}/history?version=${selected}${before === null ? "" : "&before=" + before}`;
  const decode = useCallback((value: unknown) => parseDocumentHistoryRead(value, id, selected ?? 0, before), [id, selected, before]);
  const read = useScopedRead<{ data: VersionComparison }>(query, String(revision), decode);
  const comparison = read.data?.data;
  const changes = comparison ? compareVersionFacts(comparison.before?.facts ?? [], comparison.selected.facts) : [];
  const versions = comparison?.versions ?? events.filter((event): event is TimelineEvent & { version: number } => typeof event.version === "number");
  const selection = (value: number, previous: number | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("historyVersion", String(value));
    if (previous === null) url.searchParams.delete("historyBefore"); else url.searchParams.set("historyBefore", String(previous));
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  };
  const choose = (value: number) => selection(value, null);
  return (
    <SettingsSection title={title} summary={events.length + " evento(s) registrados"} initiallyOpen={selected !== null}>
      <p>Compare os fatos congelados em cada evento. Consultar não altera o documento nem emite outro PDF. A ausência de um nome antigo não será preenchida pelo cadastro atual.</p>
      <button type="button" className="ui-button ui-button-secondary" onClick={() => choose(version)}>Comparar versões</button>
      {events.length ? (
        <ol className="hca-document-feed" aria-label="Eventos documentais">
          {events.map((event) => (
            <li key={event.id} className="hca-document-event">
              <span className="hca-document-event-mark" aria-hidden="true"><Icon name="history" /></span>
              <div className="hca-document-event-body"><p className="text-sm font-semibold">
                {documentEventLabel(event.action)}
              </p>
              <p className="text-xs text-(--muted)">
                {formatBrazilDate(event.createdAt)} ·{" "}
                {event.actorName || "Autoria disponível na consulta do evento"}
                {event.version ? " · versão " + event.version : ""}
              </p>
              {event.version ? <button type="button" className="ui-button ui-button-secondary mt-2" onClick={() => choose(event.version!)}>Consultar versão {event.version}</button> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-(--muted)">
          Sem eventos documentais disponíveis.
        </p>
      )}
      {selected !== null ? <section aria-label="Comparação de versões" className="mt-4 space-y-4" aria-busy={read.loading}>
        <h3>Comparação dos fatos preservados</h3>
        <p>Os campos “Fato desta versão” descrevem a ação de cada evento. Um campo ausente em uma dessas ações não indica que foi apagado da ficha.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Versão consultada<select value={selected} onChange={e => choose(Number(e.target.value))} className="ui-input">{versions.map(v => <option key={v.version} value={v.version}>Versão {v.version} · {documentEventLabel(v.action)}</option>)}</select></label>
          <label>Versão anterior para comparar<select value={before ?? ""} onChange={e => selection(selected, e.target.value ? Number(e.target.value) : null)} className="ui-input"><option value="">Versão imediatamente anterior</option>{versions.filter(v => v.version < selected).map(v => <option key={v.version} value={v.version}>Versão {v.version}</option>)}</select></label>
        </div>
        {read.loading ? <p role="status">Consultando a versão exata e sua referência…</p> : null}
        {read.error ? <Notice error>Não foi possível consultar os dados desta seção. {read.error} O registro histórico não pode ser editado aqui. Atualize esta seção.</Notice> : null}
        <button type="button" className="ui-button ui-button-secondary" aria-disabled={read.loading} onClick={() => { if (!read.loading) read.refresh(); }}>Atualizar histórico desta seção</button>
        {comparison && !read.loading && !read.error ? <>
          {comparison.selected.additionalFields || comparison.before?.additionalFields ? <Notice>Há dados adicionais preservados que ainda não têm descrição nesta comparação. Consulte também o arquivo exato da versão; esta leitura não resume todos esses dados.</Notice> : null}
          {comparison.before && comparison.selected.version !== comparison.before.version + 1 ? <Notice>As versões não são consecutivas. A comparação abrange somente as duas versões indicadas.</Notice> : null}
          <p role="status">{comparison.before ? `Comparação da versão ${comparison.before.version} com a versão ${comparison.selected.version}.` : "Primeira versão disponível; não há versão anterior nesta consulta."}</p>
          {changes.length ? <ol className="space-y-4">{changes.map(change => <li key={change.key} className="hca-version-change hca-form-stack">
            <h4 className="font-semibold">{change.label}</h4><DefinitionGrid items={[{ label: "Antes" + (comparison.before ? ` · versão ${comparison.before.version}` : " · sem versão anterior"), value: change.before },{ label: `Depois · versão ${comparison.selected.version}`, value: change.after }]} />
          </li>)}</ol> : <p>Não há mudança nos campos descritos nesta comparação. O evento e sua autoria continuam identificados abaixo.</p>}
          <VersionFacts version={comparison.selected} />
          {comparison.before ? <details><summary>Consultar todos os fatos da versão {comparison.before.version}</summary><VersionFacts version={comparison.before} /></details> : null}
          <p>O hash canônico pertence ao conteúdo registrado; o hash do arquivo final e a assinatura técnica são conferências separadas.</p>
          {comparison.selected.protocol ? <Link className="ui-button ui-button-secondary" href={`/documentos/${id}/arquivos?version=${comparison.selected.version}${comparison.before ? "&historyBefore=" + comparison.before.version : ""}`}>Consultar arquivos da versão {comparison.selected.version}</Link> : <p>Esta versão não preserva protocolo de emissão. Os fatos continuam disponíveis nesta leitura.</p>}
          {comparison.before?.protocol ? <Link className="ui-button ui-button-secondary" href={`/documentos/${id}/arquivos?version=${comparison.before.version}`}>Consultar arquivos da versão {comparison.before.version}</Link> : null}
        </> : null}
      </section> : null}
    </SettingsSection>
  );
}
