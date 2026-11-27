import Link from "next/link";
import { ActionButton, DefinitionGrid, LoadingIndicator, Pill } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { balanceCountHref } from "@/lib/balances/routes";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceAgendaEligibility } from "@/lib/validation/balances";
import type { ScheduledShift } from "@/types/schedules";

export function scheduleBalanceMatches(eligibility: BalanceAgendaEligibility | null, shift: ScheduledShift) {
  const assignment = eligibility?.assignment;
  return assignment?.shift_id === shift.id && assignment.shift_version === shift.version
    && assignment.professional_id === shift.professional_id && shift.status === "published"
    && Date.parse(assignment.starts_at) >= Date.parse(shift.starts_at)
    && Date.parse(assignment.ends_at) <= Date.parse(shift.ends_at);
}

export function ScheduleBalancePreview({ patientId, patientName, shift, eligibility, checkedAt, loading, error, onRetry, onClose, finalFocus }: {
  patientId: string;
  patientName: string;
  shift: ScheduledShift;
  eligibility: BalanceAgendaEligibility | null;
  checkedAt: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const current = !loading && !error ? eligibility : null;
  const assignment = current?.assignment;
  const permitted = Boolean(current?.admission || current?.available);
  const format = (value: string | null) => formatZonedDate(value, shift.timezone);
  const inFuture = assignment && Date.parse(assignment.starts_at) > checkedAt;
  const expired = assignment && Date.parse(assignment.ends_at) <= checkedAt;
  const title = "Balanço de " + new Intl.DateTimeFormat("pt-BR", {
    timeZone: shift.timezone, day: "numeric", month: "long",
  }).format(new Date(shift.starts_at));
  let status = "Responsável definido";
  if (current?.admission) status = "Contagem em andamento";
  else if (current?.available) status = "Disponível para você";
  else if (inFuture) status = "Programado";
  else if (expired) status = "Prazo encerrado";

  return <Drawer open title={title} kicker="Balanço de estoque" headingIcon="checklist"
    subtitle={"Estoque da equipe · " + patientName}
    keyboardScrollable popupClassName="hca-schedule-balance-sheet"
    onClose={onClose} closeLabel="Fechar detalhes do balanço" finalFocus={finalFocus}
    footer={<>
      <ActionButton onClick={onClose}>Fechar</ActionButton>
      {assignment && current && permitted
        ? <Link className="ui-button ui-button-primary" prefetch={false}
            href={balanceCountHref(patientId, current.documentId, assignment)}>
            {current.admission ? "Continuar contagem" : "Iniciar balanço"}
          </Link>
        : assignment ? <Link className="ui-button ui-button-primary" prefetch={false}
            href={"/balancos?" + new URLSearchParams({ careRecipientId: patientId }) + "#responsabilidade-balanco"}>
            Acompanhar balanços
          </Link> : null}
    </>}>
    {loading ? <LoadingIndicator label="Conferindo o balanço deste plantão" /> :
      error ? <Notice error>Não foi possível consultar o balanço deste plantão. <ActionButton onClick={onRetry}>Tentar novamente</ActionButton></Notice> :
      assignment && current ? <div className="hca-form-stack">
        <div><Pill tone={permitted ? "success" : expired ? "danger" : "neutral"}>{status}</Pill></div>
        <DefinitionGrid className="hca-schedule-balance-facts" items={[
          { label: "Responsável", value: shift.professional_name },
          { label: "Plantão", value: format(shift.starts_at) + " → " + format(shift.ends_at) },
          { label: "Prazo atual", value: format(current.dueAt ?? assignment.ends_at) },
        ]} />
        {inFuture ? <p>A contagem ficará disponível ao responsável a partir de {format(assignment.starts_at)}.</p>
          : current.available && !current.admission ? <p>A ficha de balanço registrará os materiais e a autoria da contagem.</p> : null}
      </div> : <Notice>A atribuição deste plantão mudou ou deixou de estar disponível.</Notice>}
  </Drawer>;
}
