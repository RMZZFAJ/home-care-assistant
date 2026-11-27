"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ActionButton, DefinitionGrid, LoadingIndicator, Pill } from "@/components/ui/controls";
import { can, Notice, type WorkspaceContext } from "@/components/workspace";
import { weekDays } from "./balance-forms";
import { BalanceWorkspacePreparation } from "./balance-workspace-preparation";
import { useBalanceWorkspace } from "./use-balance-workspace";

export function canManageBalanceRegime(context: WorkspaceContext) {
  return can(context, "bal.schedule.manage");
}

export function BalanceRegimeSettings({ context, patientId }: { context: WorkspaceContext; patientId: string }) {
  const { data, error, reload } = useBalanceWorkspace(patientId);
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  const [committed, setCommitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ready = data?.types.some(type => type.is_active);
  const regime = data?.regime;

  return (
    <section className="ui-card hca-balance-regime" id="programacao-balancos" aria-labelledby="balance-regime-title">
      <div className="hca-section-heading">
        <h2 id="balance-regime-title" ref={headingRef} tabIndex={-1}>Programação do balanço</h2>
        {data ? <Pill tone={data.enabled ? "accent" : "neutral"}>{data.enabled ? "Ativa neste paciente" : "Processamento desativado"}</Pill> : null}
      </div>
      {error ? <Notice error>{error} <ActionButton onClick={reload}>Tentar novamente</ActionButton></Notice> : null}
      {committed ? <Notice>Decisão registrada.</Notice> : null}
      {data ? <>
        {regime ? (
          <DefinitionGrid items={[
            { label: "Dia do balanço", value: weekDays[regime.weekday] },
            { label: "Plantão configurado", value: data.types.find(type => type.id === regime.shift_type_id)?.name ?? "Tipo não disponível" },
            { label: "Fuso", value: regime.timezone },
            ...(regime.observation ? [{ label: "Observação", value: <span className="whitespace-pre-wrap wrap-anywhere">{regime.observation}</span>, wide: true }] : []),
          ]} />
        ) : <p>O regime de balanços ainda não foi ativado neste paciente.</p>}
        {!ready ? <p>Cadastre um tipo de plantão antes de ativar os balanços.</p> : null}
        <div className="hca-toolbar">
          <ActionButton disabled={!ready || Boolean(error)} onClick={event => {
            setCommitted(false);
            setOpener(event.currentTarget);
          }}>Configurar dia e plantão</ActionButton>
          <Link href={"/balancos?" + new URLSearchParams({ careRecipientId: patientId })}
            className="ui-button ui-button-secondary" prefetch={false}>Voltar aos balanços</Link>
        </div>
      </> : !error ? <LoadingIndicator label="Carregando programação do balanço" /> : null}
      {opener && data ? <BalanceWorkspacePreparation
        context={context} selection={{ purpose: "configure", targetResourceId: patientId }} initialData={data}
        restoreFocusTo={opener} restoreFocusFallbackRef={headingRef}
        onClose={() => setOpener(null)} onConsulted={reload}
        onCommitted={() => {
          setOpener(null);
          setCommitted(true);
          reload();
        }}
      /> : null}
    </section>
  );
}
