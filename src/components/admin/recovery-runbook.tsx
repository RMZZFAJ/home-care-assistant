"use client";

import { useRef, useState } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { formatBrazilDate } from "@/lib/receipt";
import { environmentLabels, incidentLabels, type Diagnostics } from "@/lib/operations/contracts";
import { recoveryEvidence } from "@/lib/operations/recovery";

const steps = [
  ["Defina responsáveis e impacto", "Identifique o ambiente, o incidente e a correlação. Registre o responsável e o substituto com acesso autorizado à custódia antes da intervenção."],
  ["Confira cópia e ensaio", "Compare identificador, manifesto, hashes e arquivos com o inventário protegido do operador. Mantenha as chaves sob custódia separada."],
  ["Trabalhe em ambiente isolado", "Confira banco e arquivos pelo procedimento de ensaio. Mantenha mensagens e agendamentos em quarentena."],
  ["Reconcile antes da retomada", "Confira identidades, vínculos, permissões, documentos e filas sem repetir envios ou operações. Registre divergências com a correlação. A retomada e as metas de perda e tempo dependem da validação operacional de recuperação."],
] as const;

function measurement(event: Diagnostics["events"][number] | null) {
  return event ? `${incidentLabels[event.code]} · ${formatBrazilDate(event.at)}` : "Não localizado nesta consulta";
}

export function RecoveryRunbook({ data }: { data: Diagnostics }) {
  const [panel, setPanel] = useState<"evidence" | "policy" | null>(null);
  const evidenceButtonRef = useRef<HTMLButtonElement>(null);
  const policyButtonRef = useRef<HTMLButtonElement>(null);
  const evidence = recoveryEvidence(data);
  const records = [{ title: "Último registro de cópia", event: evidence.backup }, { title: "Último ensaio", event: evidence.probe }];
  const environment = environmentLabels[data.environment];
  const close = () => setPanel(null);

  return <section aria-label="Roteiro de recuperação do serviço" className="hca-recovery-grid">
    <section className="ui-card hca-technical-list" aria-label="Cópia e ensaio de recuperação">
      <header className="hca-technical-cardhead"><h3>Backup e recuperação</h3></header>
      <div className="hca-continuity-body hca-form">
        <div className="hca-guide-reading hca-continuity-summary">
          <span><Icon name="shield" /></span>
          <div>
            <strong>{evidence.compatible ? "Cópia e ensaio compatíveis" : "Cópia e ensaio ainda não conciliados"}</strong>
            <p>{evidence.compatible ? "Os identificadores e o manifesto correspondem. A conferência dos arquivos e do ambiente de ensaio cabe ao operador." : "Este recorte ainda não confirma uma cópia e um ensaio da mesma versão."}</p>
          </div>
        </div>
        <DefinitionGrid items={[
          ...records.map(({ title, event }) => ({ label: title, value: measurement(event) })),
          { label: "Cópia de referência", value: evidence.backup?.metrics.archiveId ?? "Não informada", wide: true },
        ]} />
        <button ref={evidenceButtonRef} type="button" className="hca-guide-row hca-continuity-row" onClick={() => setPanel("evidence")}>
          <span className="hca-guide-row-icon"><Icon name="file" /></span>
          <span className="hca-guide-row-label"><strong>Consultar os registros</strong><small>Identificador, manifesto e resultados informados</small></span>
          <Icon name="chevron" width={16} />
        </button>
        <p className="hca-field-hint">A rotina externa de backup e o monitor externo permanecem sem ativação.</p>
      </div>
    </section>
    <section className="ui-card hca-technical-list" aria-label="Procedimento e responsabilidades">
      <header className="hca-technical-cardhead"><h3>Como conduzir a recuperação</h3></header>
      <div className="hca-continuity-body hca-form">
        <ol className="hca-guide-timeline">{steps.map(([title, description], index) => <li key={title}>
          <span aria-hidden="true">{index + 1}</span><div><h4>{title}</h4><p>{description}</p></div>
        </li>)}</ol>
        <button ref={policyButtonRef} type="button" className="hca-guide-row hca-continuity-row" onClick={() => setPanel("policy")}>
          <span className="hca-guide-row-icon"><Icon name="clock" /></span>
          <span className="hca-guide-row-label"><strong>Política de continuidade</strong><small>Retenção e objetivos de recuperação</small></span>
          <Icon name="chevron" width={16} />
        </button>
      </div>
    </section>
    {panel === "evidence" && <Drawer open title="Evidências de continuidade" kicker={environment} headingIcon="shield"
      keyboardScrollable finalFocus={evidenceButtonRef} onClose={close} popupClassName="hca-technical-sheet hca-guide-topic-sheet"
      footer={<ActionButton variant="primary" onClick={close}>Voltar</ActionButton>}>
      <div className="hca-form">
        <DefinitionGrid items={[{ label: "Ambiente", value: environment }, { label: "Consulta", value: formatBrazilDate(data.consultedAt) }]} />
        {records.map(({ title, event }) => <section className="hca-technical-comparison" key={title}>
          <h3>{title}</h3>
          {event ? <DefinitionGrid items={[
            { label: "Resultado informado", value: measurement(event), wide: true },
            { label: "Correlação", value: event.correlationId },
            { label: "Identificador da cópia", value: event.metrics.archiveId ?? "Não informado" },
            { label: "SHA-256 do manifesto", value: event.metrics.manifestSha256 ?? "Não informado", wide: true },
            { label: "Arquivos informados", value: event.metrics.files ?? "Não informado" },
            { label: "Bytes informados", value: event.metrics.bytes ?? "Não informado" },
          ]} /> : <p>Nenhum registro neste recorte.</p>}
        </section>)}
        <p className="hca-field-hint">O inventário completo fica na custódia do operador. A correspondência dos registros não comprova a presença dos arquivos nem autoriza restauração ou retomada.</p>
      </div>
    </Drawer>}
    {panel === "policy" && <Dialog open title="Política de continuidade" headingIcon="clock"
      keyboardScrollable finalFocus={policyButtonRef} onClose={close} footer={<ActionButton variant="primary" onClick={close}>Voltar</ActionButton>}>
      <DefinitionGrid items={[
        { label: "Retenção inicial", value: "7 cópias diárias e 4 semanais" },
        { label: "Alteração crítica", value: "Cópia prévia" },
        { label: "Proteção", value: "Cifra, manifesto e hashes" },
        { label: "Custódia das chaves", value: "Separada da cópia" },
        { label: "Perda de dados pretendida", value: "Até 24 horas · a comprovar" },
        { label: "Retorno pretendido", value: "Até 8 horas · a comprovar" },
      ]} />
      <p className="hca-field-hint">Os objetivos dependem de comprovação em operação.</p>
    </Dialog>}
  </section>;
}
