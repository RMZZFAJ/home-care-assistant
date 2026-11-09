import { formatBrazilDate } from "@/lib/receipt";
import { environmentLabels, incidentLabels, type Diagnostics } from "@/lib/operations/contracts";
import { recoveryEvidence } from "@/lib/operations/recovery";

export function RecoveryRunbook({ data }: { data: Diagnostics }) {
  const evidence = recoveryEvidence(data);
  return <section aria-label="Roteiro de recuperação do serviço" className="ui-card space-y-4">
    <h3 className="font-semibold">Roteiro de recuperação do serviço</h3>
    <p>Ambiente: {environmentLabels[data.environment]}. Consulta: {formatBrazilDate(data.consultedAt)}. Este recorte recente não é um inventário completo de cópias.</p>
    <ol className="list-decimal space-y-4 pl-6">
      <li><h4 className="font-semibold">Identificar o impacto e o responsável</h4><p>Confira os incidentes deste ambiente e sua correlação abaixo. Designe responsável e substituto no registro do incidente antes de qualquer intervenção. O histórico técnico informa acompanhamento; não comprova essa designação.</p></li>
      <li><h4 className="font-semibold">Conferir a cópia e o ensaio isolado</h4>
        <p role="status">{evidence.compatible ? "Registros compatíveis da mesma cópia. A conferência dos arquivos e do ambiente de ensaio ainda cabe ao operador." : "Cópia e ensaio da mesma versão ainda não confirmados neste recorte. Confira o arquivo e seu manifesto no procedimento do operador."}</p>
        <div className="space-y-3">{([{ kind: "backup", event: evidence.backup, title: "Último registro de cópia no recorte" }, { kind: "probe", event: evidence.probe, title: "Último registro de ensaio no recorte" }] as const).map(({ kind, event, title }) => <div key={kind}>
          <h5 className="font-semibold">{title}</h5>
          {event ? <dl className="break-all text-sm"><dt>Resultado informado</dt><dd>{incidentLabels[event.code]} · {formatBrazilDate(event.at)}</dd><dt>Correlação</dt><dd>{event.correlationId}</dd><dt>Identificador da cópia</dt><dd>{event.metrics.archiveId ?? "Não informado"}</dd><dt>SHA-256 do manifesto</dt><dd>{event.metrics.manifestSha256 ?? "Não informado"}</dd><dt>Arquivos / bytes informados</dt><dd>{event.metrics.files ?? "Não informado"} / {event.metrics.bytes ?? "Não informado"}</dd></dl> : <p>Nenhum registro neste recorte. Consulte o inventário protegido do operador.</p>}
        </div>)}</div>
      </li>
      <li><h4 className="font-semibold">Isolar antes de recuperar</h4><p>Use o procedimento de ensaio em ambiente isolado. Mantenha agendamentos e saídas de mensagens em quarentena; confira manifesto, hashes, banco e arquivos. Custódia das chaves fica separada da cópia. Não envie arquivos ou segredos por este painel.</p></li>
      <li><h4 className="font-semibold">Reconciliar antes da retomada</h4><p>Confira identidades, vínculos, permissões, documentos, arquivos e filas sem reenviar operações. Registre resultados e divergências com a correlação. Encerrar um incidente não executa restauração nem confirma integridade.</p></li>
      <li><h4 className="font-semibold">Conferir o gate de retomada</h4><p>Restauração operacional, quarentena completa e metas de perda e tempo de recuperação dependem da validação D6. Backup externo e monitor externo estão sem ativação. Estes registros não autorizam retomada operacional.</p></li>
    </ol>
    <p className="text-sm">Para repetir a consulta, use “Atualizar monitoramento”. Consultar este roteiro não altera dados, filas, incidentes ou permissões.</p>
  </section>;
}
