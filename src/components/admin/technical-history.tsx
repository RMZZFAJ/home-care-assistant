"use client";

import { useCallback, useState } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { operationLabels, operationsHistory, type OperationEnvironment } from "@/lib/operations/contracts";
import { useScopedRead } from "@/lib/use-scoped-read";

export const thresholdLabels = {
  heartbeatWarningSeconds: "Atividade · atenção", heartbeatCriticalSeconds: "Atividade · crítico",
  jobWarningSeconds: "Processamento · atenção", jobCriticalSeconds: "Processamento · crítico",
  pdfWarningSeconds: "Emissão de arquivo · atenção", pdfCriticalSeconds: "Emissão de arquivo · crítico",
  backupWarningSeconds: "Backup · atenção", backupCriticalSeconds: "Backup · crítico",
  securityWindowSeconds: "Segurança · janela em segundos", securityWarningCount: "Segurança · recusas para atenção",
  securityCriticalCount: "Segurança · recusas para crítico",
} as const;
export const stateLabels = { open: "Aberto", acknowledged: "Em acompanhamento", resolved: "Encerrado" };
const actionLabels = {
  opened: "Incidente aberto", observed: "Observação atualizada", acknowledged: "Acompanhamento iniciado",
  resolved: "Incidente encerrado", recovered: "Condição deixou de ser detectada",
  configured: "Política configurada", escalated: "Severidade alterada",
};
export const reasonLabels = {
  investigating: "Em investigação", waiting_dependency: "Aguardando dependência", contained: "Condição contida",
  corrected: "Correção conferida", reviewed_history: "Lacuna histórica revisada", false_alarm: "Alarme indevido conferido",
} as const;

export function TechnicalHistory({ environment, incidentId, close }: {
  environment: OperationEnvironment; incidentId: string | null; close: () => void;
}) {
  const [page, setPage] = useState(1);
  const decode = useCallback((value: unknown) => {
    const result = operationsHistory.parse((value as { data: unknown }).data);
    if (result.environment !== environment || result.incidentId !== incidentId || result.page !== page)
      throw new Error("O histórico retornou outra referência técnica.");
    return result;
  }, [environment, incidentId, page]);
  const query = new URLSearchParams({ environment, history: incidentId ? "incident" : "policy", page: String(page) });
  if (incidentId) query.set("incident", incidentId);
  const read = useScopedRead("/api/operations?" + query, "", decode);
  const data = !read.loading && !read.error ? read.data : null;

  return <Drawer open title={incidentId ? "Histórico do incidente" : "Histórico das políticas"}
    popupClassName="hca-technical-sheet hca-guide-topic-sheet" kicker="Administração global" headingIcon="history"
    onClose={close} footer={<ActionButton onClick={close}><Icon name="back" />{incidentId ? "Voltar ao incidente" : "Voltar à política"}</ActionButton>}>
    <section className="hca-form" aria-label="Histórico técnico completo">
      {read.loading && <p role="status">Consultando histórico…</p>}
      {read.error && !read.loading && <Notice error>{read.error}<ActionButton compact onClick={read.refresh}>Consultar histórico novamente</ActionButton></Notice>}
      {data && <>
        <p className="hca-field-hint">{data.total} registros · página {data.page}</p>
        <ol className="hca-guide-timeline">{data.data.map(line => <li key={line.id}>
          <span><Icon name="history" width={16} /></span>
          <div>
            <h3>{actionLabels[line.action]}</h3>
            <p>{line.operator === "system" ? "Sistema" : "Administração global"} · {formatBrazilDate(line.at)}
              {line.version !== null && ` · versão ${line.version}`}{line.reason && ` · ${reasonLabels[line.reason]}`}</p>
            {line.policy && <details>
              <summary>Política preservada · versão {line.policyVersion}</summary>
              <DefinitionGrid items={[
                ...Object.entries(thresholdLabels).map(([key, label]) => ({ label, value: line.policy![key as keyof typeof thresholdLabels] })),
                ...Object.entries(operationLabels).map(([key, label]) => ({
                  label, value: line.policy!.severity[key as keyof typeof operationLabels] === "critical" ? "Crítico" : "Atenção",
                })),
              ]} />
            </details>}
          </div>
        </li>)}</ol>
        {!data.total && <p>Nenhum ato registrado neste histórico.</p>}
        {data.total > data.pageSize && <div className="hca-toolbar hca-technical-pagination">
          <ActionButton compact disabled={page === 1} onClick={() => setPage(value => value - 1)}>Histórico anterior</ActionButton>
          <ActionButton compact disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Próximo histórico</ActionButton>
        </div>}
      </>}
    </section>
  </Drawer>;
}
