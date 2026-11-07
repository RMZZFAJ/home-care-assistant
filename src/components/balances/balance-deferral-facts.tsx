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
    <div className="space-y-3 text-sm">
      <p>Solicitação original: {deferral.reason}</p>
      <div aria-label="Destino congelado da solicitação">
        <h3 className="font-semibold">Plantão proposto na solicitação</h3>
        <p>
          {deferral.target_snapshot.professional_name} ·{" "}
          {deferral.target_snapshot.type_name}
        </p>
        <p>
          {format(deferral.target_snapshot.starts_at)} →{" "}
          {format(deferral.target_snapshot.ends_at)}
        </p>
        <p>Versão proposta: {deferral.target_shift_version}.</p>
        <p>
          Prazo da atribuição original:{" "}
          {format(context?.sourceDeadline ?? null)}.
        </p>
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
          <p>
            {target.professional_name} · {target.type_name} · versão{" "}
            {target.version} ·{" "}
            {target.status === "cancelled"
              ? "Cancelado"
              : target.status === "published"
                ? "Publicado"
                : "Em preparação"}
          </p>
          <p>
            {format(target.starts_at)} → {format(target.ends_at)}
          </p>
          <p>
            A situação atual não substitui o destino congelado deste pedido.
          </p>
        </div>
      ) : null}
      {deferral.decision_snapshot ? (
        <div>
          <h3 className="font-semibold">Decisão registrada</h3>
          <p>
            {deferral.decision_snapshot.actor.name} ·{" "}
            {format(deferral.decision_snapshot.recordedAt)}
          </p>
          <p>{deferral.decision_snapshot.reason}</p>
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
