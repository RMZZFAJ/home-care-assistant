"use client";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import type { ScheduleRecovery } from "./use-schedule-confirmation";
const labels: Record<string, string> = {
  type: "Tipo de plantão",
  series: "Nova programação",
  approve: "Aprovar programação",
  reject: "Recusar programação",
  end_series: "Encerrar programação",
  change: "Alterar plantão",
  propose_change: "Propor alteração",
  cancel: "Cancelar plantão",
  decide_change: "Decidir alteração",
  close_obsolete: "Encerrar proposta obsoleta",
};
export function ScheduleConfirmationPanel({
  recovery,
  onConfirmed,
}: {
  recovery: ScheduleRecovery;
  onConfirmed?: () => void;
}) {
  const { pending, receipt } = recovery;
  if (!pending && !receipt && !recovery.error) return null;
  async function act(action: "recover" | "retry") {
    try {
      if (await recovery[action]()) onConfirmed?.();
    } catch {
      /* Controller presents the safe error and retains the packet. */
    }
  }
  return (
    <section className="ui-card space-y-3" aria-label="Confirmação de escala">
      <h3>
        {pending
          ? "Tentativa de escala preservada"
          : receipt
            ? "Resultado da escala"
            : "Conferência da tentativa"}
      </h3>
      {recovery.error ? <Notice error>{recovery.error}</Notice> : null}
      {pending && !recovery.readDenied ? (
        <>
          <p>
            A mesma decisão foi guardada neste aparelho. Recarregar a página não
            a envia. Consulte a confirmação antes de preparar outra ação.
          </p>
          <DefinitionGrid
            items={[
              { label: "Decisão", value: labels[pending.command.action] },
              {
                label: "Versão conferida",
                value: pending.expectedVersion ?? "Novo registro",
              },
              ...("name" in pending.command.body
                ? [{ label: "Nome", value: pending.command.body.name }]
                : []),
              ...("notes" in pending.command.body && pending.command.body.notes
                ? [
                    {
                      label: "Anotações preservadas",
                      value: pending.command.body.notes,
                      wide: true,
                    },
                  ]
                : []),
            ]}
          />
          <div className="hca-toolbar">
            <ActionButton
              disabled={recovery.busy}
              onClick={() => void act("recover")}
            >
              {recovery.busy
                ? "Consultando…"
                : "Consultar confirmação da escala"}
            </ActionButton>
            {recovery.notFound ? (
              <ActionButton
                disabled={recovery.busy}
                onClick={() => void act("retry")}
              >
                Reenviar a mesma tentativa
              </ActionButton>
            ) : null}
          </div>
        </>
      ) : null}
      {pending && recovery.readDenied ? (
        <ActionButton
          disabled={recovery.busy}
          onClick={() => void act("recover")}
        >
          Consultar novamente após recuperar o acesso
        </ActionButton>
      ) : null}
      {receipt && !recovery.readDenied ? (
        <Notice>
          {receipt.result.status === "obsolete"
            ? "A proposta foi encerrada como obsoleta. O plantão vigente foi preservado; nenhuma aprovação foi feita."
            : "Confirmação encontrada. O resultado foi conferido sem criar outra programação ou repetir seus efeitos."}
        </Notice>
      ) : null}
    </section>
  );
}
