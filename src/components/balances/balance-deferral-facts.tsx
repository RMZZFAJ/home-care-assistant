import { DefinitionGrid } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceDeferral } from "@/types/balances";

export function DeferralFacts({
  deferral,
  timezone,
}: {
  deferral: BalanceDeferral;
  timezone?: string;
}) {
  const context = deferral.decisionContext,
    target = context?.currentTarget;
  const format = (value: string | null) =>
    value ? formatZonedDate(value, timezone) : "Não preservado";
  return (
    <div className="hca-form-stack hca-balance-facts">
      <p>Solicitação original: {deferral.reason}</p>
      <div aria-label="Destino congelado da solicitação">
        <h3 className="font-semibold">Plantão proposto na solicitação</h3>
        <DefinitionGrid items={[
          { label: "Profissional e tipo propostos", value: deferral.target_snapshot.professional_name + " · " + deferral.target_snapshot.type_name },
          { label: "Período proposto", value: format(deferral.target_snapshot.starts_at) + " → " + format(deferral.target_snapshot.ends_at) },
          { label: "Versão proposta", value: deferral.target_shift_version },
          { label: "Prazo da atribuição original", value: format(context?.sourceDeadline ?? null) },
        ]} />
      </div>
      {deferral.status === "pending" &&
      context?.canReject &&
      context &&
      (!context.sourceCurrent || context.targetState !== "unchanged") ? (
        <Notice>
          A atribuição ou o plantão proposto mudou ou perdeu elegibilidade. Este
          pedido não pode aprovar um novo destino. A recusa com motivo próprio
          pode encerrá-lo; outro destino exige outra solicitação.
        </Notice>
      ) : null}
      {context?.targetState !== "unchanged" && target ? (
        <div aria-label="Plantão atual para comparação">
          <h3 className="font-semibold">Situação atual do plantão proposto</h3>
          <DefinitionGrid items={[
            { label: "Profissional e tipo atuais", value: target.professional_name + " · " + target.type_name },
            { label: "Versão atual", value: target.version },
            { label: "Situação atual", value: target.status === "cancelled" ? "Cancelado" : target.status === "published" ? "Publicado" : "Em preparação" },
            { label: "Período atual", value: format(target.starts_at) + " → " + format(target.ends_at) },
          ]} />
          <p>
            A situação atual não substitui o destino congelado deste pedido.
          </p>
        </div>
      ) : null}
      {deferral.decision_snapshot ? (
        <div>
          <h3 className="font-semibold">Decisão registrada</h3>
          <DefinitionGrid items={[
            { label: "Decisão registrada por", value: deferral.decision_snapshot.actor.name },
            { label: "Instante da decisão", value: format(deferral.decision_snapshot.recordedAt) },
            { label: "Motivo próprio da decisão", value: deferral.decision_snapshot.reason, wide: true },
          ]} />
          <p>
            {deferral.decision_snapshot.deadlineChanged
              ? "Adiamento autorizado para o destino proposto e validado."
              : "Recusa sem alterar a atribuição, os prazos ou o estoque."}
          </p>
        </div>
      ) : deferral.decision_reason ? (
        <p>
          Motivo da decisão: {deferral.decision_reason}. O nome do decisor não
          foi preservado neste registro.
        </p>
      ) : null}
    </div>
  );
}
