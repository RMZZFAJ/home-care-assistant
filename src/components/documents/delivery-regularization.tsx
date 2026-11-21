"use client";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton, DefinitionGrid, FormField, SelectField } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";

import { RecordDrawer } from "@/components/forms/record-drawer";
import {
  api,
  ApiError,
  can,
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { supplyCommandSchema } from "@/lib/validation/documents";

import { useDocumentDecision, DocumentDecisionFailure } from "./use-document-decision";
import type { DocumentDecisionIntention } from "@/lib/validation/document-decisions";
import { regularizationAvailable, regularizationDraftReference, regularizationDraftContent, regularizationDraftStale, adoptRegularizationDraftReference, type RegularizationMode } from "@/lib/forms/regularization-draft";
import { parseRegularizationReference } from "@/lib/validation/regularization-reference";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";

import { DraftReferenceComparison } from "./draft-reference-comparison";
import { DeliveryMaterialMenu } from "./delivery-material-menu";
import type {
  DeliveryRegularizationCase,
  DeliveryRegularizationLine,
  PatientPerson,
  SupplyDocument,
} from "@/types/documents";

const states = {
  pending: "Aguardando conferência independente",
  approved: "Encerramento administrativo aprovado",
  rejected: "Proposta rejeitada",
  withdrawn: "Proposta retirada pelo autor",
  obsolete: "Proposta obsoleta encerrada",
};
type Mode = RegularizationMode;
const titles: Record<Mode, string> = {
  propose: "Apurar entrega pendente",
  approve: "Revisar apuração",
  reject: "Revisar apuração",
  withdraw: "Encerrar proposta de regularização",
  finding: "Acompanhar material pendente",
};
type Packet = {
  action: string;
  body: unknown;
  expectedVersion: number;
  idempotencyKey: string;
  draftCommit?: { id: string; revision: number };
};
type Amounts = {
  receivedQuantity: string;
  returnedQuantity: string;
  missingQuantity: string;
};
const amounts = [
  ["receivedQuantity", "Recebimento físico apurado"],
  ["returnedQuantity", "Devolução física apurada"],
  ["missingQuantity", "Falta apurada"],
] as const;
const remaining = (line: SupplyDocument["lines"][number]) =>
  quantity(line.quantity)
    .minus(line.accepted_quantity)
    .minus(line.reconciled_quantity)
    .clamp(0, 1_000_000_000);

export function RegularizationLines({
  lines,
  proposed = false,
}: {
  lines: DeliveryRegularizationLine[];
  proposed?: boolean;
}) {
  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <article
          key={line.lineId}
          className="ui-card hca-form-stack hca-factual-material text-sm"
        >
          <h4 className="font-semibold wrap-break-word">{line.name}</h4>
          <DefinitionGrid items={[
            { label: "Expedido", value: formatQuantity(line.expeditedQuantity, line.unit) },
            { label: "Aceite pessoal preservado", value: formatQuantity(line.acceptedQuantity, line.unit) },
            { label: "Conciliação anterior", value: formatQuantity(line.priorReconciledQuantity, line.unit) },
            { label: "Em trânsito antes desta proposta", value: formatQuantity(line.pendingQuantity, line.unit) },
            ...amounts.map(([field, label]) => ({ label: (proposed ? "Proposto · " : "Apurado · ") + label, value: formatQuantity(line[field], line.unit) })),
            { label: "Situação física desconhecida", value: formatQuantity(line.unknownQuantity, line.unit) },
          ]} />
          {line.movementIds?.length ? (
            <details className="mt-2">
              <summary>Movimentos vinculados</summary>
              {line.movementIds.map((id) => (
                <p className="break-all" key={id}>
                  {id}
                </p>
              ))}
            </details>
          ) : null}
        </article>
      ))}
    </div>
  );
}
export function RegularizationCaseFacts({
  item,
}: {
  item: DeliveryRegularizationCase;
}) {
  return (
    <article
      className="space-y-3 rounded-xl border border-(--line) p-4"
      aria-label="Dossiê de regularização"
    >
      <h3 className="font-semibold">{states[item.state]}</h3>
      <p className="text-sm">
        Proposta de {item.proposal.proposedName} ·{" "}
        {formatBrazilDate(item.proposed_at)} · referência da ficha v
        {item.before_snapshot.version}
      </p>
      <p className="text-sm">
        Recebimento pessoal original:{" "}
        {item.before_snapshot.acceptedBy
          ? `${item.before_snapshot.receiptName ?? "Nome não preservado"} · ${formatBrazilDate(item.before_snapshot.acceptedAt)}`
          : "Sem declaração pessoal registrada"}
        .
      </p>
      <p className="whitespace-pre-wrap wrap-break-word">
        <strong>Motivo original:</strong> {item.proposal.reason}
      </p>
      <p className="whitespace-pre-wrap wrap-break-word">
        <strong>Base da apuração:</strong> {item.proposal.basis}
      </p>
      <p>Conferência independente designada: {item.proposal.reviewerName}.</p>
      <RegularizationLines
        lines={
          item.decision?.lines.length
            ? item.decision.lines
            : item.proposal.lines
        }
        proposed={item.state !== "approved"}
      />
      {item.decision ? (
        <div className="space-y-2">
          <p>
            Decisão própria de {item.decision.actorName} ·{" "}
            {formatBrazilDate(item.decision.recordedAt)} · ficha v
            {item.decision.version}
          </p>
          <p className="whitespace-pre-wrap wrap-break-word">
            Motivo da decisão: {item.decision.reason}
          </p>
        </div>
      ) : (
        <Notice>
          A proposta não movimentou estoque. A pessoa designada deve conferir os
          fatos e registrar sua própria decisão.
        </Notice>
      )}
      {quantity(item.proposal.unknownQuantity).gt(0) ? (
        <Notice>
          Parcela desconhecida permanece em trânsito. Responsável pela apuração
          futura: {item.proposal.followUpOwnerName ?? "Nome não preservado"}. O
          encerramento administrativo não declara recebimento pessoal.
        </Notice>
      ) : null}
      {item.findings.map((f) => (
        <div key={f.id} className="border-t border-(--line) pt-3">
          <p className="text-sm">
            Apuração própria de {f.actor_name} ·{" "}
            {formatBrazilDate(f.recorded_at)}
          </p>
          <p className="whitespace-pre-wrap wrap-break-word">{f.body}</p>
        </div>
      ))}
      <details className="text-xs">
        <summary>Referências do procedimento</summary>
        <p className="break-all">Regularização: {item.id}</p>
        <p className="break-all">Autor da proposta: {item.proposed_by}</p>
        <p className="break-all">Conferente: {item.reviewer_id}</p>
      </details>
    </article>
  );
}

function RegularizationFold({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return <details className="hca-receipt-fold">
    <summary><Icon name={icon} />{title}<Icon name="down" /></summary>
    <div className="hca-form-stack">{children}</div>
  </details>;
}

function RegularizationBalances({ line }: { line: DeliveryRegularizationLine }) {
  return <div className="hca-regularization-balances">
    {amounts.map(([key, label]) => <p key={key}><span>{label}</span><strong>{formatQuantity(line[key], line.unit)}</strong></p>)}
    <p className="hca-regularization-unknown"><span>Ainda sem localização</span><strong>{formatQuantity(line.unknownQuantity, line.unit)}</strong></p>
  </div>;
}

function RegularizationReviewFacts({ item, data, followUp, disabled }: {
  item: DeliveryRegularizationCase;
  data: SupplyDocument;
  followUp: boolean;
  disabled: boolean;
}) {
  const lines = item.decision?.lines.length ? item.decision.lines : item.proposal.lines;
  return <div className="hca-form-stack">
    {lines.filter(line => !followUp || quantity(line.unknownQuantity).gt(0)).map(line => {
      const material = data.lines.find(candidate => candidate.id === line.lineId);
      const quantityLabel = followUp
        ? formatQuantity(line.unknownQuantity, line.unit) + " em apuração"
        : formatQuantity(line.expeditedQuantity, line.unit) + " expedidos";
      return <article key={line.lineId} className="hca-receipt-line">
        <header>
          <div><h3>{line.name}</h3><p>{data.code} · {quantityLabel}</p></div>
          {material ? <DeliveryMaterialMenu data={data} line={material} disabled={disabled} /> : null}
        </header>
        {followUp ? <RegularizationFold title="Ver quantidades já apuradas" icon="history">
          <RegularizationBalances line={line} />
          <p>Responsável pela busca: {item.proposal.followUpOwnerName ?? "Nome não preservado"}.</p>
        </RegularizationFold> : <RegularizationBalances line={line} />}
      </article>;
    })}
    {!followUp ? <>
      <RegularizationFold title="Motivo e evidências" icon="note">
        <p>Proposta de {item.proposal.proposedName} · {formatBrazilDate(item.proposed_at)}</p>
        <p className="whitespace-pre-wrap wrap-break-word"><strong>Motivo:</strong> {item.proposal.reason}</p>
        <p className="whitespace-pre-wrap wrap-break-word"><strong>Como foi conferido:</strong> {item.proposal.basis}</p>
      </RegularizationFold>
      {item.proposal.followUpOwnerName ? <RegularizationFold title="Responsável pela busca" icon="user">
        <p>{item.proposal.followUpOwnerName}</p>
      </RegularizationFold> : null}
    </> : null}
  </div>;
}

function PersonChoice({
  id,
  label,
  people,
  value,
  onChange,
  error,
  preservedName,
}: {
  id: string;
  label: string;
  people: PatientPerson[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  preservedName?: string;
}) {
  const [search, setSearch] = useState<string | null>(null);
  const chosen = people.find((p) => p.id === value);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {value && !chosen ? (
        <Notice>
          Seleção preservada: {preservedName || "Pessoa antes selecionada"}. Não
          está disponível na consulta atual; escolha uma pessoa elegível antes
          de revisar.
        </Notice>
      ) : null}
      <SearchSelect
        id={id}
        query={
          search ??
          chosen?.name ??
          (value ? (preservedName ?? "Pessoa indisponível") : "")
        }
        selectedIds={chosen ? [chosen.id] : []}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + "-error" : undefined}
        placeholder="Busque e selecione uma pessoa"
        triggerLabel={"Abrir opções de " + label.toLocaleLowerCase("pt-BR")}
        onQueryChange={(queryValue) => {
          setSearch(queryValue);
          onChange("");
        }}
        onSelectionChange={(nextIds) => {
          if (people.some((p) => p.id === nextIds[0])) {
            onChange(nextIds[0]!);
            setSearch(null);
          }
        }}
        options={
          people
            .filter(
              (p) =>
                !search ||
                p.name
                  .toLocaleLowerCase("pt-BR")
                  .includes(search.toLocaleLowerCase("pt-BR")),
            )
            .map((p) => ({
              value: p.id,
              label: p.name,
              content: <>{p.name}</>,
            })) ?? []
        }
      />
      {error ? (
        <p id={id + "-error"} className="ui-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function DeliveryRegularization({
  data,
  context,
  onUpdated,
  onEditingChange,
  readOnly = false,
}: {
  data: SupplyDocument;
  context: WorkspaceContext;
  onUpdated: (document: SupplyDocument) => void;
  onEditingChange: (editing: boolean) => void;
  readOnly?: boolean;
}) {
  const params = useSearchParams();
  const details = data.deliveryRegularization;
  const active = !readOnly && context.patient?.id === data.care_recipient_id;
  const write = active && can(context, "ent.regularize");
  const administrativeEntry = params.get("regularization") === "prepare" && params.get("documentTab") === "materials";
  const [mode, setMode] = useState<Mode | null>(() => administrativeEntry && write && details?.canPropose ? "propose" : null),
    [message, setMessage] = useState("");
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    onEditingChange(mode !== null);
    return () => onEditingChange(false);
  }, [mode, onEditingChange]);
  if (!details || data.status === "draft") return null;
  const current = details.cases.find((c) => c.id === details.currentId);
  function open(next: Mode, target: HTMLElement) {
    setTrigger(target);
    setMode(next);
  }
  function close() {
    setMode(null);
  }
  return (
    <section
      className="ui-card space-y-4"
      aria-label="Regularização administrativa"
      id="regularizacao"
    >
      <h2 ref={headingRef} tabIndex={-1}>
        Regularização administrativa
      </h2>
      {message ? <Notice>{message}</Notice> : null}
      <p>
        O recebimento pessoal e sua autoria permanecem preservados. A família
        pode apurar o material pendente quando o recebedor perde a autorização;
        efeitos críticos exigem conferência de outra pessoa elegível.
      </p>
      {!details.recipientAvailable && !details.sourceReady ? (
        <Notice error>
          A unidade de um material não pode ser conciliada com a referência
          atual. Atualize a ficha e regularize o cadastro antes de propor
          efeitos de estoque.
        </Notice>
      ) : null}
      {details.cases.map((item) => (
        <RegularizationCaseFacts key={item.id} item={item} />
      ))}
      {!details.cases.length ? (
        <p>
          {quantity(details.pendingTransit).gt(0)
            ? "Nenhum procedimento registrado. O material pendente continua em trânsito."
            : "Nenhum procedimento registrado. Não há parcela pendente a regularizar nesta consulta."}
        </p>
      ) : null}
      <div className="hca-toolbar">
        {write && details.canPropose ? (
          <ActionButton
            variant="primary"
            onClick={(e) => open("propose", e.currentTarget)}
          >
            Preparar regularização
          </ActionButton>
        ) : null}
        {write && details.canReview ? (
          <>
            {details.canApprove ? (
              <ActionButton
                variant="primary"
                onClick={(e) => open("approve", e.currentTarget)}
              >
                Conferir proposta
              </ActionButton>
            ) : (
              <Notice>
                A proposta perdeu uma referência necessária à aprovação. É
                possível rejeitar ou encerrar a proposta obsoleta com motivo
                próprio.
              </Notice>
            )}
            <ActionButton onClick={(e) => open("reject", e.currentTarget)}>
              Rejeitar proposta
            </ActionButton>
          </>
        ) : null}
        {write && details.canClose ? (
          <ActionButton onClick={(e) => open("withdraw", e.currentTarget)}>
            {current?.proposed_by === context.userId
              ? "Retirar minha proposta"
              : "Encerrar proposta obsoleta"}
          </ActionButton>
        ) : null}
        {active && can(context, "ent.follow_up") && details.canRecordFinding ? (
          <ActionButton onClick={(e) => open("finding", e.currentTarget)}>
            Registrar apuração própria
          </ActionButton>
        ) : null}
      </div>

      {write &&
      !details.recipientAvailable &&
      !details.reviewers.length &&
      details.canPropose ? (
        <Notice>
          É necessário outro familiar ou administrador local elegível para
          conferir. A ausência de conferente mantém a pendência.
        </Notice>
      ) : null}
      {mode ? (
        <RegularizationEditor
          key={mode}
          original={data}
          context={context}
          recoveryOnly={
            !active || !regularizationAvailable(data, mode)
          }
          startingMode={mode}
          restoreFocusTo={trigger}
          headingRef={headingRef}
          onClose={close}
          onSaved={(result) => {
            onUpdated(result);
            close();
            setMessage(
              result.commandOutcome?.state === "recovered"
                ? "Resultado registrado recuperado sem repetir efeitos."
                : "Ato administrativo registrado com autoria própria. Confira o dossiê e os movimentos vinculados.",
            );
            requestAnimationFrame(() => headingRef.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
function RegularizationEditor({
  original,
  context,
  recoveryOnly,
  startingMode,
  onClose,
  onSaved,
  restoreFocusTo,
  headingRef,
}: {
  original: SupplyDocument;
  context: WorkspaceContext;
  recoveryOnly: boolean;
  startingMode: Mode;
  onClose: () => void;
  onSaved: (document: SupplyDocument) => void;
  restoreFocusTo: HTMLElement | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [reference, setReference] = useState(original),
    [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const [baseline, setBaseline] = useState(() =>
    regularizationDraftReference(original),
  );
  const [referenceUnavailable, setReferenceUnavailable] = useState(false);
  const [followUpKind, setFollowUpKind] = useState<"note" | "destination">("note");
  const [destinations, setDestinations] = useState<Record<string, keyof Amounts>>({});
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject">(startingMode === "reject" ? "reject" : "approve");
  const followUp = startingMode === "finding";
  const independentReview = startingMode === "approve" || startingMode === "reject";
  const mode = followUp && followUpKind === "destination" ? "propose" : independentReview ? reviewDecision : startingMode;
  const title = titles[followUp ? "finding" : mode];
  const [reason, setReason] = useState(""),
    [basis, setBasis] = useState(""),
    [reviewer, setReviewer] = useState(""),
    [owner, setOwner] = useState("");
  const [entries, setEntries] = useState<Record<string, Amounts>>(() =>
    Object.fromEntries(
      original.lines.map((l) => [
        l.id,
        {
          receivedQuantity: followUp || remaining(l).eq(0) ? "0" : "",
          returnedQuantity: followUp || remaining(l).eq(0) ? "0" : "",
          missingQuantity: followUp || remaining(l).eq(0) ? "0" : "",
        },
      ]),
    ),
  );
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({});
  const intentRef = useRef<Packet | null>(null),
    formRef = useRef<HTMLFormElement>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  useEffect(() => {
    if (!focusRevision) return;
    const frame = requestAnimationFrame(() => {
      const dialog = reasonRef.current?.closest("details");
      if (dialog) dialog.open = true;
      reasonRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRevision]);
  const formId = useId(),
    details = reference.deliveryRegularization!;
  const current = details.cases.find((c) => c.id === details.currentId);
  const destinationAllowed = can(context, "ent.regularize") && details.canPropose;
  const nativeAction = mode === "propose" ? "propose_regularization" : mode === "finding" ? "record_regularization_finding" : mode === "withdraw" ? "withdraw_regularization" : "review_regularization";
  const decision = useDocumentDecision({ userId: context.userId, documentId: original.id, domain: "supply", action: nativeAction });
  const privateContent = regularizationDraftContent(baseline, reference, {
    reason,
    basis,
    reviewer,
    owner,
    entries,
  });
  const stale = regularizationDraftStale(baseline, reference);
  const editorBlocked =
    busy ||
    blocked ||
    uncertain ||
    stale ||
    recoveryOnly ||
    !regularizationAvailable(reference, mode) ||
    (followUp && mode === "propose" && !destinationAllowed) ||
    referenceUnavailable;
  useEffect(() => {
    if (review) reviewRef.current?.focus();
  }, [review]);
  const plans: DeliveryRegularizationLine[] = reference.lines.map((l) => {
    const e = entries[l.id],
      decimals = details.sourceLines.find(
        (s) => s.lineId === l.id,
      )?.quantityDecimals;
    const valid = Boolean(
      e &&
        decimals != null &&
        amounts.every(([key]) => validQuantity(e[key], decimals, true)),
    );
    const unknown = valid
      ? remaining(l)
          .minus(quantity(e.receivedQuantity))
          .minus(quantity(e.returnedQuantity))
          .minus(quantity(e.missingQuantity))
      : null;
    return {
      lineId: l.id,
      productId: l.product_id,
      name: l.name_snapshot,
      unit: l.unit_snapshot,
      quantityDecimals: decimals ?? 0,
      expeditedQuantity: l.quantity,
      acceptedQuantity: l.accepted_quantity,
      priorReconciledQuantity: l.reconciled_quantity,
      pendingQuantity: remaining(l).toFixed(),
      receivedQuantity: valid ? quantity(e.receivedQuantity).toFixed() : "0",
      returnedQuantity: valid ? quantity(e.returnedQuantity).toFixed() : "0",
      missingQuantity: valid ? quantity(e.missingQuantity).toFixed() : "0",
      unknownQuantity: unknown?.toFixed() ?? remaining(l).toFixed(),
    };
  });
  const hasUnknown = plans.some((l) => quantity(l.unknownQuantity).gt(0));
  function chooseDestination(lineId: string, next: keyof Amounts) {
    const previous = destinations[lineId] ?? "receivedQuantity";
    if (previous === next) return;
    setDestinations(current => ({ ...current, [lineId]: next }));
    setEntries(current => ({
      ...current,
      [lineId]: {
        receivedQuantity: "0", returnedQuantity: "0", missingQuantity: "0",
        [next]: current[lineId]?.[previous] ?? "0",
      },
    }));
  }
  async function prepare() {
    if (editorBlocked) return;
    const problems: Record<string, string> = {};
    if (reason.trim().length < 3)
      problems.reason =
        "Registre sua própria justificativa com pelo menos três caracteres.";
    if (mode === "propose") {
      if (basis.trim().length < 3)
        problems.basis = "Descreva as evidências e os limites da apuração.";
      if (!details.reviewers.some((p) => p.id === reviewer))
        problems.reviewer = "Selecione outra pessoa elegível para conferir.";
      if (hasUnknown && !details.followUpPeople.some((p) => p.id === owner))
        problems.owner = "Designe quem apurará a situação ainda desconhecida.";
      for (const l of plans) {
        const e = entries[l.lineId],
          source = details.sourceLines.find((s) => s.lineId === l.lineId);
        for (const [key] of amounts)
          if (
            !e ||
            source?.quantityDecimals == null ||
            !validQuantity(e[key], source.quantityDecimals, true)
          )
            problems[l.lineId + key] =
              "Informe a quantidade apurada, inclusive zero, na precisão desta unidade.";
        if (quantity(l.unknownQuantity).lt(0))
          problems[l.lineId + "receivedQuantity"] =
            "A soma apurada ultrapassa a pendência em trânsito.";
      }
      if (followUp && !plans.some(line => amounts.some(([key]) => quantity(line[key]).gt(0))))
        problems.destination = "Informe uma quantidade localizada ou com perda confirmada.";
    }
    setErrors(problems);
    if (Object.keys(problems).length) {
      setError("Revise os campos indicados.");
      requestAnimationFrame(() => {
        const target = document.getElementById(formId + Object.keys(problems)[0]);
        const disclosure = target?.closest("details");
        if (disclosure) disclosure.open = true;
        (target ?? formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]'))?.focus();
      });
      return;
    }
    const body =
      mode === "propose"
        ? {
            reason: reason.trim(),
            basis: basis.trim(),
            reviewerId: reviewer,
            ...(hasUnknown ? { followUpOwnerId: owner } : {}),
            lines: plans.map((l) => ({
              lineId: l.lineId,
              receivedQuantity: l.receivedQuantity,
              returnedQuantity: l.returnedQuantity,
              missingQuantity: l.missingQuantity,
            })),
          }
        : mode === "finding"
          ? { caseId: current?.id, text: reason.trim() }
          : mode === "withdraw"
            ? { caseId: current?.id, reason: reason.trim() }
            : {
                caseId: current?.id,
                accept: mode === "approve",
                reason: reason.trim(),
              };
    const action =
      mode === "propose"
        ? "propose_regularization"
        : mode === "finding"
          ? "record_regularization_finding"
          : mode === "withdraw"
            ? "withdraw_regularization"
            : "review_regularization";
    const parsed = supplyCommandSchema.safeParse({
      action,
      body,
      idempotencyKey: crypto.randomUUID(),
      expectedVersion: reference.version,
    });
    if (!parsed.success) {
      setError("Confira os campos e os limites informados antes de revisar.");
      return;
    }
    intentRef.current = parsed.data;
    setError("");
    setReview(true);
  }
  function verified(row: Record<string, unknown>, intention: DocumentDecisionIntention) {
    requireSupplyConfirmation({ data: row, persistence: "confirmed" }, { id: original.id, patientId: original.care_recipient_id, type: "ENT", minimumVersion: intention.expectedVersion });
  }
  async function send() {
    if (busy || !intentRef.current && !uncertain) return;
    setBusy(true); setError("");
    try {
      const packet = intentRef.current;
      const result = uncertain ? await decision.checkPrevious(verified) : await decision.execute({ domain: "supply", action: nativeAction, body: packet!.body as Record<string, unknown>, expectedVersion: packet!.expectedVersion }, verified);
      if (!result) return;
      intentRef.current = null; setUncertain(false);
      if (result.state === "applied") onSaved(requireSupplyConfirmation({ data: result.result, persistence: "confirmed" }, { id: original.id, patientId: original.care_recipient_id, type: "ENT", minimumVersion: result.intention.expectedVersion }));
      else { setReview(false); setError("A conferência confirmou que nada foi alterado. Seus campos continuam nesta tela para tentar novamente. Se persistir, procure a supervisão."); }
    } catch (cause) {
      const failure = cause instanceof DocumentDecisionFailure ? cause : null;
      const originalCause = failure?.cause ?? cause;
      const refused = failure?.outcome === "not_applied" || originalCause instanceof ApiError && [400,401,403,404,409,422].includes(originalCause.status);
      setUncertain(failure ? failure.outcome === "uncertain" : !refused);
      if (refused) { intentRef.current = null; setReview(false); if (originalCause instanceof ApiError && [403,404,409].includes(originalCause.status)) { setBlocked(true); setReferenceUnavailable(true); } }
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir. Procure a supervisão se persistir.");
    } finally { setBusy(false); }
  }
  async function compare() {
    setBusy(true);
    setError("");
    setReferenceUnavailable(true);
    setComparison(null);
    setBlocked(true);
    try {
      setComparison(
        parseRegularizationReference(
          await api<unknown>(
            "/api/documents/" + reference.id + "?reference=regularization",
          ),
          {
            id: original.id,
            patientId: original.care_recipient_id,
            minimumVersion: baseline.documentVersion,
          },
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar a ficha atual.",
      );
    } finally {
      setBusy(false);
    }
  }
  const nextDetails = comparison?.deliveryRegularization;
  const canAdopt =
    comparison &&
    regularizationAvailable(comparison, mode) &&
    !recoveryOnly;
  const pendingLines = reference.lines.filter(line => remaining(line).gt(0));
  const singlePending = pendingLines.length === 1 ? pendingLines[0] : null;
  const followUpSubtitle = singlePending
    ? `O destino de ${formatQuantity(remaining(singlePending).toFixed(), singlePending.unit_snapshot)} ainda está em aberto.`
    : "Consulte as quantidades apuradas e acompanhe o destino do restante.";
  const comparedIds = new Set(
    (comparison ?? reference).lines.map((line) => line.id),
  );
  const removedValues = baseline.materials.filter(
    (line) =>
      !comparedIds.has(line.id) &&
      amounts.some(([key]) => !!entries[line.id]?.[key]),
  );
  if (recoveryOnly) return <RecordDrawer modal title={title} onClose={onClose} restoreFocusTo={restoreFocusTo} restoreFocusFallbackRef={headingRef}><Notice>Este ato não está disponível neste estado ou perfil. Feche para consultar a ficha.</Notice></RecordDrawer>;
  function adoption(ready: boolean) {
    return (
      <ActionButton
        disabled={!ready || busy || !canAdopt || !!removedValues.length}
        onClick={(event) => {
          holdDialogFocus(event.currentTarget);
          setBaseline(
            adoptRegularizationDraftReference(privateContent, comparison!),
          );
          setReference(comparison!);
          setComparison(null);
          setBlocked(false);
          setReferenceUnavailable(false);
          setReview(false);
          intentRef.current = null;
          setErrors({});
          setFocusRevision((value) => value + 1);
        }}
      >
        Usar referência atual
      </ActionButton>
    );
  }
  const reasonField = (
    <div>
      <label className="block text-sm font-semibold" htmlFor={formId + "reason"}>
        {mode === "finding" ? "Relato da sua apuração" : "Sua justificativa"}
      </label>
      <textarea
        ref={reasonRef}
        id={formId + "reason"}
        className={inputClass}
        rows={3}
        maxLength={mode === "finding" ? 2000 : 1000}
        value={reason}
        onChange={event => setReason(event.currentTarget.value)}
        aria-invalid={Boolean(errors.reason)}
        aria-describedby={formId + "reason-help"}
      />
      <p id={formId + "reason-help"} className={errors.reason ? "ui-field-error" : "hca-field-hint"}>
        {errors.reason ?? `${reason.length}/${mode === "finding" ? 2000 : 1000} caracteres. Autoria própria; o motivo original permanece em leitura.`}
      </p>
    </div>
  );
  return (
    <RecordDrawer
      exitDialog
      modal
      popupClassName="hca-regularization-dialog"
      title={title}
      subtitle={followUp ? followUpSubtitle
        : independentReview ? "Confira as quantidades, as evidências e o responsável antes de registrar sua decisão."
          : mode === "propose" ? "O recebedor está indisponível. Informe o destino dos materiais que continuam em trânsito."
            : undefined}
      onClose={onClose}
      busy={busy}
      uncertainOutcome={uncertain || decision.uncertain}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={headingRef}
      footer={requestClose => <>
        <ActionButton disabled={busy || uncertain} onClick={requestClose}>Voltar</ActionButton>
        {review && !uncertain ? (
          <ActionButton disabled={busy} onClick={event => {
            holdDialogFocus(event.currentTarget);
            setReview(false);
            intentRef.current = null;
            setFocusRevision(value => value + 1);
          }}>Editar meus campos</ActionButton>
        ) : null}
        {review || uncertain ? (
          <ActionButton variant="primary" disabled={busy || blocked} onClick={() => void send()}>
            {uncertain ? "Recuperar mesmo ato" : mode === "approve" ? "Aprovar encerramento administrativo"
              : mode === "propose" ? "Registrar proposta sem movimentar"
                : mode === "finding" ? "Registrar minha apuração" : "Registrar decisão sem movimentar"}
          </ActionButton>
        ) : <ActionButton type="submit" form={formId} variant="primary" disabled={editorBlocked}>Revisar ato administrativo</ActionButton>}
      </>}
    >
      <div className="hca-form-stack hca-delivery-receipt">
        {stale ? (
          <Notice>
            O preenchimento preserva outra versão ou proposta. Compare a
            referência antes de preparar outro ato; seus valores próprios
            continuam guardados.
          </Notice>
        ) : null}
        {removedValues.length ? (
          <Notice>
            Valores preservados de materiais ausentes na referência atual
            precisam de uma decisão antes de adotar a nova referência.
            {removedValues.map((line) => (
              <p key={line.id}>
                {line.name} · {line.unit}:{" "}
                {amounts
                  .map(
                    ([key, label]) =>
                      `${label}: ${entries[line.id]?.[key] || "Não preenchido"}`,
                  )
                  .join("; ")}
              </p>
            ))}
            <ActionButton
              disabled={busy || uncertain}
              onClick={() => {
                const next = { ...entries },
                  fields = { ...baseline.fields };
                for (const line of removedValues) {
                  delete next[line.id];
                  for (const [key] of amounts)
                    delete fields[line.id + ":" + key];
                }
                setEntries(next);
                setBaseline({
                  ...baseline,
                  fields,
                  materials: baseline.materials.filter(
                    (line) =>
                      !removedValues.some((removed) => removed.id === line.id),
                  ),
                });
              }}
            >
              Retirar estes valores do preenchimento desta tela
            </ActionButton>
          </Notice>
        ) : null}
        {!referenceUnavailable && current ? (
          followUp || independentReview
            ? <RegularizationReviewFacts data={reference} item={current} followUp={followUp} disabled={busy || uncertain} />
            : mode === "withdraw" ? <RegularizationCaseFacts item={current} /> : null
        ) : null}
        {decision.recoveryMessage ? <Notice>{decision.recoveryMessage}</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? (
          <Notice>
            O resultado precisa ser recuperado. Conteúdo, versão e chave
            permanecem congelados até confirmar a mesma tentativa.
          </Notice>
        ) : null}
        {comparison ? (
          <section
            className="space-y-3 rounded-xl border border-(--line) p-4"
            aria-label="Comparação da regularização"
          >
            <h3 className="font-semibold">
              Ficha atual: v{comparison.version} · referência usada: v
              {reference.version}
            </h3>
            <p>
              Recebedor atualmente{" "}
              {nextDetails?.recipientAvailable
                ? "disponível para seus próprios atos"
                : "indisponível"}
              . Pendência em trânsito:{" "}
              {nextDetails?.pendingTransit ?? "não consultada"}.
            </p>
            {comparison.lines.map((l) => (
              <p key={l.id}>
                {l.name_snapshot}: aceite pessoal{" "}
                {formatQuantity(l.accepted_quantity, l.unit_snapshot)} ·
                conciliado{" "}
                {formatQuantity(l.reconciled_quantity, l.unit_snapshot)}.
              </p>
            ))}
            <p>
              Seus motivos e quantidades foram preservados. Adote a referência
              atual explicitamente e revise novamente antes de enviar.
            </p>
            {canAdopt ? (
              comparison.version > baseline.documentVersion ? (
                <DraftReferenceComparison
                  id={original.id}
                  fromVersion={baseline.documentVersion}
                  toVersion={comparison.version}
                >
                  {adoption}
                </DraftReferenceComparison>
              ) : (
                adoption(true)
              )
            ) : (
              <ActionButton onClick={() => onSaved(comparison)}>
                Abrir resultado atual
              </ActionButton>
            )}
          </section>
        ) : null}
        {!uncertain && (stale || blocked || referenceUnavailable) ? (
          <ActionButton disabled={busy} onClick={() => void compare()}>Consultar ficha e elegibilidade atuais</ActionButton>
        ) : null}
        {review ? (
          <section
            className="space-y-3"
            aria-label="Revisão do ato administrativo"
          >
            <h3 ref={reviewRef} tabIndex={-1} className="font-semibold">
              Resumo do ato administrativo
            </h3>
            {mode === "propose" ? (
              <>
                <p className="whitespace-pre-wrap wrap-break-word">
                  Motivo: {reason}
                </p>
                <p className="whitespace-pre-wrap wrap-break-word">
                  Base da apuração: {basis}
                </p>
                <p>
                  Conferente:{" "}
                  {details.reviewers.find((p) => p.id === reviewer)?.name}
                </p>
                {hasUnknown ? (
                  <p>
                    Responsável pela apuração futura:{" "}
                    {details.followUpPeople.find((p) => p.id === owner)?.name}
                  </p>
                ) : null}
                {!referenceUnavailable ? (
                  <RegularizationLines lines={plans} proposed />
                ) : null}
              </>
            ) : (
              <p className="whitespace-pre-wrap wrap-break-word">
                Sua {mode === "finding" ? "apuração" : "justificativa"}:{" "}
                {reason}
              </p>
            )}
          </section>
        ) : (
          <form
            ref={formRef}
            id={formId}
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void prepare();
            }}
          >
            <fieldset className="min-w-0 space-y-4" data-regularization-form={mode} disabled={editorBlocked}>
              {followUp ? <fieldset className="hca-regularization-choice">
                <legend>O que deseja registrar?</legend>
                <ActionButton aria-pressed={followUpKind === "note"} onClick={() => setFollowUpKind("note")}>Andamento da busca</ActionButton>
                {destinationAllowed ? <ActionButton aria-pressed={followUpKind === "destination"} onClick={() => setFollowUpKind("destination")}>Destino apurado</ActionButton> : null}
              </fieldset> : null}
              {independentReview ? <FormField label="Decisão sobre a proposta">
                <SelectField value={reviewDecision} onChange={event => setReviewDecision(event.currentTarget.value === "approve" ? "approve" : "reject")}>
                  <option value="approve" disabled={!details.canApprove}>Aprovar a apuração</option>
                  <option value="reject">Devolver para correção</option>
                </SelectField>
              </FormField> : null}
              {errors.destination ? <p className="ui-field-error">{errors.destination}</p> : null}
              {mode === "propose" ? <>
                  {plans.filter(line => !followUp || quantity(line.pendingQuantity).gt(0)).map(l => {
                    const material = reference.lines.find(line => line.id === l.lineId);
                    return (
                    <section
                      key={l.lineId}
                      className="hca-receipt-line"
                    >
                      <header>
                        <div><h3>{l.name}</h3><p>{reference.code} · {formatQuantity(l.expeditedQuantity, l.unit)} expedidos</p></div>
                        {material ? <DeliveryMaterialMenu data={reference} line={material} disabled={editorBlocked} /> : null}
                      </header>
                      {!referenceUnavailable ? (
                        <p className="text-sm">
                          Aceite pessoal preservado:{" "}
                          {formatQuantity(l.acceptedQuantity, l.unit)} ·
                          Pendente em trânsito:{" "}
                          {formatQuantity(l.pendingQuantity, l.unit)}
                        </p>
                      ) : null}
                      {quantity(l.pendingQuantity).eq(0) &&
                      amounts.every(
                        ([key]) => entries[l.lineId]?.[key] === "0",
                      ) ? (
                        <p>Sem quantidade pendente nesta linha.</p>
                      ) : (
                        <>
                          {followUp ? <FormField label="Destino apurado">
                            <SelectField value={destinations[l.lineId] ?? "receivedQuantity"} onChange={event => {
                              const choice = amounts.find(([key]) => key === event.currentTarget.value);
                              if (choice) chooseDestination(l.lineId, choice[0]);
                            }}>
                              <option value="receivedQuantity">{reference.payload.destination === "FAMILY" ? "Com a família" : "Com a equipe"}</option>
                              <option value="returnedQuantity">{reference.payload.source === "CARE_TEAM" ? "Devolvido à equipe" : "Devolvido à família"}</option>
                              <option value="missingQuantity">Perda confirmada</option>
                            </SelectField>
                          </FormField> : null}
                          <div className="hca-regularization-quantities">
                            {amounts.filter(([key]) => !followUp || key === (destinations[l.lineId] ?? "receivedQuantity")).map(([key, label]) => (
                              <div key={key}>
                                <label
                                  className="block text-sm font-semibold"
                                  htmlFor={formId + l.lineId + key}
                                >
                                  {label}<span className="sr-only"> · {l.name}</span>
                                </label>
                                <div className="hca-receipt-quantity"><input
                                  id={formId + l.lineId + key}
                                  className={inputClass}
                                  type="text"
                                  inputMode="decimal"
                                  value={entries[l.lineId]?.[key] ?? ""}
                                  onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setEntries((v) => ({
                                      ...v,
                                      [l.lineId]: {
                                        ...v[l.lineId],
                                        [key]: value,
                                      },
                                    }));
                                  }}
                                  aria-invalid={Boolean(errors[l.lineId + key])}
                                  aria-describedby={
                                    formId + l.lineId + key + "-help"
                                  }
                                /><span>{l.unit}</span></div>
                                <p
                                  id={formId + l.lineId + key + "-help"}
                                  className={
                                    errors[l.lineId + key]
                                      ? "ui-field-error"
                                      : "sr-only"
                                  }
                                >
                                  {errors[l.lineId + key] ??
                                    `${l.unit} · até ${l.quantityDecimals} casas decimais. Informe zero quando apurado.`}
                                </p>
                              </div>
                            ))}
                          </div>
                          <ActionButton
                            onClick={() =>
                              setEntries((v) => ({
                                ...v,
                                [l.lineId]: {
                                  receivedQuantity: "0",
                                  returnedQuantity: "0",
                                  missingQuantity: "0",
                                },
                              }))
                            }
                          >
                            Manter {l.name} como desconhecido
                          </ActionButton>
                        </>
                      )}
                      {!referenceUnavailable ? (
                        <p className="hca-regularization-unknown">
                          <span>Ainda sem localização</span><strong>{" "}
                          {quantity(l.unknownQuantity).lt(0)
                            ? "A soma ultrapassa a pendência"
                            : formatQuantity(l.unknownQuantity, l.unit)}
                          </strong>
                        </p>
                      ) : null}
                    </section>
                    );
                  })}
                  <RegularizationFold title="Motivo e evidências da proposta" icon="note">
                    {reasonField}
                  <div>
                    <label
                      htmlFor={formId + "basis"}
                      className="block text-sm font-semibold"
                    >
                      Evidências e limites da apuração
                    </label>
                    <textarea
                      id={formId + "basis"}
                      className={inputClass}
                      rows={3}
                      maxLength={2000}
                      value={basis}
                      onChange={(e) => setBasis(e.target.value)}
                      aria-invalid={Boolean(errors.basis)}
                      aria-describedby={formId + "basis-help"}
                    />
                    <p
                      id={formId + "basis-help"}
                      className={
                        errors.basis ? "ui-field-error" : "hca-field-hint"
                      }
                    >
                      {errors.basis ??
                        `${basis.length}/2000 caracteres. Declare o que foi comprovado e o que continua desconhecido.`}
                    </p>
                  </div>
                  <PersonChoice
                    id={formId + "reviewer"}
                    label="Conferente independente"
                    people={details.reviewers}
                    value={reviewer}
                    preservedName={baseline.fields.reviewerLabel}
                    onChange={setReviewer}
                    error={errors.reviewer}
                  />
                  </RegularizationFold>
                  {hasUnknown ? (
                    <RegularizationFold title="Responsável pela busca" icon="user">
                    <PersonChoice
                      id={formId + "owner"}
                      label="Responsável pela apuração futura"
                      people={details.followUpPeople}
                      value={owner}
                      preservedName={baseline.fields.followUpOwnerLabel}
                      onChange={setOwner}
                      error={errors.owner}
                    />
                    </RegularizationFold>
                  ) : null}
              </> : reasonField}
            </fieldset>
          </form>
        )}
        <p className="hca-regularization-impact">
          <Icon name={mode === "finding" ? "history" : "shield"} width={16} height={16} />
          {mode === "propose"
            ? "Uma pessoa designada revisará a proposta antes de atualizar o estoque."
            : mode === "approve"
              ? "A aprovação registra os destinos apurados. O restante continua em trânsito e o aceite pessoal permanece preservado."
              : mode === "finding"
                ? "O registro entra no histórico da busca. As quantidades em apuração continuam pendentes."
                : "A decisão preserva a proposta e os fatos anteriores, sem movimentar estoque."}
        </p>
        {!uncertain && !stale && !blocked && !referenceUnavailable ? <RegularizationFold title="Referência da ficha" icon="file">
          <p>{reference.code} · ficha v{reference.version}</p>
          <ActionButton disabled={busy} onClick={() => void compare()}>Consultar ficha e elegibilidade atuais</ActionButton>
        </RegularizationFold> : null}
      </div>
    </RecordDrawer>
  );
}
