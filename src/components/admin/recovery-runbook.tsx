import { DefinitionGrid } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { formatBrazilDate } from "@/lib/receipt";
import { environmentLabels, incidentLabels, type Diagnostics } from "@/lib/operations/contracts";
import { recoveryEvidence } from "@/lib/operations/recovery";

export function RecoveryRunbook({ data }: { data: Diagnostics }) {
  const evidence = recoveryEvidence(data);
  return <section aria-label="Roteiro de recuperação do serviço" className="space-y-4">
    <p>Ambiente: {environmentLabels[data.environment]}. Consulta: {formatBrazilDate(data.consultedAt)}. Este recorte recente não é um inventário completo de cópias.</p>
    <div className="hca-recovery-grid">
      <section className="ui-card hca-operations-card" aria-label="Cópia e ensaio de recuperação">
        <h3>Backup e recuperação</h3>
        <DefinitionGrid className="mt-4" items={[
          {label:"Política inicial",value:"7 cópias diárias e 4 semanais, além da cópia pré-alteração crítica"},
          {label:"Proteção",value:"Cifra, manifesto e hashes; chaves sob custódia separada"},
          {label:"Perda de dados pretendida",value:"Até 24 horas, a comprovar em operação"},
          {label:"Retorno pretendido",value:"Até 8 horas, a comprovar em operação"},
        ]} />
        <FeedbackBanner tone={evidence.compatible ? "info" : "warning"}>{evidence.compatible ? "Registros compatíveis da mesma cópia. A conferência dos arquivos e do ambiente de ensaio ainda cabe ao operador." : "Cópia e ensaio da mesma versão ainda não confirmados neste recorte. Confira o arquivo e seu manifesto no procedimento do operador."}</FeedbackBanner>
        <div className="hca-recovery-evidence">{([{ kind: "backup", event: evidence.backup, title: "Último registro de cópia no recorte" }, { kind: "probe", event: evidence.probe, title: "Último registro de ensaio no recorte" }] as const).map(({ kind, event, title }) => <div key={kind}>
          <h5>{title}</h5>
          {event ? <DefinitionGrid items={[
            {label:"Resultado informado",value:incidentLabels[event.code] + " · " + formatBrazilDate(event.at),wide:true},
            {label:"Correlação",value:event.correlationId},
            {label:"Identificador da cópia",value:event.metrics.archiveId ?? "Não informado"},
            {label:"SHA-256 do manifesto",value:event.metrics.manifestSha256 ?? "Não informado",wide:true},
            {label:"Arquivos / bytes informados",value:`${event.metrics.files ?? "Não informado"} / ${event.metrics.bytes ?? "Não informado"}`},
          ]} /> : <p>Nenhum registro neste recorte. Consulte o inventário protegido do operador.</p>}
        </div>)}</div>
      </section>
      <section className="ui-card hca-operations-card" aria-label="Procedimento e responsabilidades">
        <h3>Roteiro de recuperação do serviço</h3>
        <p>Responsável, substituto e acesso à custódia devem estar definidos antes da intervenção.</p>
        <ol className="hca-recovery-steps mt-4">
          <li><h4>Identificar o impacto e o responsável</h4><p>Confira os incidentes deste ambiente e sua correlação. Designe responsável e substituto no registro do incidente antes de qualquer intervenção. O histórico técnico informa acompanhamento; não comprova essa designação.</p></li>
          <li><h4>Conferir a cópia e o ensaio isolado</h4><p>Confronte os registros com o inventário protegido. Compatibilidade de registros não comprova a presença dos arquivos nem autoriza restauração.</p></li>
          <li><h4>Isolar antes de recuperar</h4><p>Use o procedimento de ensaio em ambiente isolado. Mantenha agendamentos e saídas de mensagens em quarentena; confira manifesto, hashes, banco e arquivos. Custódia das chaves fica separada da cópia. Não envie arquivos ou segredos por este painel.</p></li>
          <li><h4>Reconciliar antes da retomada</h4><p>Confira identidades, vínculos, permissões, documentos, arquivos e filas sem reenviar operações. Registre resultados e divergências com a correlação. Encerrar um incidente não executa restauração nem confirma integridade.</p></li>
          <li><h4>Conferir as condições de retomada</h4><p>Restauração operacional, quarentena completa e metas de perda e tempo de recuperação dependem da validação operacional de recuperação. Backup externo e monitor externo estão sem ativação. Estes registros não autorizam retomada operacional.</p></li>
        </ol>
      </section>
    </div>
    <p className="text-sm">Para repetir a consulta, use “Atualizar monitoramento”. Consultar este roteiro não altera dados, filas, incidentes ou permissões.</p>
  </section>;
}
