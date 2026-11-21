"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import {
  ActionButton,
  CheckboxField,
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import { quantity } from "@/lib/quantity";
import { exactQuantity } from "@/lib/validation/exact-quantity";
import {
  flowNativeCommand,
  flowPreparationContentSchema,
  flowPreparationCommitSchema,
  flowPreparationPendingSchema,
  flowPendingConfirmedByRead,
  flowPendingEnvelopeMatches,
  parseFlowPreparationConfirmation,
  parseFlowPreparationReference,
  type FlowPreparationReference,
  type FlowPreparationCommit,
  type FlowReviewFields,
} from "@/lib/validation/flow-preparations";
import type { FlowSubmission } from "@/lib/validation/flow-reviews";
import type { CatalogProduct } from "@/types/documents";
import { FlowPreparationSummary } from "./flow-preparation-summary";

export function FlowReviewPreparation({
  context,
  target,
  source,
  initialAccept = true,
  products,
  onClose,
  onSaved,
  restoreFocusTo,
  restoreFocusFallbackRef,
}: {
  context: WorkspaceContext;
  target: string;
  source?: FlowSubmission;
  initialAccept?: boolean;
  products: CatalogProduct[];
  onClose: () => void;
  onSaved: () => void;
  restoreFocusTo?: HTMLElement | null;
  restoreFocusFallbackRef?: RefObject<HTMLElement | null>;
}) {
  const patient = context.patient!,
    patientId = patient.id,
    canWrite =
      can(context, "consumption.report") &&
      patient.is_active !== false &&
      patient.active !== false;
  const [fields, setFields] = useState<FlowReviewFields>(() => ({
    accept: initialAccept,
    kind: source?.body.kind === "shortage" ? "shortage" : "consumption",
    text: source?.body.text ?? "",
    lines: [...new Set(source?.body.products ?? [])].map((id) => {
      const p = products.find((p) => p.id === id);
      return {
        productId: id,
        name: p?.name ?? id,
        unit: p?.unit ?? "",
        quantity: "",
      };
    }),
  }));
  const [reference, setReference] = useState<FlowPreparationReference | null>(
      null,
    ),
    [referenceHash, setReferenceHash] = useState<string | null>(null),
    [current, setCurrent] = useState<{
      reference: FlowPreparationReference;
      referenceHash: string;
    } | null>(null);
  const [attempt, setAttempt] = useState(0),
    [sourceError, setSourceError] = useState(""),
    [deniedReferenceKey, setDeniedReferenceKey] = useState<string | null>(null),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [packet, setPacket] = useState<FlowPreparationCommit | null>(null),
    [reconciled, setReconciled] = useState(false);
  const automaticRef = useRef(true),
    savedNullRef = useRef(false),
    pendingRef = useRef<FlowPreparationCommit | null>(null),
    formRef = useRef<HTMLFormElement>(null),
    headingRef = useRef<HTMLHeadingElement>(null),
    mountedRef = useRef(true);
  const storageKey = `hca:flow-preparation-confirmation:${context.userId}:${patientId}:${target}`;
  const draft = useCreationDraft({
    userId: context.userId,
    patientId,
    kind: "FLOW",
    purpose: "flow_review",
    targetResourceId: target,
    targetDocumentId: null,
    readScopeRevision: JSON.stringify([
      patient.capabilities,
      patient.is_active,
      patient.active,
    ]),
    navigation: navigationForStep("FLOW", 0),
    onResume: (row) => {
      const v = flowPreparationContentSchema.safeParse(row.content);
      if (!v.success) return false;
      automaticRef.current = false;
      savedNullRef.current = v.data.reference === null;
      setFields(v.data.review);
      setReference(v.data.reference);
      setReferenceHash(v.data.referenceHash);
      setReviewing(false);
      setAttempt((n) => n + 1);
      return true;
    },
    onDiscard: onClose,
  });
  const protectedView =
    draft.loading ||
    Boolean(draft.loadError) ||
    draft.readDenied ||
    draft.protectedReadPending;
  const content = { review: fields, reference, referenceHash },
    sourceFields = JSON.stringify({
      ...fields,
      kind: "",
      text: "",
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
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          v = raw
            ? flowPreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          v?.success &&
          v.data.userId === context.userId &&
          v.data.packet.careRecipientId === patientId &&
          v.data.packet.targetResourceId === target
        ) {
          pendingRef.current = v.data.packet;
          setPacket(v.data.packet);
          setUncertain(true);
          automaticRef.current = false;
        }
      } catch {
        /* Optional local state never grants authority. */
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, context.userId, patientId, target]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (
        !active ||
        protectedView ||
        !packet ||
        !flowPendingConfirmedByRead(draft.consumed, packet, context.userId)
      )
        return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          stored = raw
            ? flowPreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          stored?.success &&
          stored.data.userId === context.userId &&
          stored.data.packet.careRecipientId === patientId &&
          stored.data.packet.targetResourceId === target &&
          !flowPendingEnvelopeMatches(stored.data, packet, context.userId)
        ) {
          pendingRef.current = stored.data.packet;
          setPacket(stored.data.packet);
          setUncertain(true);
          setReviewing(false);
          return;
        }
        if (
          !raw ||
          flowPendingEnvelopeMatches(JSON.parse(raw), packet, context.userId)
        )
          sessionStorage.removeItem(storageKey);
      } catch {
        /* Keep the authoritative receipt if optional cleanup is unavailable. */
      }
      pendingRef.current = null;
      setPacket(null);
      setUncertain(false);
      setReviewing(false);
      setReconciled(true);
    });
    return () => {
      active = false;
    };
  }, [
    draft.consumed,
    protectedView,
    packet,
    context.userId,
    storageKey,
    patientId,
    target,
  ]);
  const sourceRequestKey = JSON.stringify([
    sourceFields,
    attempt,
    patient.capabilities,
  ]);
  const revalidateOwnRead = useEffectEvent(() => draft.revalidateRead());
  useEffect(() => {
    if (
      deniedReferenceKey === sourceRequestKey ||
      !canWrite ||
      protectedView ||
      draft.offered ||
      draft.pending ||
      draft.consumed ||
      uncertain
    )
      return;
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setSourceError("");
      setCurrent(null);
      try {
        const v = await api<{ data: unknown }>(
            "/api/whatsapp/flows/preparations/reference",
            {
              careRecipientId: patientId,
              purpose: "flow_review",
              targetResourceId: target,
              fields: JSON.parse(sourceFields),
            },
            controller.signal,
          ),
          next = parseFlowPreparationReference(v.data, {
            userId: context.userId,
            patientId,
            purpose: "flow_review",
            targetResourceId: target,
          });
        if (!active) return;
        setCurrent(next);
        if (automaticRef.current && !savedNullRef.current) {
          setReference(next.reference);
          setReferenceHash(next.referenceHash);
        }
      } catch (cause) {
        if (active) {
          setSourceError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a sugestão. Atualize a consulta; ela não confirma uma revisão.",
          );
          if (
            cause instanceof ApiError &&
            [401, 403, 404].includes(cause.status)
          ) {
            setDeniedReferenceKey(sourceRequestKey);
            void revalidateOwnRead();
          }
        }
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    canWrite,
    protectedView,
    draft.offered,
    draft.pending,
    draft.consumed,
    deniedReferenceKey,
    sourceRequestKey,
    uncertain,
    patientId,
    target,
    context.userId,
    sourceFields,
    attempt,
  ]);
  useEffect(() => {
    if (reviewing) headingRef.current?.focus();
  }, [reviewing]);
  const blocked = busy || draft.busy || draft.blocked || uncertain,
    ready =
      !protectedView &&
      !draft.offered &&
      !draft.pending &&
      !draft.consumed &&
      !draft.conflict,
    stale =
      !referenceHash ||
      referenceHash !== current?.referenceHash ||
      (fields.accept &&
        fields.lines.some(
          (l) =>
            !reference?.catalog.some(
              (c) =>
                c.id === l.productId && c.name === l.name && c.unit === l.unit,
            ),
        )),
    terminal = current?.reference.suggestion.status !== "pending_confirmation";
  async function save() {
    automaticRef.current = false;
    if (!reference) savedNullRef.current = true;
    return draft.save(content);
  }
  function adopt() {
    if (!current) return;
    automaticRef.current = false;
    savedNullRef.current = false;
    setReference(current.reference);
    setReferenceHash(current.referenceHash);
    setFields((v) => ({
      ...v,
      lines: v.lines.map((l) => {
        const c = current.reference.catalog.find((c) => c.id === l.productId);
        return c ? { ...l, name: c.name, unit: c.unit } : l;
      }),
    }));
    setReviewing(false);
    setPacket(null);
    setError("");
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !canWrite) return;
    const invalid: Record<string, string> = {};
    let command;
    try {
      command = flowNativeCommand(fields, target);
    } catch {
      /* Field-level validation below retains the original values. */
    }
    if (fields.accept) {
      if (!fields.kind) invalid.kind = "Escolha o tipo do relato.";
      if (fields.text.trim().length < 3 || fields.text.length > 2000)
        invalid.text =
          "Descreva o fato com pelo menos três e até 2000 caracteres.";
      for (const line of fields.lines) {
        const value = exactQuantity.safeParse(line.quantity),
          c = reference?.catalog.find((c) => c.id === line.productId);
        if (
          !value.success ||
          !c ||
          !quantity(value.data).gt(0) ||
          quantity(value.data).decimalPlaces() > c.decimals
        )
          invalid["quantity:" + line.productId] =
            "Confira a quantidade e a precisão deste material.";
      }
    }
    setErrors(invalid);
    if (Object.keys(invalid).length || !command) {
      setError("Confira os campos indicados, sem apagar os demais valores.");
      requestAnimationFrame(() => {
        const el = formRef.current?.elements.namedItem(
          Object.keys(invalid)[0] ?? "kind",
        );
        if (el instanceof HTMLElement) el.focus();
      });
      return;
    }
    if (stale || !referenceHash || terminal) {
      setError(
        "Consulte e adote explicitamente a sugestão atual antes de revisar.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await save();
      if (saved) {
        setPacket(
          flowPreparationCommitSchema.parse({
            careRecipientId: patientId,
            purpose: "flow_review",
            targetResourceId: target,
            draftCommit: { id: saved.id, revision: saved.revision },
            idempotencyKey: crypto.randomUUID(),
            referenceHash,
            command,
          }),
        );
        setReviewing(true);
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  function clearEnvelope(original: FlowPreparationCommit) {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (
        raw &&
        flowPendingEnvelopeMatches(JSON.parse(raw), original, context.userId)
      )
        sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional storage does not establish the result. */
    }
  }
  async function send() {
    const original = pendingRef.current ?? packet;
    if (!original) return;
    const wasUncertain = uncertain;
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
      /* In-memory recovery remains available. */
    }
    setBusy(true);
    setError("");
    try {
      const value = await api<{ data: unknown }>(
        "/api/whatsapp/flows/preparations/commit",
        original,
      );
      parseFlowPreparationConfirmation(value.data, original, context.userId);
      clearEnvelope(original);
      pendingRef.current = null;
      if (mountedRef.current) {
        setUncertain(false);
        setPacket(null);
        setReviewing(false);
        onSaved();
      }
    } catch (cause) {
      const definitive =
        !wasUncertain &&
        cause instanceof ApiError &&
        [400, 401, 403, 404, 409, 422].includes(cause.status);
      if (definitive) {
        clearEnvelope(original);
        pendingRef.current = null;
        setPacket(null);
        setReviewing(false);
        setAttempt((n) => n + 1);
        await draft.revalidateRead();
      }
      setUncertain(!definitive);
      setError(
        cause instanceof Error
          ? cause.message
          : "O resultado ainda não foi confirmado. Recupere a mesma revisão.",
      );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }
  const visibleProducts = [
    ...products,
    ...fields.lines
      .filter((l) => !products.some((p) => p.id === l.productId))
      .map((l) => ({ id: l.productId, name: l.name, unit: l.unit })),
  ];
  return (
    <RecordDrawer
      title="Revisão do Flow"
      onClose={onClose}
      restoreFocusTo={restoreFocusTo}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      busy={busy || draft.busy}
      preventClose={uncertain || Boolean(draft.pending)}
      hasUnsavedChanges={
        reviewing || draft.consumed
          ? false
          : draft.base?.state === "active"
            ? JSON.stringify(content) !== JSON.stringify(draft.base.content)
            : undefined
      }
    >
      <div className="hca-form-stack">
        {error ? <Notice error>{error}</Notice> : null}
        {reconciled ? (
          <Notice>
            A tentativa preservada foi conferida pelo resultado pessoal já
            registrado. Nenhum novo envio foi realizado.
          </Notice>
        ) : null}
        <ActionButton disabled={busy || draft.busy} onClick={draft.reload}>
          Atualizar preenchimento pessoal
        </ActionButton>
        <CreationDraftPanel
          draft={draft}
          current={canWrite && !protectedView ? content : null}
          patientName={patient.display_name}
          disabled={busy || reviewing || Boolean(packet) || uncertain}
          resumeLabel="Continuar revisão do Flow"
          acknowledgeLabel="Reconhecer resultado do Flow"
          discardLabel="Descartar preenchimento da revisão"
        />
        {uncertain && !protectedView ? (
          <section
            className="hca-form-stack"
            aria-label="Tentativa preservada do Flow"
          >
            <Notice>
              A resposta ainda não foi confirmada. Recupere o mesmo envio antes
              de editar ou fechar.
            </Notice>
            {packet ? (
              <p className="whitespace-pre-wrap wrap-anywhere">
                {packet.command.accept
                  ? packet.command.text
                  : "Descarte da sugestão preservado."}
              </p>
            ) : null}
            <ActionButton
              disabled={busy || draft.loading}
              onClick={() => void send()}
            >
              Recuperar revisão
            </ActionButton>
          </section>
        ) : null}
        {ready && !uncertain ? (
          reviewing ? (
            <section
              className="hca-form-stack"
              aria-label="Conferência da revisão do Flow"
            >
              <h3 ref={headingRef} tabIndex={-1}>
                Registrar dados conferidos do Flow
              </h3>
              <FlowPreparationSummary content={content} />
              <Notice>
                {fields.accept
                  ? "A revisão cria um relato pendente. O estoque só muda após a confirmação de uma pessoa autorizada."
                  : "Descartar a sugestão não cria relato nem movimentação de estoque."}
              </Notice>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={busy}
                  onClick={() => {
                    setReviewing(false);
                    setPacket(null);
                  }}
                >
                  Voltar
                </ActionButton>
                <ActionButton
                  variant="primary"
                  disabled={busy || !canWrite}
                  onClick={() => void send()}
                >
                  {fields.accept
                    ? "Confirmar relato conferido"
                    : "Confirmar descarte da sugestão"}
                </ActionButton>
              </div>
            </section>
          ) : (
            <form
              ref={formRef}
              onSubmit={(event) => void prepare(event)}
              noValidate
              className="hca-form-stack"
            >
              {sourceError ? (
                <Notice error>
                  Não foi possível consultar a sugestão atual. {sourceError}
                </Notice>
              ) : null}
              {!canWrite ? (
                <Notice>
                  A revisão preservada continua disponível. Novas confirmações
                  exigem autorização atual e paciente ativo.
                </Notice>
              ) : null}
              <ActionButton
                disabled={busy || !canWrite}
                onClick={() => setAttempt((n) => n + 1)}
              >
                Consultar versão atual da sugestão
              </ActionButton>
              {reference ? (
                <section aria-label="Origem da revisão">
                  <h3>Sugestão recebida</h3>
                  <p className="whitespace-pre-wrap wrap-anywhere">
                    {typeof reference.suggestion.body.text === "string"
                      ? reference.suggestion.body.text
                      : "Sem descrição textual recebida."}
                  </p>
                </section>
              ) : null}
              {current && stale ? (
                <div className="hca-attention">
                  <p>
                    {reference
                      ? "A sugestão ou os materiais atuais diferem da referência preservada. Compare antes de continuar."
                      : "Este preenchimento ainda não tem referência preservada. A consulta não altera sua declaração."}
                  </p>
                  <FlowPreparationSummary
                    content={{
                      review: fields,
                      reference: current.reference,
                      referenceHash: current.referenceHash,
                    }}
                  />
                  <ActionButton disabled={blocked} onClick={adopt}>
                    Usar referência atual sem trocar minha declaração
                  </ActionButton>
                </div>
              ) : null}
              {current && terminal ? (
                <Notice>
                  A sugestão já foi revisada. Você pode consultar ou descartar
                  seu preenchimento privado; uma nova confirmação permanece
                  bloqueada.
                </Notice>
              ) : null}
              <fieldset
                disabled={blocked || !canWrite}
                className="hca-form-stack"
              >
                <FormField label="Decisão da revisão">
                  <SelectField
                    value={fields.accept ? "accept" : "reject"}
                    onChange={(e) => {
                      const accept = e.currentTarget.value === "accept";
                      setFields((v) => ({ ...v, accept }));
                    }}
                  >
                    <option value="accept">
                      Registrar os dados conferidos
                    </option>
                    <option value="reject">Descartar sugestão</option>
                  </SelectField>
                </FormField>
                {fields.accept ? (
                  <>
                    <FormField label="Tipo do relato" error={errors.kind}>
                      <SelectField
                        name="kind"
                        value={fields.kind}
                        onChange={(e) => {
                          const kind = e.currentTarget
                            .value as FlowReviewFields["kind"];
                          setFields((v) => ({ ...v, kind }));
                        }}
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="consumption">
                          Consumo extraordinário
                        </option>
                        <option value="shortage">Falta de material</option>
                      </SelectField>
                    </FormField>
                    <FormField
                      label="Descrição conferida"
                      error={errors.text}
                      helpText="Confira o texto recebido. Sua declaração será preservada separadamente da sugestão original."
                    >
                      <TextAreaField
                        name="text"
                        rows={4}
                        maxLength={2000}
                        value={fields.text}
                        onChange={(e) => {
                          const text = e.currentTarget.value;
                          setFields((v) => ({ ...v, text }));
                        }}
                      />
                    </FormField>
                    <section aria-label="Materiais conferidos do Flow">
                      <h3>Materiais e quantidades conferidos</h3>
                      {visibleProducts.map((p) => {
                        const line = fields.lines.find(
                          (l) => l.productId === p.id,
                        );
                        return (
                          <div className="hca-record hca-form-stack" key={p.id}>
                            <CheckboxField
                              label={p.name}
                              checked={Boolean(line)}
                              onChange={(e) => {
                                const checked = e.currentTarget.checked;
                                setFields((v) => ({
                                  ...v,
                                  lines: checked
                                    ? [
                                        ...v.lines,
                                        {
                                          productId: p.id,
                                          name: p.name,
                                          unit: p.unit,
                                          quantity: "",
                                        },
                                      ]
                                    : v.lines.filter(
                                        (l) => l.productId !== p.id,
                                      ),
                                }));
                              }}
                            />
                            {line ? (
                              <FormField
                                label={
                                  "Quantidade conferida · " +
                                  p.name +
                                  " · " +
                                  line.unit
                                }
                                error={errors["quantity:" + p.id]}
                              >
                                <TextInput
                                  name={"quantity:" + p.id}
                                  inputMode="decimal"
                                  maxLength={64}
                                  value={line.quantity}
                                  onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setFields((v) => ({
                                      ...v,
                                      lines: v.lines.map((l) =>
                                        l.productId === p.id
                                          ? { ...l, quantity: value }
                                          : l,
                                      ),
                                    }));
                                  }}
                                />
                              </FormField>
                            ) : null}
                          </div>
                        );
                      })}
                    </section>
                  </>
                ) : (
                  <Notice>
                    O descarte será confirmado após a revisão. Os campos de
                    registro preservados não serão enviados.
                  </Notice>
                )}
              </fieldset>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={blocked || !canWrite}
                  onClick={() => void save()}
                >
                  Salvar preenchimento privado
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={blocked || !canWrite || stale || terminal}
                >
                  {fields.accept
                    ? "Revisar e registrar relato"
                    : "Revisar descarte da sugestão"}
                </ActionButton>
              </div>
            </form>
          )
        ) : null}
      </div>
    </RecordDrawer>
  );
}
