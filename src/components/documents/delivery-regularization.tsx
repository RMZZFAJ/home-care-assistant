"use client";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useId, useRef, useState } from "react";

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
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
import {
  regularizationPurposes,
  regularizationAvailable,
  regularizationDraftReference,
  regularizationDraftContent,
  regularizationDraftValues,
  regularizationDraftStale,
  adoptRegularizationDraftReference,
  type RegularizationMode,
} from "@/lib/forms/regularization-draft";
import { parseRegularizationReference } from "@/lib/validation/regularization-reference";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import { DraftReferenceComparison } from "./draft-reference-comparison";
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
  propose: "Preparar regularização administrativa",
  approve: "Conferir regularização administrativa",
  reject: "Rejeitar regularização administrativa",
  withdraw: "Encerrar proposta de regularização",
  finding: "Registrar apuração própria",
};
type Packet = {
  action: string;
  body: unknown;
  expectedVersion: number;
  idempotencyKey: string;
  draftCommit: { id: string; revision: number };
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
          className="rounded-xl border border-(--line) p-3 text-sm"
        >
          <h4 className="font-semibold break-words">{line.name}</h4>
          <p>
            Expedido: {formatQuantity(line.expeditedQuantity, line.unit)} ·
            Aceite pessoal preservado:{" "}
            {formatQuantity(line.acceptedQuantity, line.unit)}
          </p>
          <p>
            Conciliação anterior:{" "}
            {formatQuantity(line.priorReconciledQuantity, line.unit)} · Em
            trânsito antes desta proposta:{" "}
            {formatQuantity(line.pendingQuantity, line.unit)}
          </p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {amounts.map(([field, label]) => (
              <div key={field}>
                <dt>
                  {proposed ? "Proposto · " : "Apurado · "}
                  {label}
                </dt>
                <dd className="font-semibold">
                  {formatQuantity(line[field], line.unit)}
                </dd>
              </div>
            ))}
            <div>
              <dt>Situação física desconhecida</dt>
              <dd className="font-semibold">
                {formatQuantity(line.unknownQuantity, line.unit)}
              </dd>
            </div>
          </dl>
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
      <p className="whitespace-pre-wrap break-words">
        <strong>Motivo original:</strong> {item.proposal.reason}
      </p>
      <p className="whitespace-pre-wrap break-words">
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
          <p className="whitespace-pre-wrap break-words">
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
          <p className="whitespace-pre-wrap break-words">{f.body}</p>
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
}: {
  data: SupplyDocument;
  context: WorkspaceContext;
  onUpdated: (document: SupplyDocument) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null),
    [message, setMessage] = useState("");
  const [consulting, setConsulting] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const details = data.deliveryRegularization;
  if (!details || data.status === "draft") return null;
  const active = context.patient?.id === data.care_recipient_id;
  const write = active && can(context, "ent.regularize");
  const current = details.cases.find((c) => c.id === details.currentId);
  function open(next: Mode, target: HTMLElement, privateOnly = false) {
    setTrigger(target);
    setMode(next);
    setConsulting(privateOnly);
    onEditingChange(true);
  }
  function close() {
    setMode(null);
    onEditingChange(false);
  }
  return (
    <section
      className="ui-card space-y-4"
      aria-label="Regularização administrativa"
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
      {active ? (
        <details className="hca-form-stack">
          <summary>Meus preenchimentos de regularização</summary>
          <p>
            Consulte somente seus preenchimentos e resultados, inclusive quando
            o ato não estiver mais disponível.
          </p>
          <div className="hca-form-stack">
            {(Object.keys(titles) as Mode[]).map((item) => (
              <ActionButton
                key={item}
                onClick={(event) => open(item, event.currentTarget, true)}
              >
                Consultar preenchimento: {titles[item]}
              </ActionButton>
            ))}
          </div>
        </details>
      ) : null}
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
            consulting || !active || !regularizationAvailable(data, mode)
          }
          mode={mode}
          restoreFocusTo={trigger}
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
  mode,
  onClose,
  onSaved,
  restoreFocusTo,
}: {
  original: SupplyDocument;
  context: WorkspaceContext;
  recoveryOnly: boolean;
  mode: Mode;
  onClose: () => void;
  onSaved: (document: SupplyDocument) => void;
  restoreFocusTo: HTMLElement | null;
}) {
  const [reference, setReference] = useState(original),
    [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const [baseline, setBaseline] = useState(() =>
    regularizationDraftReference(original),
  );
  const [referenceUnavailable, setReferenceUnavailable] = useState(false);
  const [reason, setReason] = useState(""),
    [basis, setBasis] = useState(""),
    [reviewer, setReviewer] = useState(""),
    [owner, setOwner] = useState("");
  const [entries, setEntries] = useState<Record<string, Amounts>>(() =>
    Object.fromEntries(
      original.lines.map((l) => [
        l.id,
        {
          receivedQuantity: remaining(l).eq(0) ? "0" : "",
          returnedQuantity: remaining(l).eq(0) ? "0" : "",
          missingQuantity: remaining(l).eq(0) ? "0" : "",
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
    reviewRef = useRef<HTMLHeadingElement>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  useEffect(() => {
    if (!focusRevision) return;
    const frame = requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>("textarea,input")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [focusRevision]);
  const formId = useId(),
    details = reference.deliveryRegularization!;
  const current = details.cases.find((c) => c.id === details.currentId);
  const purpose = regularizationPurposes[mode];
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId: original.care_recipient_id,
    kind: "ENT",
    purpose,
    targetDocumentId: original.id,
    navigation: navigationForStep(draftFlow("ENT", purpose)!, 0),
    onResume(saved) {
      if (!saved.content || !("fields" in saved.content) || saved.content.documentVersion === null) return false;
      restore(saved.content);
      return true;
    },
    onDiscard() {
      restore(regularizationDraftReference(reference));
    },
  });
  function restore(content: ReceiptDraftContent) {
    const values = regularizationDraftValues(content);
    setBaseline(content);
    setReason(values.reason);
    setBasis(values.basis);
    setReviewer(values.reviewer);
    setOwner(values.owner);
    setEntries(values.entries);
    setReview(false);
    intentRef.current = null;
    setError("");
    setErrors({});
  }
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
    privateDraft.blocked ||
    recoveryOnly ||
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
    }
    setErrors(problems);
    if (Object.keys(problems).length) {
      setError("Revise os campos indicados.");
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
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
    const saved = await privateDraft.save(privateContent);
    if (!saved) return;
    intentRef.current = {
      ...parsed.data,
      draftCommit: { id: saved.id, revision: saved.revision },
    };
    setError("");
    setReview(true);
  }
  async function send() {
    if (!intentRef.current) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SupplyDocument }>(
        "/api/documents/" + reference.id,
        intentRef.current,
      );
      result.data = requireSupplyConfirmation(result, {
        id: original.id,
        patientId: original.care_recipient_id,
        type: "ENT",
        minimumVersion: intentRef.current.expectedVersion,
      });
      setUncertain(false);
      intentRef.current = null;
      onSaved(result.data);
    } catch (cause) {
      const refused =
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      setUncertain(!refused);
      if (refused) {
        intentRef.current = null;
        setBlocked(cause.status === 403 || cause.status === 409);
        setReview(false);
        if ([401, 403, 404].includes(cause.status)) {
          setReferenceUnavailable(true);
          privateDraft.reload();
        }
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar o resultado.",
      );
    } finally {
      setBusy(false);
    }
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
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        privateDraft.reload();
    } finally {
      setBusy(false);
    }
  }
  const nextDetails = comparison?.deliveryRegularization;
  const canAdopt =
    comparison &&
    regularizationAvailable(comparison, mode) &&
    !privateDraft.blocked;
  const comparedIds = new Set(
    (comparison ?? reference).lines.map((line) => line.id),
  );
  const removedValues = baseline.materials.filter(
    (line) =>
      !comparedIds.has(line.id) &&
      amounts.some(([key]) => !!entries[line.id]?.[key]),
  );
  const privatePanel = (
    <CreationDraftPanel
      draft={privateDraft}
      current={privateContent}
      patientName={context.patient?.display_name ?? "Paciente selecionado"}
      disabled={busy || uncertain || review}
      resumeLabel={recoveryOnly ? "Consultar preenchimento salvo" : undefined}
      discardLabel={
        recoveryOnly ? "Descartar preenchimento privado" : undefined
      }
      acknowledgeLabel="Reconhecer resultado aplicado"
    />
  );
  if (
    recoveryOnly ||
    privateDraft.readDenied ||
    privateDraft.protectedReadPending
  )
    return (
      <RecordDrawer
        title={titles[mode]}
        onClose={onClose}
        restoreFocusTo={restoreFocusTo}
        busy={privateDraft.busy}
        preventClose={!!privateDraft.pending}
      >
        <Notice>
          Consulta pessoal do preenchimento. Esta tela não confirma nem repete
          um ato oficial.
        </Notice>
        {privatePanel}
        {privateDraft.base?.state === "active" &&
        !privateDraft.offered &&
        !privateDraft.readDenied &&
        !privateDraft.protectedReadPending ? (
          <DraftContentSummary
            content={privateDraft.base.content}
            kind="ENT"
            purpose={purpose}
          />
        ) : null}
        {!privateDraft.loading &&
        !privateDraft.loadError &&
        !privateDraft.base &&
        !privateDraft.offered &&
        !privateDraft.consumed ? (
          <p>
            Nenhum preenchimento ou resultado privado pendente para este ato
            neste perfil.
          </p>
        ) : null}
      </RecordDrawer>
    );
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
  return (
    <RecordDrawer
      title={titles[mode]}
      onClose={onClose}
      busy={busy}
      preventClose={uncertain || !!privateDraft.pending}
      restoreFocusTo={restoreFocusTo}
    >
      <div className="space-y-4">
        {privatePanel}
        <Notice>
          Salvar preserva apenas sua preparação. Proposta, decisão e
          movimentação exigem revisão e confirmação próprias.
        </Notice>
        <ActionButton
          disabled={busy || uncertain || review || privateDraft.blocked}
          onClick={() => void privateDraft.save(privateContent)}
        >
          Salvar preenchimento privado
        </ActionButton>
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
              disabled={busy || uncertain || privateDraft.blocked}
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
              Retirar estes valores do preenchimento privado
            </ActionButton>
          </Notice>
        ) : null}
        <p className="text-sm">
          {reference.code} · ficha v{reference.version}
        </p>
        <Notice>
          {mode === "propose"
            ? "Propor preserva o estoque. Outra pessoa conferirá sua apuração antes de qualquer encerramento crítico."
            : mode === "approve"
              ? "Aprovar movimenta somente o material comprovado. O desconhecido permanece em trânsito e conserva responsável futuro. Não altera o aceite pessoal anterior."
              : mode === "finding"
                ? "Seu relato fica vinculado à pendência. Ele não movimenta estoque nem declara recebimento pela pessoa desligada."
                : "Este ato preserva a proposta e os fatos anteriores, sem movimentar estoque."}
        </Notice>
        {!referenceUnavailable && mode !== "propose" && current ? (
          <RegularizationCaseFacts item={current} />
        ) : null}
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
        {!uncertain ? (
          <ActionButton disabled={busy} onClick={() => void compare()}>
            Consultar ficha e elegibilidade atuais
          </ActionButton>
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
                <p className="whitespace-pre-wrap break-words">
                  Motivo: {reason}
                </p>
                <p className="whitespace-pre-wrap break-words">
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
              <p className="whitespace-pre-wrap break-words">
                Sua {mode === "finding" ? "apuração" : "justificativa"}:{" "}
                {reason}
              </p>
            )}
          </section>
        ) : (
          <form
            ref={formRef}
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void prepare();
            }}
          >
            <fieldset className="min-w-0 space-y-4" disabled={editorBlocked}>
              <div>
                <label
                  className="block text-sm font-semibold"
                  htmlFor={formId + "reason"}
                >
                  {mode === "finding"
                    ? "Relato da sua apuração"
                    : "Sua justificativa"}
                </label>
                <textarea
                  id={formId + "reason"}
                  className={inputClass}
                  rows={3}
                  maxLength={mode === "finding" ? 2000 : 1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={formId + "reason-help"}
                />
                <p
                  id={formId + "reason-help"}
                  className={
                    errors.reason ? "ui-field-error" : "hca-field-hint"
                  }
                >
                  {errors.reason ??
                    `${reason.length}/${mode === "finding" ? 2000 : 1000} caracteres. Autoria própria; o motivo original permanece em leitura.`}
                </p>
              </div>
              {mode === "propose" ? (
                <>
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
                  {plans.map((l) => (
                    <section
                      key={l.lineId}
                      className="space-y-3 rounded-xl border border-(--line) p-3"
                    >
                      <h3 className="font-semibold break-words">{l.name}</h3>
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
                          <div className="grid gap-3 sm:grid-cols-2">
                            {amounts.map(([key, label]) => (
                              <div key={key}>
                                <label
                                  className="block text-sm font-semibold"
                                  htmlFor={formId + l.lineId + key}
                                >
                                  {label} · {l.name}
                                </label>
                                <input
                                  id={formId + l.lineId + key}
                                  className={inputClass}
                                  type="text"
                                  inputMode="decimal"
                                  value={entries[l.lineId]?.[key] ?? ""}
                                  onChange={(e) =>
                                    setEntries((v) => ({
                                      ...v,
                                      [l.lineId]: {
                                        ...v[l.lineId],
                                        [key]: e.target.value,
                                      },
                                    }))
                                  }
                                  aria-invalid={Boolean(errors[l.lineId + key])}
                                  aria-describedby={
                                    formId + l.lineId + key + "-help"
                                  }
                                />
                                <p
                                  id={formId + l.lineId + key + "-help"}
                                  className={
                                    errors[l.lineId + key]
                                      ? "ui-field-error"
                                      : "hca-field-hint"
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
                        <p className="text-sm">
                          Situação física desconhecida:{" "}
                          {quantity(l.unknownQuantity).lt(0)
                            ? "A soma ultrapassa a pendência"
                            : formatQuantity(l.unknownQuantity, l.unit)}
                          . Permanece em trânsito.
                        </p>
                      ) : null}
                    </section>
                  ))}
                  <PersonChoice
                    id={formId + "reviewer"}
                    label="Conferente independente"
                    people={details.reviewers}
                    value={reviewer}
                    preservedName={baseline.fields.reviewerLabel}
                    onChange={setReviewer}
                    error={errors.reviewer}
                  />
                  {hasUnknown ? (
                    <PersonChoice
                      id={formId + "owner"}
                      label="Responsável pela apuração futura"
                      people={details.followUpPeople}
                      value={owner}
                      preservedName={baseline.fields.followUpOwnerLabel}
                      onChange={setOwner}
                      error={errors.owner}
                    />
                  ) : null}
                </>
              ) : null}
              <ActionButton type="submit" variant="primary">
                Revisar ato administrativo
              </ActionButton>
            </fieldset>
          </form>
        )}
        <div className="hca-toolbar">
          <ActionButton disabled={busy || uncertain} onClick={onClose}>
            Voltar sem registrar
          </ActionButton>
          {review && !uncertain ? (
            <ActionButton
              disabled={busy}
              onClick={(event) => {
                holdDialogFocus(event.currentTarget);
                setReview(false);
                intentRef.current = null;
                setFocusRevision((value) => value + 1);
              }}
            >
              Editar meus campos
            </ActionButton>
          ) : null}
          {review || uncertain ? (
            <ActionButton
              variant="primary"
              disabled={busy || blocked}
              onClick={() => void send()}
            >
              {uncertain
                ? "Recuperar mesmo ato"
                : mode === "approve"
                  ? "Aprovar encerramento administrativo"
                  : mode === "propose"
                    ? "Registrar proposta sem movimentar"
                    : mode === "finding"
                      ? "Registrar minha apuração"
                      : "Registrar decisão sem movimentar"}
            </ActionButton>
          ) : null}
        </div>
      </div>
    </RecordDrawer>
  );
}
