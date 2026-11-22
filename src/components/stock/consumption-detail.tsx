"use client";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { DocumentProgress } from "@/components/documents/document-progress";
import { DocumentPanel, DocumentTabs, useDocumentTabs } from "@/components/documents/document-tabs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceState } from "@/components/layout/workspace-context";

import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";
import { ConsumptionPrivateResults } from "./consumption-private-results";
import { ConsumptionLines } from "./consumption-lines";
import { ConsumptionEditor } from "./consumption-editor";
import { ConsumptionDecision } from "./consumption-decision";
import { TeamConsumptionAction, type TeamConsumptionActionKind } from "./team-consumption-action";
import { consumptionFollowUp, consumptionLocationLabel, consumptionReadStampMatches, consumptionStateLabels, mergeConsumptionRead } from "@/lib/consumption/follow-up";

export function ConsumptionDetail({
  id,
  context,
  products,
  catalogError,
  catalogLoading,
  onCatalogRetry,
  onChange,
  onOpenRecord,
  onClose,
}: {
  id: string;
  context: WorkspaceContext;
  products: CatalogProduct[];
  catalogError: string;
  catalogLoading: boolean;
  onCatalogRetry: () => void;
  onChange: () => void;
  onOpenRecord: (id: string) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<ConsumptionReport | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [message, setMessage] = useState(""),
    [reading, setReading] = useState(true);
  const [editor, setEditor] = useState<HTMLElement | null>(null),
    [teamAction, setTeamAction] = useState<{ kind: TeamConsumptionActionKind; opener: HTMLElement; report: ConsumptionReport } | null>(null),
    [decision, setDecision] = useState<{
      report: ConsumptionReport;
      accept: boolean;
    } | null>(null);
  const live = useLiveRevision(),
    headingRef = useRef<HTMLHeadingElement>(null),
    firstFocusRef = useRef(false);
  const { loading, selecting } = useWorkspaceState();
  const tabs = useDocumentTabs(false);
  useEffect(() => {
    if (!data || reading || loading || selecting || firstFocusRef.current) return;
    // URL/context reads keep this detail mounted but inert under the loading
    // overlay. Transfer focus only after that transition has released it.
    const frame = requestAnimationFrame(() => {
      const heading = headingRef.current;
      if (!heading || heading.closest('[inert],[hidden],[aria-hidden="true"]')) return;
      heading.focus();
      firstFocusRef.current = document.activeElement === heading;
    });
    return () => cancelAnimationFrame(frame);
  }, [data, reading, loading, selecting]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setReading(true);
    });
    api<{ data: ConsumptionReport }>(
      "/api/consumption/" + id,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!consumptionReadStampMatches(result.data, id, context.patient!.id))
          throw new Error(
            "A consulta não corresponde ao relato, paciente ou versão esperados. Atualize o relato.",
          );
        setData(current => mergeConsumptionRead(current, result.data));
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Não foi possível consultar o relato.");
          if (
            reason instanceof ApiError &&
            [401, 403, 404].includes(reason.status)
          ) {
            setData(null);
            setMessage("");
            setEditor(null);
            setDecision(null);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [id, context.patient, attempt, live]);
  function saved(result: ConsumptionReport, action: "supplement" | "decision") {
    setData(result);
    setReading(false);
    setEditor(null);
    setDecision(null);
    setError("");
    setMessage(
      action === "supplement"
        ? result.replayed
          ? `Complemento anterior recuperado. Estado atual: ${result.status === "reported" ? "aguardando conferência" : result.status === "confirmed" ? "confirmado" : "rejeitado"}. Consulte a decisão e os movimentos registrados; o complemento não foi repetido.`
          : "Complemento salvo, aguarda conferência. Nenhum desconto foi registrado."
        : result.status === "rejected"
          ? "Relato rejeitado, sem desconto. Original e complementos foram preservados."
          : result.kind === "shortage"
            ? "Falta conferida, sem desconto de estoque."
            : `Consumo confirmado: ${result.movements.map((movement) => formatQuantity(movement.quantity, result.current_lines.find((line) => line.productId === movement.productId)?.unit)).join("; ")} descontado da ${result.location === "FAMILY" ? "família" : "equipe"}.`,
    );
    onChange();
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  const decide =
    data &&
    !reading &&
    !error &&
    can(
      context,
      data.location === "FAMILY"
        ? "stock.family.manage"
        : "consumption.confirm",
    );
  const supplement =
    data &&
    !reading &&
    !error &&
    can(context, "consumption.report") &&
    (data.location !== "FAMILY" ||
      ["admin", "family"].includes(context.patient!.role));
  const followUp = data ? consumptionFollowUp(data) : null;
  const legacy = data?.workflow_mode === "legacy" || data?.workflow_mode === undefined;
  const mayWriteTeam = context.patient?.is_active !== false && can(context, "consumption.team.write");
  const mayWrite = Boolean(data && !reading && !error && mayWriteTeam);
  const canAmend = mayWrite && data?.status === "recorded" && (data.reported_by === context.userId || can(context, "consumption.team.correct"));
  const progressType = data?.kind === "shortage" ? "FAL" : "CON";
  const recordLabel = progressType + "-" + id.slice(0, 8).toUpperCase();
  return (
    <section className="ui-card space-y-4" aria-label="Detalhe do relato">
      <div className="hca-toolbar">
        <h2 className="font-semibold" tabIndex={-1} ref={headingRef}>
          {data && !legacy ? data.kind === "shortage" ? "Aviso de falta" : "Consumo do plantão" : "Relato e conferência"}
        </h2>
        <ActionButton onClick={onClose}>Voltar à lista</ActionButton>
        <ActionButton onClick={() => { setReading(true); setAttempt((value) => value + 1); }}>
          Atualizar relato
        </ActionButton>
      </div>
      {error ? (
        <Notice error>
          {error} A consulta pode ser repetida; nenhum envio será realizado.
        </Notice>
      ) : null}
      {!data && !error ? <Notice>Carregando relato…</Notice> : null}
      {!data &&
      error &&
      (context.patient?.is_active === false ||
        context.patient?.active === false) ? (
        <ConsumptionPrivateResults
          context={context}
          target={id}
          refreshRevision={JSON.stringify([attempt, live])}
        />
      ) : null}
      {message ? <Notice>{message}</Notice> : null}
      {data ? (
        <>
          <DefinitionGrid items={[
            { label: "Tipo", value: data.kind === "shortage" ? "Falta de material" : legacy ? "Consumo extraordinário" : "Consumo do plantão" },
            { label: "Custódia", value: consumptionLocationLabel(data.location) },
            { label: "Situação", value: consumptionStateLabels[data.status] },
            { label: "Versão", value: data.version },
            { label: "Referência", value: recordLabel },
          ]} />
          {canAmend || mayWrite && data.status === "communicated" ? <div className="hca-toolbar">
            {canAmend ? <>
              <ActionButton onClick={event => setTeamAction({ kind: "correct", opener: event.currentTarget, report: data })}>Corrigir consumo</ActionButton>
              <ActionButton onClick={event => setTeamAction({ kind: "cancel", opener: event.currentTarget, report: data })}>Cancelar consumo</ActionButton>
            </> : <ActionButton onClick={event => setTeamAction({ kind: "shortage", opener: event.currentTarget, report: data })}>Reiterar aviso</ActionButton>}
          </div> : null}
          {reading || error ? (
            <p className="text-sm text-(--muted)">
              Última consulta confirmada; os dados preservados não representam uma nova atualização.
            </p>
          ) : null}
          <DocumentTabs auditAllowed={false} sections={["materials", "progress"]}
            value={tabs.value === "progress" ? "progress" : "materials"} onSelect={tabs.select} rootRef={tabs.rootRef}>
          <DocumentPanel value="materials">
          <details>
            <summary>Identificação do registro</summary>
            <p className="break-all">{data.id}</p>
          </details>
          {data.source_reminder_id ? (
            <Link
              href={
                "/consumo?" +
                new URLSearchParams({
                  careRecipientId: context.patient!.id,
                  ref: data.source_reminder_id,
                  refKind: "reminder",
                })
              }
            >
              Consultar lembrete de origem
            </Link>
          ) : null}
          <section>
            <h3 className="font-semibold">Relato original · versão 1</h3>
            <DefinitionGrid items={[{ label: "Relatado por", value: data.reported_name ?? "Nome não preservado no registro original" },{ label: "Registrado em", value: formatBrazilDate(data.created_at) }]} />
            <p className="my-2 whitespace-pre-wrap wrap-break-word">
              {data.body}
            </p>
            <ConsumptionLines lines={data.lines} />
          </section>
          {data.revisions.map((revision) => (
            <section
              className="border-t border-(--line) pt-4"
              key={revision.id}
            >
              <h3 className="font-semibold">
                {legacy ? "Complemento" : "Correção"} · versão {revision.version}
              </h3>
              <DefinitionGrid items={[{ label: "Complementado por", value: revision.actor_name ?? "Nome não preservado" },{ label: "Registrado em", value: formatBrazilDate(revision.created_at) }]} />
              <p className="my-2 whitespace-pre-wrap wrap-break-word">
                {revision.body}
              </p>
              <ConsumptionLines lines={revision.lines} />
            </section>
          ))}
          <section aria-label="Acompanhamento do relato">
            {reading || error ? <Notice>
              {reading ? "Atualizando o acompanhamento do relato…" : "O acompanhamento atual não foi confirmado. Atualize o relato antes de iniciar uma operação."}
            </Notice> : editor || decision ? <Notice>
              Sua operação está preservada na versão de trabalho. Conclua ou feche a operação para consultar a próxima providência atual.
            </Notice> : <FeedbackBanner tone={followUp?.pending ? "warning" : "info"}>
              <h3 className="font-semibold">{followUp?.heading}</h3>
              <p className="my-2 text-sm">{followUp?.description}</p>
            </FeedbackBanner>}
          </section>
          {data.status === "reported" ? (
            <section>
              <div className="hca-toolbar">
                {supplement ? (
                  <ActionButton
                    onClick={(event) => setEditor(event.currentTarget)}
                  >
                    Adicionar complemento
                  </ActionButton>
                ) : null}
                {decide ? (
                  <>
                    <ActionButton
                      variant="primary"
                      disabled={
                        data.kind === "consumption" &&
                        !data.current_lines.length
                      }
                      onClick={() =>
                        setDecision({ report: data, accept: true })
                      }
                    >
                      {data.kind === "shortage"
                        ? "Conferir falta"
                        : "Conferir consumo"}
                    </ActionButton>
                    <ActionButton
                      onClick={() =>
                        setDecision({ report: data, accept: false })
                      }
                    >
                      Rejeitar relato
                    </ActionButton>
                  </>
                ) : null}
              </div>
            </section>
          ) : legacy ? (
            <section>
              <h3 className="font-semibold">
                Decisão preservada · versão{" "}
                {data.decision?.version ?? data.version}
              </h3>
              <DefinitionGrid items={[
                { label: "Decisão registrada por", value: data.decision?.actor_name ?? "Nome do decisor não preservado" },
                { label: "Registrada em", value: formatBrazilDate(data.confirmed_at) },
                ...(data.decision?.reason ? [{ label: "Motivo próprio", value: data.decision.reason, wide: true }] : []),
              ]} />
              <p className="my-2">
                {data.status === "rejected"
                  ? "Rejeição sem movimento de estoque."
                  : data.kind === "shortage"
                    ? "Conferência de falta sem desconto de estoque."
                    : "Consumo confirmado com movimentos vinculados ao relato."}
              </p>
            </section>
          ) : null}
          {data.movements.length ? (
            <section>
              <h3 className="font-semibold">{data.workflow_mode === "direct" ? "Movimentos do consumo" : "Movimentos desta confirmação"}</h3>
              <ul className="space-y-3">
                {data.movements.map((movement) => (
                  <li className="wrap-break-word text-sm" key={movement.id}>
                    {data.current_lines.find(
                      (line) => line.productId === movement.productId,
                    )?.name ?? "Nome não preservado"}{" "}
                    ·{" "}
                    {formatQuantity(
                      movement.quantity,
                      data.current_lines.find(
                        (line) => line.productId === movement.productId,
                      )?.unit,
                    )}{" "}
                    · {movement.source ? "saída de " : "entrada em "}
                    {consumptionLocationLabel(movement.source ?? movement.destination)} ·{" "}
                    {formatBrazilDate(movement.createdAt)}
                    <details className="mt-2">
                      <summary>Referência do movimento</summary>
                      <p className="text-xs break-all">{movement.id}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {legacy ? <section
            className="hca-form-stack"
            aria-label="Meus preenchimentos privados do relato"
          >
            <h3>Meus preenchimentos privados</h3>
            <p>
              Consulte, continue ou reconheça o seu resultado preservado. Abrir
              esta consulta não registra complemento ou decisão.
            </p>
            <div className="hca-toolbar">
              <ActionButton onClick={(e) => setEditor(e.currentTarget)}>
                Meu complemento preservado
              </ActionButton>
              <ActionButton
                onClick={() => setDecision({ report: data, accept: true })}
              >
                Minha conferência preservada
              </ActionButton>
              <ActionButton
                onClick={() => setDecision({ report: data, accept: false })}
              >
                Minha rejeição preservada
              </ActionButton>
            </div>
          </section> : null}
          </DocumentPanel>
          <DocumentPanel value="progress">
            <DocumentProgress id={id} type={progressType} patientId={context.patient!.id} context={context}
              code={recordLabel} readOnly={context.patient?.is_active === false} />
          </DocumentPanel>
          </DocumentTabs>
          {teamAction && mayWriteTeam ? <TeamConsumptionAction context={context} kind={teamAction.kind} report={teamAction.report}
            products={products} opener={teamAction.opener} onClose={() => setTeamAction(null)} onSaved={recordId => {
              setTeamAction(null);
              onChange();
              if (recordId !== id) onOpenRecord(recordId);
              else { setReading(true); setAttempt(value => value + 1); }
            }} /> : null}
          {editor ? (
            <ConsumptionEditor
              context={context}
              report={data}
              products={products}
              catalogError={catalogError}
              catalogLoading={catalogLoading}
              onCatalogRetry={onCatalogRetry}
              restoreFocusTo={editor}
              onClose={() => setEditor(null)}
              onSaved={(_, result) => {
                if (result) saved(result, "supplement");
              }}
            />
          ) : null}
          {decision ? (
            <ConsumptionDecision
              context={context}
              products={products}
              report={decision.report}
              accept={decision.accept}
              onClose={() => setDecision(null)}
              onSaved={(result) => saved(result, "decision")}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
