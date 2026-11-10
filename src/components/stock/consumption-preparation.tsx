"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ActionButton,
  DefinitionGrid,
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { SearchSelect } from "@/components/ui/search-select";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import { consumptionCommand } from "@/lib/validation/consumption";
import { validQuantity } from "@/lib/quantity";
import {
  consumptionReportSchema,
  consumptionPreparationContentSchema,
  consumptionPreparationPendingSchema,
  parseConsumptionPreparationReference,
  parseConsumptionPreparationConfirmation,
  type ConsumptionPreparationFields,
  type ConsumptionPreparationCommit,
  type ConsumptionPreparationReference,
} from "@/lib/validation/consumption-preparations";
import type { ConsumptionPreparationPurpose } from "@/lib/forms/consumption-preparation-purposes";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";
import type { ReminderOrigin } from "@/components/notifications/notification-reference";
import { ConsumptionLines } from "./consumption-lines";

export function ConsumptionPreparation({
  context,
  report: sourceReport,
  accept,
  products,
  catalogError = "",
  catalogLoading = false,
  onCatalogRetry = () => {},
  onClose,
  onSaved,
  restoreFocusTo,
  sourceReminder,
}: {
  context: WorkspaceContext;
  report?: ConsumptionReport;
  accept?: boolean;
  products: CatalogProduct[];
  catalogError?: string;
  catalogLoading?: boolean;
  onCatalogRetry?: () => void;
  onClose: () => void;
  onSaved: (id: string, report?: ConsumptionReport) => void;
  restoreFocusTo?: HTMLElement | null;
  sourceReminder?: ReminderOrigin;
}) {
  const [report] = useState(sourceReport);
  const patient = context.patient!,
    patientId = patient.id,
    patientActive = patient.is_active !== false && patient.active !== false,
    decision = accept !== undefined;
  const [fields, setFields] = useState<ConsumptionPreparationFields>(() => ({
    kind: report?.kind ?? "",
    location: report?.location ?? (sourceReminder ? "CARE_TEAM" : "FAMILY"),
    text: "",
    reason: "",
    reminderId: sourceReminder?.id ?? "",
    lines: decision
      ? []
      : (report?.current_lines ?? []).map((l) => ({
          productId: l.productId,
          name: l.name ?? l.productId,
          unit: l.unit,
          quantity: l.quantity,
        })),
  }));
  const [chosenCustody, setChosenCustody] = useState(
    Boolean(report || sourceReminder),
  );
  const purpose: ConsumptionPreparationPurpose = decision
    ? accept
      ? "consumption_accept"
      : "consumption_reject"
    : report
      ? "consumption_supplement"
      : fields.location === "FAMILY"
        ? "consumption_report_family"
        : "consumption_report_team";
  const target = report?.id ?? patientId;
  const [reference, setReference] =
      useState<ConsumptionPreparationReference | null>(null),
    [referenceHash, setReferenceHash] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
      reference: ConsumptionPreparationReference;
      referenceHash: string;
    } | null>(null),
    [sourceError, setSourceError] = useState("");
  const [sourceDenied, setSourceDenied] = useState(false);
  const [review, setReview] = useState(false),
    [packet, setPacket] = useState<ConsumptionPreparationCommit | null>(null),
    [uncertain, setUncertain] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(""),
    [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true),
    automaticRef = useRef(true),
    savedWithoutReferenceRef = useRef(false),
    pendingRef = useRef<ConsumptionPreparationCommit | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null),
    headingRef = useRef<HTMLHeadingElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  const storageKey = `hca:consumption-preparation-confirmation:${context.userId}:${patientId}:${purpose}:${target}`;
  const draft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "CONSUMPTION",
    purpose,
    targetDocumentId: null,
    targetResourceId: target,
    enabled: chosenCustody,
    readScopeRevision: JSON.stringify([
      patient.capabilities?.["stock.family.read"],
      patient.capabilities?.["stock.team.read"],
    ]),
    navigation: navigationForStep("CONSUMPTION", 0),
    onResume: (row) => {
      const v = consumptionPreparationContentSchema.safeParse(row.content);
      if (!v.success) return false;
      automaticRef.current = false;
      savedWithoutReferenceRef.current = v.data.reference === null;
      setFields(v.data.consumption);
      setReference(v.data.reference);
      setReferenceHash(v.data.referenceHash);
      setReview(false);
      setError("");
      setAttempt((n) => n + 1);
      return true;
    },
    onDiscard: onClose,
  });
  const content = { consumption: fields, reference, referenceHash };
  const canWrite =
    patientActive &&
    (decision
      ? can(
          context,
          fields.location === "FAMILY"
            ? "stock.family.manage"
            : "consumption.confirm",
        )
      : can(context, "consumption.report"));
  const protectedView =
    sourceDenied ||
    draft.loading ||
    Boolean(draft.loadError) ||
    draft.readDenied ||
    draft.protectedReadPending;
  const referenceFields = JSON.stringify({
    ...fields,
    text: "",
    reason: "",
    lines: fields.lines.map((l) => ({ ...l, quantity: "" })),
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || !chosenCustody) return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          v = raw
            ? consumptionPreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          v?.success &&
          v.data.userId === context.userId &&
          v.data.packet.careRecipientId === patientId &&
          v.data.packet.purpose === purpose &&
          v.data.packet.targetResourceId === target
        ) {
          automaticRef.current = false;
          pendingRef.current = v.data.packet;
          setPacket(v.data.packet);
          setUncertain(true);
          setReview(true);
        }
      } catch {
        /* Damaged optional copy cannot authorize a command. */
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, chosenCustody, context.userId, patientId, purpose, target]);
  useEffect(() => {
    if (
      !chosenCustody ||
      !patientActive ||
      draft.loading ||
      draft.offered ||
      draft.pending ||
      draft.consumed ||
      draft.readDenied
    )
      return;
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setSourceError("");
      setCurrent(null);
      try {
        const value = await api<{ data: unknown }>(
          "/api/consumption/preparations/reference",
          {
            careRecipientId: patientId,
            purpose,
            targetResourceId: target,
            fields: JSON.parse(referenceFields),
          },
          controller.signal,
        );
        const next = parseConsumptionPreparationReference(value.data, {
          patientId,
          purpose,
          targetResourceId: target,
        });
        if (!active) return;
        setCurrent(next);
        if (
          automaticRef.current &&
          !savedWithoutReferenceRef.current &&
          (!report ||
            (report.version === next.reference.report?.version &&
              report.status === next.reference.report?.status))
        ) {
          setReference(next.reference);
          setReferenceHash(next.referenceHash);
        }
      } catch (cause) {
        if (
          active &&
          cause instanceof ApiError &&
          [401, 403, 404].includes(cause.status)
        )
          setSourceDenied(true);
        if (active)
          setSourceError(
            cause instanceof ApiError &&
              cause.status >= 400 &&
              cause.status < 500
              ? cause.message
              : "Atualize esta consulta. Ela não registra relato, decisão ou desconto.",
          );
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
    // Only material identity/custody/origin changes invalidate the reference query.
    // Typing quantities or observations must not replace a preserved reference.
  }, [
    patientId,
    purpose,
    target,
    referenceFields,
    attempt,
    chosenCustody,
    patientActive,
    draft.loading,
    draft.offered,
    draft.pending,
    draft.consumed,
    draft.readDenied,
    report,
  ]);
  useEffect(() => {
    if (review) headingRef.current?.focus();
  }, [review]);
  const blocked =
    busy ||
    draft.busy ||
    draft.blocked ||
    uncertain ||
    !canWrite ||
    current?.reference.reminder?.canReport === false;
  const stale =
    !current ||
    current.referenceHash !== referenceHash ||
    Boolean(sourceError) ||
    fields.lines.some((l) => {
      const c = current?.reference.catalog.find((c) => c.id === l.productId);
      return !c || c.name !== l.name || c.unit !== l.unit;
    });
  function adopt() {
    if (!current) return;
    automaticRef.current = false;
    savedWithoutReferenceRef.current = false;
    setReference(current.reference);
    setReferenceHash(current.referenceHash);
    setFields((v) => ({
      ...v,
      kind: current.reference.report?.kind ?? v.kind,
      lines: v.lines.map((l) => {
        const c = current.reference.catalog.find((c) => c.id === l.productId);
        return c ? { ...l, name: c.name, unit: c.unit } : l;
      }),
    }));
    setReview(false);
    setPacket(null);
    setError("");
    requestAnimationFrame(() =>
      decision ? reasonRef.current?.focus() : textRef.current?.focus(),
    );
  }
  async function save() {
    automaticRef.current = false;
    if (!reference) savedWithoutReferenceRef.current = true;
    return draft.save(content);
  }
  function nativeCommand(key: string) {
    return consumptionCommand.safeParse(
      decision
        ? {
            action: "confirm",
            id: target,
            accept,
            expectedVersion: reference?.report?.version,
            idempotencyKey: key,
            ...(!accept ? { reason: fields.reason } : {}),
          }
        : report
          ? {
              action: "supplement",
              id: target,
              text: fields.text,
              lines: fields.lines.map(({ productId, unit, quantity }) => ({
                productId,
                unit,
                quantity,
              })),
              expectedVersion: reference?.report?.version,
              idempotencyKey: key,
            }
          : {
              action: "report",
              careRecipientId: patientId,
              kind: fields.kind,
              location: fields.location,
              text: fields.text,
              lines: fields.lines.map(({ productId, unit, quantity }) => ({
                productId,
                unit,
                quantity,
              })),
              idempotencyKey: key,
              ...(fields.reminderId ? { reminderId: fields.reminderId } : {}),
            },
    );
  }
  async function prepare(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (blocked) return;
    setError("");
    setFieldErrors({});
    const invalid: Record<string, string> = {};
    if (!decision)
      for (const l of fields.lines) {
        const p = current?.reference.catalog.find((p) => p.id === l.productId);
        if (!p || !validQuantity(l.quantity, p.decimals))
          invalid[l.productId] =
            "Confira a quantidade e a precisão do material indicado.";
      }
    const key = crypto.randomUUID(),
      cmd = nativeCommand(key);
    if (!cmd.success) {
      for (const issue of cmd.error.issues) {
        const name = String(issue.path[0] ?? "form");
        const messages: Record<string, string> = {
          kind: "Escolha o tipo do relato.",
          location: "Escolha a custódia.",
          text: "Descreva o fato com pelo menos três e até 2000 caracteres.",
          reason:
            "Informe o motivo da rejeição com pelo menos três e até 1000 caracteres.",
          lines:
            "Confira os materiais, as unidades e as quantidades selecionadas.",
          expectedVersion: "Consulte e adote a versão atual do relato.",
        };
        invalid[name] =
          messages[name] ?? "Confira este campo antes de revisar.";
      }
    }
    if (Object.keys(invalid).length) {
      setFieldErrors(invalid);
      setError("Confira os campos indicados, sem apagar os demais valores.");
      const name = Object.keys(invalid)[0];
      requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(name);
        if (field instanceof HTMLElement) field.focus();
      });
      return;
    }
    if (stale || !referenceHash || !cmd.success) {
      setError(
        "Consulte e adote explicitamente a referência atual antes de revisar.",
      );
      return;
    }
    setBusy(true);
    try {
      const saved = await save();
      if (saved) {
        setPacket({
          careRecipientId: patientId,
          purpose,
          targetResourceId: target,
          draftCommit: { id: saved.id, revision: saved.revision },
          idempotencyKey: key,
          referenceHash,
          command: cmd.data,
        });
        setReview(true);
      }
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    const original = pendingRef.current ?? packet;
    if (!original) return;
    setBusy(true);
    setError("");
    pendingRef.current = original;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          userId: context.userId,
          packet: original,
        }),
      );
    } catch {
      /* Server intention and manual recovery remain available. */
    }
    try {
      const raw = await api<{ data: unknown }>(
          "/api/consumption/preparations/commit",
          original,
        ),
        result = parseConsumptionPreparationConfirmation(
          raw.data,
          original,
          context.userId,
        );
      pendingRef.current = null;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Optional storage does not invalidate a confirmed server result. */
      }
      setUncertain(false);
      setPacket(null);
      draft.reload();
      // A frozen private receipt describes the original act;consult current state separately.
      let latest: ConsumptionReport = {
        ...result.consumedResult.report,
        replayed: result.replayed,
      };
      try {
        const next = await api<{ data: unknown }>(
            "/api/consumption/" + result.consumedResourceId,
          ),
          checked = consumptionReportSchema.safeParse(next.data);
        if (
          checked.success &&
          checked.data.id === result.consumedResourceId &&
          checked.data.care_recipient_id === patientId
        )
          latest = { ...checked.data, replayed: result.replayed };
      } catch {
        /* Confirmed act remains recoverable even if the separate current read fails. */
      }
      if (mountedRef.current) onSaved(result.consumedResourceId, latest);
    } catch (cause) {
      const refused =
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409].includes(cause.status);
      if (!uncertain && refused) {
        pendingRef.current = null;
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional storage does not invalidate a confirmed server result. */
        }
        setPacket(null);
        setReview(true);
      } else setUncertain(true);
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status))
        await draft.revalidateRead();
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar o resultado. Recupere a mesma tentativa.",
      );
      setAttempt((n) => n + 1);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  async function openCurrentResult() {
    setBusy(true);
    setError("");
    try {
      const next = await api<{ data: unknown }>("/api/consumption/" + target),
        v = consumptionReportSchema.safeParse(next.data);
      if (
        !v.success ||
        v.data.id !== target ||
        v.data.care_recipient_id !== patientId
      )
        throw new Error(
          "Não foi possível conferir o relato atual. Repita a consulta.",
        );
      onSaved(target, v.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar o resultado.",
      );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  const title = decision
    ? accept
      ? report?.kind === "shortage"
        ? "Revisar confirmação da falta"
        : "Revisar confirmação do consumo"
      : "Revisar rejeição do relato"
    : report
      ? "Complementar relato"
      : "Registrar relato";
  const ready =
    chosenCustody &&
    !draft.loading &&
    !draft.offered &&
    !draft.conflict &&
    !draft.pending &&
    !draft.consumed &&
    !protectedView;
  const source =
    reference?.report ??
    (report
      ? {
          version: report.version,
          body: report.body,
          lines: report.current_lines,
          lastSupplement: report.revisions.at(-1),
          kind: report.kind,
        }
      : null);
  return (
    <RecordDrawer
      title={title}
      onClose={onClose}
      restoreFocusTo={restoreFocusTo}
      busy={busy || draft.busy}
      preventClose={uncertain || Boolean(draft.pending)}
      hasUnsavedChanges={
        draft.base?.content && "consumption" in draft.base.content
          ? JSON.stringify(fields) !==
              JSON.stringify(draft.base.content.consumption) ||
            referenceHash !== draft.base.content.referenceHash
          : fields.text !== "" || fields.reason !== ""
      }
    >
      {!report && !chosenCustody ? (
        <FormField label="Tipo" htmlFor="consumption-initial-kind">
          <SelectField
            id="consumption-initial-kind"
            value={fields.kind}
            onChange={(e) => {
              const kind = e.currentTarget
                .value as ConsumptionPreparationFields["kind"];
              setFields((v) => ({ ...v, kind }));
            }}
          >
            <option value="">Escolha o tipo</option>
            <option value="consumption">Consumo extraordinário</option>
            <option value="shortage">Falta de material</option>
          </SelectField>
        </FormField>
      ) : null}
      {!report && !review && !uncertain ? (
        <FormField label="Custódia" htmlFor="consumption-custody">
          <SelectField
            id="consumption-custody"
            value={chosenCustody ? fields.location : ""}
            disabled={
              Boolean(
                fields.reminderId ||
                  draft.base ||
                  draft.offered ||
                  draft.pending,
              ) ||
              busy ||
              review ||
              uncertain
            }
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (value !== "FAMILY" && value !== "CARE_TEAM") return;
              automaticRef.current = true;
              savedWithoutReferenceRef.current = false;
              setReference(null);
              setReferenceHash(null);
              setChosenCustody(true);
              setFields((v) => ({ ...v, location: value }));
            }}
          >
            <option value="">Escolha a custódia</option>
            {can(context, "stock.team.read") ? (
              <option value="CARE_TEAM">Equipe</option>
            ) : null}
            {can(context, "stock.family.read") ? (
              <option value="FAMILY">Família</option>
            ) : null}
          </SelectField>
        </FormField>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      <CreationDraftPanel
        draft={draft}
        current={protectedView ? null : content}
        patientName={patient.display_name}
        disabled={busy}
        acknowledgeLabel={
          canWrite
            ? "Confirmar resultado e começar novo preenchimento"
            : "Reconhecer resultado preservado"
        }
        discardLabel={
          canWrite
            ? "Descartar e começar nova"
            : "Descartar este preenchimento privado"
        }
      />
      {protectedView ? (
        <Notice>
          Revalide o acesso antes de exibir o preenchimento preservado.
          <ActionButton
            disabled={busy}
            onClick={async () => {
              if (await draft.revalidateRead()) {
                setSourceDenied(false);
                setAttempt((n) => n + 1);
              }
            }}
          >
            Revalidar acesso ao relato
          </ActionButton>
        </Notice>
      ) : null}
      {uncertain && (!ready || !review) ? (
        <>
          <Notice>
            O resultado ainda não foi confirmado. O conteúdo e a chave estão
            preservados; recupere esta tentativa antes de editar ou fechar.
          </Notice>
          <ActionButton
            disabled={busy || draft.loading}
            onClick={() => void send()}
          >
            {decision ? "Recuperar decisão" : "Recuperar tentativa"}
          </ActionButton>
        </>
      ) : null}
      {ready ? (
        <>
          {sourceError ? (
            <Notice error>
              Não foi possível consultar a referência atual. {sourceError}
            </Notice>
          ) : null}
          <div className="hca-toolbar">
            <ActionButton
              disabled={busy || !patientActive}
              onClick={() => setAttempt((n) => n + 1)}
            >
              {decision
                ? "Consultar decisão e versão atuais"
                : report
                  ? "Consultar versão atual do relato"
                  : "Atualizar referência dos materiais"}
            </ActionButton>
          </div>
          {fields.reminderId ? (
            <section aria-label="Origem preservada do relato">
              <h3>Lembrete de origem</h3>
              <p>
                Referência: {fields.reminderId}. O relato registra sua
                declaração atual, sem comprovar presença no plantão.
              </p>
              <p>
                Custódia: equipe. A referência não pode ser trocada neste
                preenchimento.
              </p>
            </section>
          ) : null}
          {source ? (
            <section aria-label="Referência preservada do relato">
              <h3>Referência preservada · versão {source.version}</h3>
              <p className="whitespace-pre-wrap wrap-break-word">
                {source.body}
              </p>
              <ConsumptionLines lines={source.lines} />
              {source.lastSupplement ? (
                <p className="whitespace-pre-wrap wrap-break-word">
                  Último complemento:{" "}
                  {source.lastSupplement.actor_name ?? "Nome não preservado"} ·{" "}
                  {source.lastSupplement.body}
                </p>
              ) : null}
            </section>
          ) : null}
          {stale && current ? (
            <section
              className="ui-card hca-form-stack"
              aria-label="Comparação de referência do relato"
            >
              <h3>Referência preservada e atual</h3>
              {current.reference.report?.status !== undefined &&
              current.reference.report.status !== "reported" ? (
                <Notice>
                  Outro responsável já decidiu esta versão. Consulte o relato e
                  a decisão registrada antes de continuar.
                </Notice>
              ) : source &&
                current.reference.report &&
                source.version !== current.reference.report.version ? (
                <Notice>
                  O relato recebeu um complemento. Consulte a versão atual e
                  revise seu conteúdo antes de decidir.
                </Notice>
              ) : null}
              <DefinitionGrid
                items={[
                  {
                    label: "Versão preservada",
                    value: source?.version ?? "Sem relato oficial como base",
                  },
                  {
                    label: "Versão atual",
                    value: current.reference.report?.version ?? "Novo relato",
                  },
                  {
                    label: "Situação atual",
                    value:
                      current.reference.report?.status === "reported"
                        ? "Aguardando conferência"
                        : current.reference.report?.status === "confirmed"
                          ? "Confirmado"
                          : current.reference.report?.status === "rejected"
                            ? "Rejeitado"
                            : "Referência dos materiais",
                  },
                ]}
              />
              {current.reference.report ? (
                <>
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {current.reference.report.lastSupplement?.body ??
                      current.reference.report.body}
                  </p>
                  <ConsumptionLines lines={current.reference.report.lines} />
                </>
              ) : null}
              {!current.reference.report ||
              current.reference.report.status === "reported" ? (
                <ActionButton disabled={blocked} onClick={adopt}>
                  {decision
                    ? "Revisar versão atual"
                    : "Usar referência atual e revisar complemento"}
                </ActionButton>
              ) : (
                <>
                  <Notice>
                    Este relato já foi decidido. Consulte o resultado; novos
                    esclarecimentos não substituem essa decisão.
                  </Notice>
                  <ActionButton onClick={() => void openCurrentResult()}>
                    Abrir resultado registrado
                  </ActionButton>
                </>
              )}
            </section>
          ) : null}
          {review ? (
            <section
              className="hca-form-stack"
              aria-label={decision ? "Revisão da decisão" : "Revisão do relato"}
            >
              <h3 tabIndex={-1} ref={headingRef}>
                {decision
                  ? "Resumo da decisão"
                  : report
                    ? "Revisar complemento"
                    : "Revisar novo relato"}
              </h3>
              <DraftContentSummary
                kind="CONSUMPTION"
                purpose={purpose}
                content={content}
              />
              <Notice>
                {decision
                  ? !accept
                    ? "Rejeitar preserva o relato e os complementos, sem movimentar o estoque."
                    : source?.kind === "shortage"
                      ? "Confirmar esta falta registra a conferência da necessidade, sem descontar estoque."
                      : `Confirmar desconta somente as quantidades estruturadas acima da custódia ${fields.location === "FAMILY" ? "Família" : "Equipe"}. O débito fica vinculado a esta versão.`
                  : "Relato e complemento não descontam estoque."}
              </Notice>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={busy || uncertain}
                  onClick={() => {
                    setReview(false);
                    setPacket(null);
                    requestAnimationFrame(() =>
                      decision
                        ? reasonRef.current?.focus()
                        : textRef.current?.focus(),
                    );
                  }}
                >
                  {decision ? "Voltar sem decidir" : "Voltar à edição"}
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={
                    busy || (!uncertain && (stale || !canWrite || !packet))
                  }
                  onClick={() => void send()}
                >
                  {uncertain
                    ? decision
                      ? "Recuperar decisão"
                      : "Recuperar tentativa"
                    : decision
                      ? accept
                        ? source?.kind === "shortage"
                          ? "Confirmar falta sem desconto"
                          : "Confirmar consumo e descontar"
                        : "Confirmar rejeição sem desconto"
                      : report
                        ? "Salvar complemento sem desconto"
                        : "Registrar relato sem desconto"}
                </ActionButton>
              </div>
            </section>
          ) : (
            <form
              ref={formRef}
              className="hca-form-stack"
              onSubmit={(e) => void prepare(e)}
            >
              {!report ? (
                <FormField
                  label="Tipo"
                  htmlFor="consumption-kind"
                  error={fieldErrors.kind}
                >
                  <SelectField
                    id="consumption-kind"
                    name="kind"
                    value={fields.kind}
                    onChange={(e) => {
                      const kind = e.currentTarget
                        .value as ConsumptionPreparationFields["kind"];
                      setFields((v) => ({ ...v, kind }));
                    }}
                    disabled={!canWrite || busy || draft.busy || uncertain}
                  >
                    <option value="">Escolha o tipo</option>
                    <option value="consumption">Consumo extraordinário</option>
                    <option value="shortage">Falta de material</option>
                  </SelectField>
                </FormField>
              ) : null}
              {!decision ? (
                <>
                  <FormField
                    label={
                      report
                        ? "Esclarecimento do complemento"
                        : "O que aconteceu?"
                    }
                    htmlFor="consumption-text"
                    error={fieldErrors.text}
                    helpText={`${fields.text.length}/2000 caracteres. Relato e complemento não movimentam estoque.`}
                  >
                    <TextAreaField
                      id="consumption-text"
                      name="text"
                      ref={textRef}
                      rows={3}
                      maxLength={2000}
                      value={fields.text}
                      disabled={!canWrite || busy || draft.busy || uncertain}
                      onChange={(e) => {
                        const text = e.currentTarget.value;
                        setFields((v) => ({ ...v, text }));
                      }}
                    />
                  </FormField>
                  {catalogError ? (
                    <Notice error>
                      {catalogError}
                      <ActionButton onClick={onCatalogRetry}>
                        Atualizar materiais
                      </ActionButton>
                    </Notice>
                  ) : null}
                  <FormField
                    label="Adicionar material"
                    htmlFor="consumption-material"
                  >
                    <SearchSelect
                      id="consumption-material"
                      triggerLabel="Abrir ou fechar opções de material"
                      query={search}
                      selectedIds={[]}
                      placeholder="Busque e selecione um material"
                      disabled={
                        !canWrite ||
                        busy ||
                        draft.busy ||
                        uncertain ||
                        catalogLoading ||
                        Boolean(catalogError) ||
                        fields.lines.length >= 100
                      }
                      onQueryChange={setSearch}
                      onSelectionChange={(ids) => {
                        const p = products.find((p) => p.id === ids[0]);
                        if (!p) return;
                        setFields((v) => ({
                          ...v,
                          lines: [
                            ...v.lines,
                            {
                              productId: p.id,
                              name: p.name,
                              unit: p.unit,
                              quantity: "",
                            },
                          ],
                        }));
                        setSearch("");
                      }}
                      options={products
                        .filter(
                          (p) =>
                            !fields.lines.some((l) => l.productId === p.id) &&
                            (p.name + " " + (p.aliases ?? []).join(" "))
                              .toLocaleLowerCase("pt-BR")
                              .includes(search.toLocaleLowerCase("pt-BR")),
                        )
                        .slice(0, 20)
                        .map((p) => ({
                          value: p.id,
                          label: p.name,
                          content: (
                            <>
                              {p.name} · {p.unit}
                            </>
                          ),
                        }))}
                    />
                  </FormField>
                  <p>
                    O texto livre pode ser registrado sem quantidade. Para
                    confirmar consumo, inclua materiais e quantidades exatas.
                    Materiais inativos só podem consumir saldo existente.
                  </p>
                  {fields.lines.map((l) => (
                    <section key={l.productId}>
                      <FormField
                        label={`${l.name} · quantidade em ${l.unit}`}
                        htmlFor={l.productId}
                        error={fieldErrors[l.productId]}
                        helpText={`Quantidade positiva; até ${current?.reference.catalog.find((p) => p.id === l.productId)?.decimals ?? 6} casas decimais. Aceita vírgula ou ponto.`}
                      >
                        <TextInput
                          id={l.productId}
                          name={l.productId}
                          inputMode="decimal"
                          maxLength={64}
                          value={l.quantity}
                          disabled={
                            !canWrite || busy || draft.busy || uncertain
                          }
                          onChange={(e) => {
                            const quantity = e.currentTarget.value;
                            setFields((v) => ({
                              ...v,
                              lines: v.lines.map((x) =>
                                x.productId === l.productId
                                  ? { ...x, quantity }
                                  : x,
                              ),
                            }));
                          }}
                        />
                      </FormField>
                      <ActionButton
                        disabled={!canWrite || busy || draft.busy || uncertain}
                        onClick={() =>
                          setFields((v) => ({
                            ...v,
                            lines: v.lines.filter(
                              (x) => x.productId !== l.productId,
                            ),
                          }))
                        }
                      >
                        Retirar {l.name}
                      </ActionButton>
                    </section>
                  ))}
                </>
              ) : !accept ? (
                <FormField
                  label="Motivo da rejeição"
                  htmlFor="consumption-reason"
                  error={fieldErrors.reason}
                  helpText={`${fields.reason.length}/1000 caracteres. O original permanece íntegro.`}
                >
                  <TextAreaField
                    id="consumption-reason"
                    name="reason"
                    ref={reasonRef}
                    rows={3}
                    maxLength={1000}
                    value={fields.reason}
                    disabled={!canWrite || busy || draft.busy || uncertain}
                    onChange={(e) => {
                      const reason = e.currentTarget.value;
                      setFields((v) => ({ ...v, reason }));
                    }}
                  />
                </FormField>
              ) : (
                <Notice>
                  Revise a estrutura preservada antes de confirmar. Nenhuma
                  quantidade ou observação será alterada por esta conferência.
                </Notice>
              )}
              {!canWrite ? (
                <Notice>
                  Você pode consultar e recuperar seu preenchimento autorizado.
                  Uma nova confirmação exige a permissão de escrita e paciente
                  ativo.
                </Notice>
              ) : null}
              <div className="hca-toolbar">
                <ActionButton
                  type="button"
                  disabled={blocked}
                  onClick={() => void save()}
                >
                  Salvar preenchimento privado
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={blocked || stale}
                >
                  {uncertain
                    ? decision
                      ? "Recuperar decisão"
                      : "Recuperar tentativa"
                    : decision
                      ? accept
                        ? "Revisar confirmação"
                        : "Revisar rejeição"
                      : report
                        ? "Revisar complemento"
                        : "Revisar relato"}
                </ActionButton>
              </div>
            </form>
          )}
        </>
      ) : null}
    </RecordDrawer>
  );
}
