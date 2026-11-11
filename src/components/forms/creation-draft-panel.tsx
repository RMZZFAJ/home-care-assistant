"use client";
import { BalancePreviousObservations } from "@/components/balances/observation-continuity";
import { ScheduleResourceSummary } from "@/components/schedules/schedule-resource-summary";
import {
  scheduleResourceOutcomeLabel,
  isScheduleResourcePurpose,
  scheduleResourceLabels,
} from "@/lib/schedules/resource-preparations";
import { SchedulePreparationSummary } from "@/components/schedules/schedule-preparation-summary";
import { ProgressPreparationSummary } from "@/components/documents/progress-preparation-summary";
import { FlowPreparationSummary } from "@/components/stock/flow-preparation-summary";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";

import Link from "next/link";
import { useState, type RefObject } from "react";

import { Notice } from "@/components/workspace";
import { RecordDrawer } from "./record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";
import type { DraftPurpose } from "@/lib/validation/supply-drafts";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { CreationDraftController } from "./use-creation-draft";
import {
  navigationLabel,
  type DraftNavigation,
} from "@/lib/forms/draft-navigation";
import {
  isBalancePreparationPurpose,
  balancePreparationTitles,
} from "@/lib/forms/balance-preparation-purposes";

export function DraftContentSummary({
  content,
  kind,
  navigation,
  purpose,
}: {
  content: CreationDraftContent | null;
  kind?: string | null;
  navigation?: DraftNavigation | null;
  purpose?: DraftPurpose;
}) {
  if (!content) return null;
  if ("scheduleAction" in content)
    return <ScheduleResourceSummary content={content} />;
  if ("schedule" in content)
    return <SchedulePreparationSummary content={content} />;
  if ("note" in content)
    return <ProgressPreparationSummary content={content} />;
  if ("review" in content) return <FlowPreparationSummary content={content} />;
  if ("consumption" in content)
    return (
      <div className="hca-form-stack">
        <p>
          Preenchimento privado de relato ou conferência. Salvar não registra
          relato, decisão ou desconto de estoque.
        </p>
        <DefinitionGrid
          items={[
            {
              label: "Tipo",
              value:
                content.consumption.kind === "shortage"
                  ? "Falta de material"
                  : content.consumption.kind === "consumption"
                    ? "Consumo extraordinário"
                    : "Não preenchido",
            },
            {
              label: "Custódia",
              value:
                content.consumption.location === "FAMILY"
                  ? "Família"
                  : "Equipe",
            },
            {
              label: "Versão preservada",
              value: content.reference?.report?.version ?? "Novo relato",
            },
            {
              label: "Texto preservado",
              value: (
                <span className="whitespace-pre-wrap">
                  {content.consumption.text || "Não preenchido"}
                </span>
              ),
              wide: true,
            },
            {
              label: "Motivo da decisão",
              value: (
                <span className="whitespace-pre-wrap">
                  {content.consumption.reason || "Sem motivo novo"}
                </span>
              ),
              wide: true,
            },
            {
              label: "Origem do lembrete",
              value: content.consumption.reminderId || "Sem lembrete de origem",
              wide: true,
            },
          ]}
        />
        <ul>
          {content.consumption.lines.map((l) => (
            <li className="wrap-anywhere" key={l.productId}>
              {l.name} · {l.quantity || "Quantidade não preenchida"} {l.unit}
            </li>
          ))}
        </ul>
        {content.reference?.report ? (
          <section>
            <h4>Estrutura preservada do relato</h4>
            <p className="whitespace-pre-wrap">
              {content.reference.report.body}
            </p>
            <ul>
              {content.reference.report.lines.map((l) => (
                <li className="wrap-anywhere" key={l.productId}>
                  {l.name ?? l.productId} · {l.quantity} {l.unit}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );

  if ("movement" in content)
    return (
      <div className="hca-form-stack">
        <p>
          Preenchimento privado de movimentação familiar. Salvar não altera
          saldo nem registra movimento.
        </p>
        <DraftFieldsSummary content={content} kind={kind} purpose={purpose} />
      </div>
    );
  if ("values" in content)
    return (
      <div className="hca-form-stack">
        <p>
          Preenchimento de programação ou plantão. Não representa contagem
          física nem emissão de ficha.
        </p>
        <DraftFieldsSummary content={content} kind={kind} purpose={purpose} />
      </div>
    );
  const version =
    "context" in content
      ? content.context.documentVersion
      : "documentVersion" in content
        ? content.documentVersion
        : null;
  const reference =
    "counts" in content ? content.context.referenceRevision : null;
  return (
    <div className="hca-form-stack">
      <DefinitionGrid aria-label="Referências do preenchimento preservado" items={[
        { label: "Etapa do preenchimento", value: navigationLabel(navigation) },
        { label: "Versão base da ficha", value: version ?? "Sem ficha oficial como base" },
        ...(kind === "BAL" ? [{ label: "Referência de estoque preservada", value: reference ?? "Não preservada neste rascunho" }] : []),
        { label: "Política base preservada", value: "Não preservada neste rascunho; as regras vigentes serão conferidas na confirmação.", wide: true },
      ]} />
      <DraftFieldsSummary content={content} kind={kind} purpose={purpose} />
    </div>
  );
}

function DraftFieldsSummary({
  content,
  kind,
  purpose,
}: {
  content: CreationDraftContent | null;
  kind?: string | null;
  purpose?: DraftPurpose;
}) {
  if (!content) return null;
  if ("scheduleAction" in content)
    return <ScheduleResourceSummary content={content} />;
  if ("schedule" in content)
    return <SchedulePreparationSummary content={content} />;
  if ("note" in content)
    return <ProgressPreparationSummary content={content} />;
  if ("review" in content) return <FlowPreparationSummary content={content} />;
  if ("consumption" in content)
    return (
      <DraftContentSummary content={content} kind={kind} purpose={purpose} />
    );
  if ("movement" in content) {
    const m = content.movement;
    const labels = {
      inbound: "Entrada avulsa",
      outbound: "Retirada",
      correction_in: "Correção compensatória de entrada",
      correction_out: "Correção compensatória de saída",
    };
    return (
      <DefinitionGrid
        items={[
          {
            label: "Operação preservada",
            value: m.action ? labels[m.action] : "Não escolhida",
          },
          {
            label: "Material preservado",
            value: m.productLabel || m.productId || "Não escolhido",
          },
          {
            label: "Quantidade preservada",
            value: (
              <>
                {m.quantity || "Não preenchida"} {m.unit}
              </>
            ),
          },
          {
            label: "Saldo consultado na preparação",
            value:
              m.observedBalance != null && m.observedBalance !== "" ? (
                <>
                  {m.observedBalance} {m.unit}
                </>
              ) : (
                "Não disponível neste preenchimento"
              ),
          },
          {
            label: "Movimento original",
            value: m.referenceLabel || m.referenceId || "Sem compensação",
            wide: true,
          },
          {
            label: "Seu motivo",
            value: m.reason || "Não preenchido",
            wide: true,
          },
          {
            label: "Referência de estoque",
            value: content.referenceHash
              ? "Preservada; confira a situação atual antes de confirmar."
              : "Ainda não preservada.",
            wide: true,
          },
        ]}
      />
    );
  }
  if ("values" in content) {
    const labels: Record<string, string> = {
      reason: "Sua justificativa",
      enabled: "Processamento automático",
      weekday: "Dia do balanço",
      shiftTypeLabel: "Tipo de plantão preservado",
      professionalLabel: "Pessoa preservada",
      timezone: "Fuso do paciente",
      startsOn: "Vigente a partir de",
      targetShiftLabel: "Plantão de destino preservado",
      targetShiftQuery: "Busca preservada",
    };
    return (
      <dl className="hca-definition-grid">
        {Object.entries(content.values)
          .filter(([key]) => key in labels)
          .map(([key, value]) => (
            <div key={key}>
              <dt>{labels[key]}</dt>
              <dd className="whitespace-pre-wrap wrap-anywhere">
                {key === "enabled"
                  ? value === "true"
                    ? "Ativado"
                    : value === "false"
                      ? "Pausado"
                      : "Não escolhido"
                  : key === "weekday" && /^[0-6]$/.test(value ?? "")
                    ? ([
                        "Domingo",
                        "Segunda-feira",
                        "Terça-feira",
                        "Quarta-feira",
                        "Quinta-feira",
                        "Sexta-feira",
                        "Sábado",
                      ][Number(value)] ?? "Não escolhido")
                    : value || "Não preenchido"}
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  if ("lines" in content)
    return (
      <div className="hca-form-stack">
        {[
          ...content.lines.map((line) => ({
            ...line,
            name: line.productName,
            key: "line:" + line.productId,
          })),
          ...content.extraItems.map((line) => ({
            ...line,
            key: "extra:" + line.id,
          })),
        ].map((line) => (
          <article className="hca-record min-w-0" key={line.key}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{line.name || "Item extra sem nome"}</strong>
              <p>
                {line.stockObservation === "unknown"
                  ? "Estoque desconhecido"
                  : line.stockObservation === "unfilled" ||
                      line.currentStock === null
                    ? "Estoque não informado"
                    : `Estoque observado: ${line.currentStock}`}
              </p>
              <small>
                Observação:{" "}
                {line.stockObservationAt
                  ? formatZonedDate(
                      line.stockObservationAt,
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
              {"repeatReason" in line && line.repeatReason ? (
                <p>{line.repeatReason}</p>
              ) : null}
            </div>
          </article>
        ))}
        {content.observations.length ? (
          <p className="wrap-anywhere whitespace-pre-line">
            {content.observations
              .map((value) => value || "Observação incompleta")
              .join("\n")}
          </p>
        ) : null}
        {content.remainingNeed ? (
          <p className="wrap-anywhere">
            Necessidade remanescente:{" "}
            {content.remainingNeed.reason || "Motivo incompleto"}
          </p>
        ) : null}
        {!content.lines.length && !content.extraItems.length ? (
          <p>Nenhum material selecionado.</p>
        ) : null}
      </div>
    );
  if ("form" in content)
    return (
      <div className="hca-form-stack">
        <p>
          {content.context.documentId
            ? "Revisão de ficha existente"
            : "Criação de nova ficha"}
          {content.context.documentVersion
            ? ` · versão ${content.context.documentVersion}`
            : ""}
        </p>
        <DefinitionGrid items={kind === "COM" ? [
          { label: "Origem da aquisição", value: content.form.origin === "donation" ? "Doação" : content.form.origin === "purchase" ? "Compra" : "Não escolhida" },
        ] : [
          { label: "Custódia de origem da entrega", value: content.form.source === "FAMILY" ? "Família" : "Equipe" },
          { label: "Pessoa recebedora", value: content.context.recipientName || "Não escolhida ou indisponível no diretório atual" },
        ]} />
        {content.materials
          .filter((m) => Object.hasOwn(content.form.quantities, m.id))
          .map((m) => (
            <article className="hca-record min-w-0" key={m.id}>
              <div className="hca-record-main min-w-0 wrap-anywhere">
                <strong>{m.name}</strong>
                <p>
                  Quantidade:{" "}
                  {content.form.quantities[m.id] || "Não preenchida"} {m.unit}
                </p>
                {content.form.presentationSelections?.[m.id]?.map((p) => (
                  <p key={p.id}>
                    {p.packages || "Não preenchido"} embalagem(ns) · {p.name} ·{" "}
                    {p.baseQuantity} {p.unit} por embalagem · versão {p.version}
                  </p>
                ))}
                {content.form.sharedNeedReasons?.[m.id] ? (
                  <p>{content.form.sharedNeedReasons[m.id]}</p>
                ) : null}
                <p>
                  {content.links[m.id]?.length ?? 0} vínculo(s) de necessidade;
                  revalidados na confirmação.
                </p>
              </div>
            </article>
          ))}
        {content.form.notes ? (
          <p className="whitespace-pre-wrap wrap-anywhere">
            {content.form.notes}
          </p>
        ) : null}
        {content.form.recipientReason ? (
          <p className="whitespace-pre-wrap wrap-anywhere">
            Justificativa da pessoa recebedora: {content.form.recipientReason}
          </p>
        ) : null}
      </div>
    );
  if ("fields" in content && content.documentVersion === null)
    return (
      <div className="hca-form-stack">
        <p>
          Declaração privada em preparação, sem ficha oficial como base. Salvar
          não registra declaração, concordância, expedição ou recebimento.
        </p>
        <DefinitionGrid items={[
          { label: "Sentido da transferência", value: content.fields.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família" },
          { label: "Contraparte preservada", value: content.fields.counterpartyLabel || "Não escolhida ou indisponível" },
          { label: "Recebedor físico preservado", value: content.fields.recipientLabel || "Não escolhido ou indisponível" },
          { label: "Origem documental preservada", value: content.fields.originLabel || "Sem vínculo informado" },
        ]} />
        {content.materials.map((material) => (
          <p className="whitespace-pre-wrap wrap-anywhere" key={material.id}>
            {material.name} · quantidade no preenchimento:{" "}
            {content.fields[material.id + ":transferQuantity"] ||
              "Não informada"}{" "}
            {material.unit}
          </p>
        ))}
        {content.fields.reason ? (
          <p className="whitespace-pre-wrap wrap-anywhere">
            Sua justificativa: {content.fields.reason}
          </p>
        ) : null}
        {content.fields.query ? (
          <p className="whitespace-pre-wrap wrap-anywhere">
            Busca preservada: {content.fields.query}
          </p>
        ) : null}
      </div>
    );
  if ("fields" in content && kind === "REQ")
    return (
      <dl className="hca-definition-grid">
        <div>
          <dt>Justificativa própria</dt>
          <dd className="whitespace-pre-wrap wrap-anywhere">
            {content.fields.reason || "Não preenchida"}
          </dd>
        </div>
        {purpose === "resolve_extra" ? (
          <>
            <div>
              <dt>Item extra preservado</dt>
              <dd>{content.fields.itemLabel || "Não escolhido"}</dd>
            </div>
            <div>
              <dt>Produto correspondente preservado</dt>
              <dd>
                {content.fields.productLabel || "Não escolhido"}
                {content.fields.productUnit
                  ? ` · ${content.fields.productUnit}`
                  : ""}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    );
  if ("fields" in content) {
    const name = (key: string) =>
      content.materials.find((m) => m.id === key)?.name ??
      "Linha não disponível na referência atual";
    const entDecision =
      kind === "ENT" && purpose !== "receive" && purpose !== "divergence";
    const operation = kind === "COM" || kind === "BAL" || entDecision;
    const quantityLabel =
      kind === "COM"
        ? purpose === "approve"
          ? "quantidade em aprovação"
          : purpose === "purchase"
            ? "quantidade em aquisição"
            : "quantidade informada"
        : entDecision
          ? "quantidade em conciliação"
          : "recebido";
    const labels: Record<string, string> = {
      comment: "Seu parecer",
      targetShiftId: "Plantão escolhido",
      targetLabel: "Pessoa e período preservados",
      query: "Texto da busca de plantão",
      transferState: "Estado da transferência na referência",
      transferSource: "Custódia de origem",
      transferDestination: "Custódia de destino",
      transferInitiator: "Declarante",
      transferCounterparty: "Contraparte",
      transferRecipient: "Recebedor físico",
      reason: operation ? "Motivo / justificativa" : "Observação",
      receiptId: "Parcela no preenchimento",
      confirmed: "Conferência do resumo",
      recipientId: "Novo destinatário no preenchimento",
      lineId: "Material em conciliação",
      quantity: "Quantidade em conciliação",
      resolution: "Solução em preparação",
      requestId: "Pedido no preenchimento",
      caseId: "Proposta de regularização",
      basis: "Evidências e limites",
      reviewerId: "Conferente independente",
      followUpOwnerId: "Responsável pela apuração futura",
    };
    const display = (key: string, value: string) => {
      if (key === "receiptId")
        return (
          content.fields.receiptLabel ||
          "Referência da parcela preservada; confira a declaração ao continuar."
        );
      if (key === "recipientId")
        return (
          content.fields.recipientLabel ||
          "Pessoa preservada; confira sua disponibilidade ao continuar."
        );
      if (key === "lineId")
        return (
          content.fields.lineLabel ||
          "Material preservado; confira a linha vigente ao continuar."
        );
      if (key === "requestId")
        return (
          content.fields.requestLabel ||
          "Pedido preservado; confira sua identidade ao continuar."
        );
      if (key === "caseId")
        return content.fields.caseLabel || "Sem proposta anterior";
      if (key === "reviewerId")
        return content.fields.reviewerLabel || "Não escolhido ou indisponível";
      if (key === "followUpOwnerId")
        return (
          content.fields.followUpOwnerLabel || "Não escolhido ou indisponível"
        );
      if (key === "confirmed")
        return value === "on"
          ? "Marcada no preenchimento; a conclusão exige confirmação própria."
          : "Não marcada";
      return (
        (
          {
            FAMILY: "Família",
            CARE_TEAM: "Equipe",
            pending: "Aguardando contraparte",
            agreed: "Concordância registrada, sem expedição",
            declined: "Transferência recusada",
            withdrawn: "Declaração encerrada",
            dispatched: "Expedição registrada",
            shortage: "Quantidade menor",
            damaged: "Material avariado",
            wrong: "Produto divergente",
            other: "Outra diferença",
            received: "Recebimento complementar confirmado por mim",
            returned: "Material voltou à custódia de origem",
            missing: "Falta / perda conciliada",
          } as Record<string, string>
        )[value] ??
        (value || "Não preenchido")
      );
    };
    return (
      <div className="hca-form-stack">
        <p>
          {operation
            ? `Preenchimento da operação ${kind} · versão de referência ${content.documentVersion}. Salvar não confirma decisões, recebimento ou movimentação de estoque.`
            : `Conferência pessoal · versão consultada ${content.documentVersion}. Salvar não aceita material.`}
        </p>
        {content.divergentIds.length ? (
          <ul>
            {content.divergentIds.map((id) => (
              <li key={id}>{name(id)} · divergência em preparação</li>
            ))}
          </ul>
        ) : !operation ? (
          <p>Nenhuma linha divergente selecionada.</p>
        ) : null}
        <dl className="hca-definition-grid">
          {Object.entries(content.fields)
            .filter(
              ([key]) =>
                ![
                  "targetShiftVersion",
                  "targetShiftId",
                  "receiptLabel",
                  "recipientLabel",
                  "lineLabel",
                  "requestLabel",
                  "referenceHash",
                  "caseLabel",
                  "reviewerLabel",
                  "followUpOwnerLabel",
                ].includes(key),
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt>
                  {labels[key] ??
                    (key.endsWith(":receivedQuantity")
                      ? name(key.slice(0, -17)) +
                        " · recebimento físico apurado"
                      : key.endsWith(":returnedQuantity")
                        ? name(key.slice(0, -17)) +
                          " · devolução física apurada"
                        : key.endsWith(":missingQuantity")
                          ? name(key.slice(0, -16)) + " · falta apurada"
                          : key.endsWith(":return")
                            ? name(key.slice(0, -7)) +
                              " · devolução física em preparação"
                            : key.endsWith(":problem")
                              ? name(key.slice(0, -8)) + " · diferença"
                              : name(key) + " · " + quantityLabel)}
                </dt>
                <dd className="whitespace-pre-wrap wrap-anywhere">
                  {display(key, value)}
                </dd>
              </div>
            ))}
        </dl>
      </div>
    );
  }
  return (
    <div className="hca-form-stack">
      <p>
        {content.context.mode === "scheduled"
          ? "Contagem vinculada a plantão"
          : "Contagem sem regime de plantões"}
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <article className="hca-record min-w-0" key={material.id}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{material.name}</strong>
              <p>
                Contagem: {content.counts[material.id] || "Não informada"}{" "}
                {material.unit}
              </p>
              <small>
                Observação:{" "}
                {content.observationTimes[material.id]
                  ? formatZonedDate(
                      content.observationTimes[material.id],
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
            </div>
          </article>
        ))}
      {content.notes ? <p className="wrap-anywhere">{content.notes}</p> : null}
      <BalancePreviousObservations content={content} />
    </div>
  );
}

export function CreationDraftPanel({
  draft,
  current,
  patientName,
  resumeHref,
  resumeLabel = "Continuar rascunho",
  discardLabel = "Descartar e começar nova",
  acknowledgeLabel = "Confirmar resultado e começar novo preenchimento",
  onRevalidateRead,
  revalidationRef,
  disabled = false,
  canResume = true,
  hasUnsavedChanges,
}: {
  draft: CreationDraftController;
  current: CreationDraftContent | null;
  patientName: string;
  resumeHref?: string;
  resumeLabel?: string;
  discardLabel?: string;
  acknowledgeLabel?: string;
  onRevalidateRead?: () => void;
  revalidationRef?: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  canResume?: boolean;
  hasUnsavedChanges?: boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  if (!draft.active) return null;
  const saved = draft.offered ?? draft.base;
  if (draft.readDenied || draft.protectedReadPending)
    return (
      <section className="ui-card hca-form-stack" aria-label="Rascunho privado">
        <Notice error>
          {draft.loadError ||
            "Revalide o acesso antes de exibir o preenchimento preservado. A tentativa original continua guardada."}
        </Notice>
        <ActionButton
          ref={revalidationRef}
          disabled={draft.busy}
          onClick={onRevalidateRead ?? draft.reload}
        >
          Revalidar acesso ao rascunho
        </ActionButton>
        {draft.pending ? (
          <ActionButton
            disabled={draft.busy}
            onClick={() => void draft.recover()}
          >
            Recuperar mesma tentativa preservada
          </ActionButton>
        ) : null}
      </section>
    );
  return (
    <section
      className="ui-card hca-form-stack hca-draft-panel min-w-0"
      aria-label="Rascunho privado"
    >
      <h2 className="text-lg font-semibold">
        Seu rascunho privado · {patientName}
      </h2>
      <p>
        {draft.consumed
          ? "O resultado oficial deste preenchimento já está disponível."
          : "Salvar este preenchimento não gera protocolo, ciência ou movimentação de estoque."}
      </p>
      {!draft.consumed && !draft.pending ? (
        <p className="hca-field-hint">
          Para retomar em outra aba, sessão ou aparelho, use{" "}
          {draft.kind === "SCHEDULE" && isScheduleResourcePurpose(draft.purpose)
            ? "Guardar preenchimento privado"
            : draft.kind === "PROGRESS" ||
                draft.kind === "SCHEDULE" ||
                draft.kind === "CONSUMPTION" ||
                draft.kind === "FLOW"
              ? "Salvar preenchimento privado"
              : "Salvar rascunho"}
          . O preenchimento ainda não salvo pode ficar apenas nesta aba.
        </p>
      ) : null}
      {draft.loading ? (
        <Notice>Consultando seu rascunho no servidor…</Notice>
      ) : null}
      {draft.loadError ? (
        <Notice error>
          {draft.loadError}
          <ActionButton onClick={draft.reload} disabled={draft.busy}>
            Consultar novamente
          </ActionButton>
        </Notice>
      ) : null}
      {draft.error ? <Notice error>{draft.error}</Notice> : null}
      {draft.message ? <Notice>{draft.message}</Notice> : null}
      {saved ? (
        <p>
          {saved.kind === "SCHEDULE"
            ? typeof saved.purpose === "string" &&
              isScheduleResourcePurpose(saved.purpose)
              ? scheduleResourceLabels[saved.purpose]
              : saved.purpose === "shift_type_create"
                ? "Tipo de plantão"
                : "Programação de plantões"
            : saved.kind === "PROGRESS"
              ? "Registro de andamento"
              : saved.kind === "FLOW"
                ? "Revisão do Flow"
                : saved.kind === "CONSUMPTION"
                  ? "Relato e conferência"
                  : saved.kind === "STOCK"
                    ? "Movimentação familiar"
                    : saved.kind}{" "}
          · Revisão {saved.revision} · salvo no servidor em{" "}
          {formatZonedDate(saved.savedAt, "America/Sao_Paulo")} ·
          America/Sao_Paulo
        </p>
      ) : null}
      {draft.pending ? (
        <>
          <Notice>
            A resposta desta tentativa ainda não foi confirmada. Recupere o
            mesmo comando antes de editar ou descartar.
          </Notice>
          {draft.pending.content ? (
            <DraftContentSummary
              content={draft.pending.content}
              kind={draft.kind}
              purpose={draft.purpose}
              navigation={draft.pending.navigation}
            />
          ) : null}
          <ActionButton
            variant="primary"
            disabled={draft.busy || disabled}
            onClick={() => void draft.recover()}
          >
            {(draft.kind === "PROGRESS" || draft.kind === "SCHEDULE") &&
            draft.pending.action === "acknowledge"
              ? "Recuperar reconhecimento do resultado"
              : "Recuperar salvamento ou descarte"}
          </ActionButton>
        </>
      ) : null}
      {draft.consumed ? (
        <>
          <Notice>
            {draft.kind === "PROGRESS"
              ? "Este preenchimento publicou um andamento. O registro e sua autoria permanecem no histórico."
              : draft.kind === "CONSUMPTION"
                ? "Este preenchimento já registrou seu resultado. O resumo preservado descreve aquele instante; consulte o relato para a situação atual."
                : draft.kind === "STOCK"
                  ? "Este preenchimento já registrou uma movimentação. O resultado preservado descreve aquele instante; consulte o histórico para a situação atual."
                  : isBalancePreparationPurpose(draft.purpose)
                    ? "Este preenchimento já registrou uma decisão. O resultado preservado descreve aquele instante; consulte o acompanhamento para a situação atual."
                    : "Este rascunho já foi usado em uma ficha. Consulte o resultado antes de iniciar outro preenchimento."}
          </Notice>
          {draft.kind === "CONSUMPTION" &&
          draft.consumed.consumedResult &&
          "preparedConsumption" in draft.consumed.consumedResult ? (
            <div className="hca-form-stack">
              <p>
                Registrado em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <DraftContentSummary
                kind="CONSUMPTION"
                purpose={draft.purpose}
                content={{
                  consumption:
                    draft.consumed.consumedResult.preparedConsumption,
                  reference: draft.consumed.consumedResult.preparedReference,
                  referenceHash: draft.consumed.consumedResult.referenceHash,
                }}
              />
              <Link
                className="ui-button"
                href={
                  "/consumo?" +
                  new URLSearchParams({
                    careRecipientId: draft.consumed.patientId,
                    ref: draft.consumed.consumedResult.resourceId,
                    refKind: "report",
                  })
                }
              >
                Consultar relato registrado
              </Link>
            </div>
          ) : draft.kind === "STOCK" &&
            draft.consumed.consumedResult &&
            "preparedMovement" in draft.consumed.consumedResult ? (
            <div className="wrap-anywhere">
              <p>
                Movimentação registrada em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <p>Referência: {draft.consumed.consumedResult.resourceId}</p>
              <p className="whitespace-pre-wrap">
                {draft.consumed.consumedResult.command.reason}
              </p>
              <DraftContentSummary
                kind="STOCK"
                purpose="family_movement"
                content={{
                  movement: draft.consumed.consumedResult.preparedMovement,
                  referenceHash: draft.consumed.consumedResult.referenceHash,
                }}
              />
            </div>
          ) : draft.consumed.kind === "SCHEDULE" &&
            draft.consumed.consumedResult &&
            "fields" in draft.consumed.consumedResult ? (
            <div className="hca-form-stack">
              <p>
                Resultado da escala registrado em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <p>
                Resultado registrado:{" "}
                {scheduleResourceOutcomeLabel(
                  draft.consumed.consumedResult.nativeResult,
                )}
                .
              </p>
              {"expectedVersion" in draft.consumed.consumedResult ? (
                <ScheduleResourceSummary
                  content={{
                    scheduleAction: draft.consumed.consumedResult.fields,
                    referenceHash: draft.consumed.consumedResult.referenceHash,
                    referenceVersion:
                      draft.consumed.consumedResult.expectedVersion,
                  }}
                />
              ) : (
                <SchedulePreparationSummary
                  content={{ schedule: draft.consumed.consumedResult.fields }}
                />
              )}
              <p>
                Reconhecer limpa somente a preparação privada. A operação
                confirmada permanece no histórico.
              </p>
            </div>
          ) : draft.consumed.kind === "PROGRESS" &&
            draft.consumed.consumedResult &&
            "documentType" in draft.consumed.consumedResult ? (
            <div className="hca-form-stack">
              <p>
                Andamento publicado por{" "}
                {draft.consumed.consumedResult.nativeResult.note.authorName} em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <ProgressPreparationSummary
                content={{
                  documentType: draft.consumed.consumedResult.documentType,
                  note: draft.consumed.consumedResult.command.content,
                }}
              />
              <p>
                Reconhecer este resultado limpa somente a preparação pessoal. O
                andamento publicado permanece no histórico.
              </p>
            </div>
          ) : draft.consumed.kind === "FLOW" &&
            draft.consumed.consumedResult &&
            "preparedReview" in draft.consumed.consumedResult ? (
            <div className="hca-form-stack">
              <p>
                Revisão do Flow registrada em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <p>
                {draft.consumed.consumedResult.nativeResult.status ===
                "confirmed"
                  ? "Relato encaminhado à conferência autorizada. O estoque não foi descontado por esta revisão."
                  : "Sugestão descartada pelo próprio autor. Nenhum relato ou desconto foi criado."}
              </p>
              <FlowPreparationSummary
                content={{
                  review: draft.consumed.consumedResult.preparedReview,
                  reference: draft.consumed.consumedResult.preparedReference,
                  referenceHash: draft.consumed.consumedResult.referenceHash,
                }}
              />
              {draft.consumed.consumedResult.nativeResult.reportId ? (
                <Link
                  className="ui-button"
                  prefetch={false}
                  href={
                    "/consumo?careRecipientId=" +
                    draft.consumed.patientId +
                    "&ref=" +
                    draft.consumed.consumedResult.nativeResult.reportId +
                    "&refKind=report"
                  }
                >
                  Abrir relato resultante
                </Link>
              ) : null}
            </div>
          ) : isBalancePreparationPurpose(draft.purpose) &&
            draft.consumed.consumedResult &&
            "nativeResult" in draft.consumed.consumedResult &&
            "body" in draft.consumed.consumedResult.command ? (
            <div>
              <p>
                {balancePreparationTitles[draft.purpose]} · registrada em{" "}
                {formatZonedDate(
                  draft.consumed.consumedResult.recordedAt,
                  "America/Sao_Paulo",
                )}
                .
              </p>
              <p className="whitespace-pre-wrap wrap-anywhere">
                {"reason" in draft.consumed.consumedResult.command.body
                  ? draft.consumed.consumedResult.command.body.reason
                  : null}
              </p>
            </div>
          ) : (
            <Link
              className="ui-button ui-button-primary"
              prefetch={false}
              href={
                (draft.consumed.kind === "REQ"
                  ? "/historico/"
                  : "/documentos/") + draft.consumed.consumedDocumentId
              }
            >
              Abrir ficha concluída
            </Link>
          )}
          <ActionButton
            disabled={draft.busy || !!draft.pending || disabled}
            onClick={() => void draft.acknowledge()}
          >
            {acknowledgeLabel}
          </ActionButton>
        </>
      ) : null}
      {draft.offered?.state === "active" && !draft.pending ? (
        <>
          <DraftContentSummary
            content={draft.offered.content}
            kind={draft.kind}
            purpose={draft.purpose}
            navigation={draft.offered.navigation}
          />
          <div className="hca-toolbar">
            {resumeHref ? (
              <Link
                className="ui-button ui-button-primary"
                href={resumeHref}
                prefetch={false}
              >
                {resumeLabel}
              </Link>
            ) : (
              <ActionButton
                variant="primary"
                disabled={draft.busy || disabled || !canResume}
                onClick={() => draft.resume()}
              >
                {resumeLabel}
              </ActionButton>
            )}
          </div>
        </>
      ) : null}
      {draft.conflict && !draft.consumed ? (
        <>
          <Notice>
            Sua edição foi preservada. Compare os valores salvos antes de
            escolher como continuar.
          </Notice>
          <div className="hca-draft-comparison">
            <section className="min-w-0" aria-label="Minha edição">
              <h3>Minha edição</h3>
              <DraftContentSummary
                content={current}
                kind={draft.kind}
                purpose={draft.purpose}
                navigation={draft.navigation}
              />
            </section>
            <section className="min-w-0" aria-label="Versão salva no servidor">
              <h3>Versão salva no servidor</h3>
              {draft.compared ? (
                draft.comparison ? (
                  <>
                    <p>
                      Revisão {draft.comparison.revision} ·{" "}
                      {formatZonedDate(
                        draft.comparison.savedAt,
                        "America/Sao_Paulo",
                      )}
                    </p>
                    <DraftContentSummary
                      content={draft.comparison.content}
                      kind={draft.kind}
                      purpose={draft.purpose}
                      navigation={draft.comparison.navigation}
                    />
                  </>
                ) : (
                  <p>
                    Não há um preenchimento ativo no servidor. Compare sua
                    edição antes de iniciar outro.
                  </p>
                )
              ) : (
                <ActionButton
                  disabled={draft.busy}
                  onClick={() => void draft.compare()}
                >
                  Consultar versão para comparar
                </ActionButton>
              )}
            </section>
          </div>
          <div className="hca-toolbar">
            <ActionButton
              disabled={!draft.compared || draft.busy || disabled}
              onClick={draft.keepLocal}
            >
              Manter minha edição para salvar nova revisão
            </ActionButton>
            {draft.comparison?.state === "active" ? (
              <ActionButton
                disabled={draft.busy || disabled || !canResume}
                onClick={() => draft.resume(draft.comparison)}
              >
                Usar versão salva no servidor
              </ActionButton>
            ) : null}
          </div>
        </>
      ) : null}
      {current &&
      draft.base?.state === "active" &&
      !draft.blocked &&
      (hasUnsavedChanges ??
        JSON.stringify(current) !== JSON.stringify(draft.base.content)) ? (
        <p>Sua edição atual ainda não foi salva no servidor.</p>
      ) : null}
      {saved?.state === "active" && !draft.pending && !draft.conflict ? (
        <ActionButton
          disabled={draft.busy || disabled}
          onClick={(event) => {
            setTrigger(event.currentTarget);
            setConfirmDiscard(true);
          }}
        >
          {discardLabel}
        </ActionButton>
      ) : null}
      {confirmDiscard ? (
        <RecordDrawer
          title="Descartar rascunho privado"
          busy={draft.busy}
          preventClose={!!draft.pending}
          trackChanges={false}
          restoreFocusTo={trigger}
          onClose={() => setConfirmDiscard(false)}
        >
          <div className="hca-form-stack">
            {draft.error ? <Notice error>{draft.error}</Notice> : null}
            {draft.pending ? (
              <Notice>
                A resposta do descarte ainda não foi confirmada.
                <ActionButton
                  disabled={draft.busy || disabled}
                  onClick={async () => {
                    if (await draft.recover()) setConfirmDiscard(false);
                  }}
                >
                  Recuperar descarte
                </ActionButton>
              </Notice>
            ) : null}
            <p>
              Você está descartando somente seu preenchimento privado de{" "}
              {saved?.kind === "PROGRESS"
                ? "andamento"
                : saved?.kind === "SCHEDULE"
                  ? draft.purpose === "shift_type_create"
                    ? "tipo de plantão"
                    : "programação"
                  : saved?.kind}{" "}
              para {patientName}.
            </p>
            <DraftContentSummary
              content={saved?.content ?? null}
              kind={draft.kind}
              purpose={draft.purpose}
              navigation={saved?.navigation}
            />
            <Notice>
              Fichas emitidas, arquivos oficiais e seu histórico serão
              preservados.
            </Notice>
            <ActionButton
              variant="primary"
              disabled={disabled || !!draft.pending}
              onClick={async () => {
                if (await draft.discard()) setConfirmDiscard(false);
              }}
            >
              Confirmar descarte do rascunho
            </ActionButton>
            <ActionButton
              disabled={draft.busy || !!draft.pending}
              onClick={() => setConfirmDiscard(false)}
            >
              Continuar preenchimento
            </ActionButton>
          </div>
        </RecordDrawer>
      ) : null}
    </section>
  );
}

export function BalanceObservationTimes({
  content,
}: {
  content: BalanceDraftContent;
}) {
  return (
    <section
      className="hca-form-stack"
      aria-label="Datas das observações recuperadas"
    >
      <h3>Quando as quantidades foram observadas</h3>
      <p>
        Retomar um preenchimento conserva a data declarada; confira se os
        valores ainda correspondem à contagem física.
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <p className="wrap-anywhere" key={material.id}>
            {material.name}:{" "}
            {content.observationTimes[material.id]
              ? formatZonedDate(
                  content.observationTimes[material.id],
                  "America/Sao_Paulo",
                )
              : "Data não informada"}
          </p>
        ))}
    </section>
  );
}
