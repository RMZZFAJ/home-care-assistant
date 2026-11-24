"use client";

import { useCallback, useRef, useState } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton, DefinitionGrid, FormField, Pill, SelectField, type PillTone } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatBrazilDate } from "@/lib/receipt";
import { parseTechnicalNotifications, type TechnicalNotificationSource } from "@/lib/operations/notification-attempts";

type Row = ReturnType<typeof parseTechnicalNotifications>["data"][number];
const sources = { notices: "Fila de avisos", web_push: "Web Push" } satisfies Record<TechnicalNotificationSource, string>;
const channels = { internal: "Aviso interno", email: "E-mail", whatsapp: "WhatsApp", web_push: "Web Push" } satisfies Record<Row["channel"], string>;
const labels = {
  pending: "Pendente", processing: "Em processamento", sent: "Enviada", accepted: "Aceita pelo transporte",
  delivered: "Entrega registrada", read: "Visualização registrada", failed: "Falha", uncertain: "Resultado incerto",
  cancelled: "Cancelada", expired: "Expirada",
} satisfies Record<Row["state"], string>;
const tones: Partial<Record<Row["state"], PillTone>> = {
  sent: "success", accepted: "success", delivered: "success", read: "success", failed: "danger", uncertain: "warning", processing: "info",
};

export function TechnicalNotifications() {
  const [source, setSource] = useState<TechnicalNotificationSource>("web_push");
  return <section className="ui-card hca-technical-list" aria-label="Tentativas de avisos no banco compartilhado">
    <header className="hca-technical-cardhead"><h3>Envios e tentativas</h3></header>
    <div className="hca-attempt-controls hca-form">
      <FormField label="Fonte das tentativas">
        <SelectField value={source} onChange={event => setSource(event.currentTarget.value as TechnicalNotificationSource)}>
          <option value="notices">{sources.notices}</option><option value="web_push">{sources.web_push}</option>
        </SelectField>
      </FormField>
    </div>
    <AttemptList key={source} source={source} />
    <p className="hca-technical-card-hint">O estado do transporte não comprova ciência, leitura integral nem recebimento de material. Encaminhe a referência ao responsável pelo canal quando precisar conciliar o resultado.</p>
  </section>;
}

function AttemptList({ source }: { source: TechnicalNotificationSource }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; opener: HTMLButtonElement } | null>(null);
  const [readAttempts, setReadAttempts] = useState(0);
  const [dismissedRead, setDismissedRead] = useState<unknown>(null);
  const refreshRef = useRef<HTMLButtonElement>(null);
  const decode = useCallback((value: unknown) => parseTechnicalNotifications(value, source, page), [source, page]);
  const read = useScopedRead(`/api/operations/notifications?source=${source}&page=${page}`, "", decode);
  const fresh = Boolean(read.data && !read.loading && !read.error);
  const data = read.data;
  const row = fresh ? data?.data.find(item => item.id === selected?.id) : undefined;
  useOperationActivity(read.loading, { title: "Consultando tentativas registradas" });

  function refresh() {
    if (read.loading) return;
    setSelected(null);
    setReadAttempts(0);
    read.refresh();
  }

  return <>
    <div className="hca-attempt-controls hca-form">
      <div className="hca-toolbar"><ActionButton ref={refreshRef} aria-disabled={read.loading} onClick={refresh}>Atualizar tentativas</ActionButton></div>
      {read.error && !data && <p>Consulta indisponível. Atualize para consultar novamente.</p>}
      {data && <>
        {!fresh && <p>Última consulta confirmada preservada. Estes resultados aguardam atualização.</p>}
        <p role="status">{data.total} registros nesta fonte · Página {data.page} · Consulta {formatBrazilDate(data.consultedAt)}</p>
        {fresh && !data.data.length && <p>Nenhum registro nesta fonte e página. Outros canais podem ter registros próprios.</p>}
      </>}
    </div>
    {data && <>
      <ul className="hca-attempt-list">{data.data.map(item => <li key={item.id} data-technical-notification={item.id}>
        <button type="button" className="hca-guide-row hca-attempt-row" disabled={!fresh}
          onClick={event => setSelected({ id: item.id, opener: event.currentTarget })}>
          <span className="hca-guide-row-icon"><Icon name="bell" /></span>
          <span className="hca-guide-row-label">
            <strong>{channels[item.channel]} · {item.id.slice(0, 8)}</strong>
            <small>{formatBrazilDate(item.attemptedAt ?? item.createdAt)}</small>
          </span>
          <Pill tone={tones[item.state]}>{labels[item.state]}</Pill>
          <Icon name="chevron" width={16} />
        </button>
      </li>)}</ul>
      {data.total > data.pageSize && <nav className="hca-toolbar hca-technical-pagination" aria-label="Páginas das tentativas">
        <ActionButton compact disabled={!fresh || page === 1} onClick={() => setPage(value => value - 1)}>Tentativas anteriores</ActionButton>
        <ActionButton compact disabled={!fresh || page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Próximas tentativas</ActionButton>
      </nav>}
    </>}
    {selected && row && <AttemptDetails key={row.id} row={row} source={source} opener={selected.opener} close={() => setSelected(null)} />}
    {read.error && !read.loading && read.errorCause !== dismissedRead &&
      <DocumentOperationFailureDialog outcome="rejected" title="Não foi possível consultar as tentativas"
        description={read.error} cause={read.errorCause} operation="Consultar tentativas de avisos" fallbackCode="CENTRAL_TENTATIVAS_CONSULTA"
        attempts={readAttempts} closeLabel="Voltar" finalFocus={refreshRef} onClose={() => setDismissedRead(read.errorCause)}
        action={readAttempts < operationRecoveryLimit ? { label: "Consultar novamente", onClick: () => { setReadAttempts(count => count + 1); read.refresh(); } } : undefined}
        exhaustedMessage={readAttempts >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined} />}
  </>;
}

function AttemptDetails({ row, source, opener, close }: { row: Row; source: TechnicalNotificationSource; opener: HTMLButtonElement; close: () => void }) {
  const [message, setMessage] = useState("");
  const title = `${channels[row.channel]} · ${row.id.slice(0, 8)}`;

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(`Home Care Assistant\nFonte: ${sources[source]}\nBanco compartilhado\nReferência técnica: ${row.id}`);
      setMessage("Referência técnica copiada.");
    } catch {
      setMessage("Não foi possível copiar. Selecione a referência técnica acima.");
    }
  }

  return <Drawer open title={title} kicker="Tentativa de comunicação" headingIcon="bell"
    keyboardScrollable popupClassName="hca-technical-sheet hca-guide-topic-sheet" onClose={close} finalFocus={() => opener.isConnected ? opener : false}
    footer={<ActionButton variant="primary" onClick={close}><Icon name="back" />Voltar às tentativas</ActionButton>}>
    <div className="hca-form">
      <DefinitionGrid items={[
        { label: "Fonte", value: sources[source] }, { label: "Estado", value: labels[row.state] },
        { label: "Criado em", value: formatBrazilDate(row.createdAt) },
        { label: "Tentativas informadas na fonte", value: row.recordedAttemptCount },
        { label: "Última tentativa informada", value: row.attemptedAt ? formatBrazilDate(row.attemptedAt) : "Instante não registrado" },
        { label: "Referência do provedor", value: row.providerReferenceRecorded ? "Presente · conteúdo restrito" : "Não registrada neste recorte" },
        { label: "Erro técnico", value: row.errorRecorded ? "Registrado · conteúdo restrito" : "Não registrado neste recorte" },
      ]} />
      <section aria-label="Histórico da tentativa">
        <h3>Histórico de tentativas</h3>
        {row.historyCoverage === "last_result_only" ? <p className="hca-field-hint">A fonte legada conserva seu resultado atual, sem histórico individual completo. Registros anteriores ausentes não são reconstruídos.</p> :
          row.attempts.length ? <ol className="hca-guide-timeline" aria-label="Tentativas registradas">{row.attempts.map(attempt => <li key={attempt.id}>
            <span aria-hidden="true"><Icon name="clock" width={16} /></span>
            <div>
              <h4>Tentativa {attempt.ordinal} · {labels[attempt.outcome]}</h4>
              <DefinitionGrid items={[
                { label: "Referência da tentativa", value: attempt.id, wide: true },
                { label: "Início", value: formatBrazilDate(attempt.startedAt) },
                { label: "Conclusão", value: attempt.completedAt ? formatBrazilDate(attempt.completedAt) : "Sem conclusão registrada" },
                { label: "Erro", value: attempt.errorRecorded ? "Erro registrado · conteúdo restrito" : "Sem erro registrado" },
              ]} />
            </div>
          </li>)}</ol> : <p className="hca-field-hint">Nenhuma tentativa individual foi registrada nesta fonte. O resultado de um envio pode continuar desconhecido.</p>}
      </section>
      <p className="hca-field-hint">A consulta exibe metadados técnicos. Conteúdo da mensagem e dados privados ficam restritos.</p>
      <details className="hca-technical-disclosure">
        <summary>Referência técnica<Icon name="down" width={16} /></summary>
        <div className="hca-form">
          <DefinitionGrid items={[{ label: "Referência técnica", value: row.id, wide: true }, { label: "Destino", value: "Omitido neste contexto técnico" }]} />
          <ActionButton compact onClick={() => void copyReference()}><Icon name="copy" />Copiar referência técnica</ActionButton>
          {message && <p role="status">{message}</p>}
        </div>
      </details>
    </div>
  </Drawer>;
}
