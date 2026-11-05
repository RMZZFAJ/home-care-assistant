"use client";
import { DocumentActions } from "./document-actions";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { WizardActions } from "@/components/forms/wizard-actions";
import { StepNavigator, Icon } from "@/components/ui/primitives";
import { SupplyWizardStep, type WizardState } from "./supply-wizard-step";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import {
  documentLabels,
  type CatalogProduct,
  type DraftLine,
  type PatientPerson,
  type SupplyDocument,
  type SupplyPayload,
  type SupplyType,
  type ItemContext,
  type DeliveryPreparation,
} from "@/types/documents";

const steps = [
  "Identificação",
  "Medicamentos",
  "Higiene",
  "Dieta",
  "Observações",
  "Revisão",
];
type SourceRequest = {
  care_recipient_id: string;
  is_historical?: boolean;
  requisition_items: {
    id: string;
    product_id: string | null;
    resolution?: { product_id: string } | null;
  }[];
};
export function SupplyWizard({ type }: { type: SupplyType }) {
  const params = useSearchParams();
  return (
    <Workspace title={documentLabels[type]} compact>
      {(context) => {
        if (!context.patient)
          return <Notice>Selecione um paciente para abrir uma ficha.</Notice>;
        const wizard = (
          <PatientSupplyWizard
            key={context.patient.id + params.toString()}
            context={context}
            type={type}
            requisitionId={params.get("requisitionId")}
            documentId={params.get("documentId")}
            recount={params.get("recount") === "true"}
          />
        );
        const requisitionId = params.get("requisitionId");
        return requisitionId ? (
          <RequisitionOpening
            key={context.patient.id + params.toString()}
            id={requisitionId}
          >
            {wizard}
          </RequisitionOpening>
        ) : (
          wizard
        );
      }}
    </Workspace>
  );
}
export function PatientSupplyWizard({
  context,
  type,
  requisitionId,
  documentId,
  recount,
}: {
  context: WorkspaceContext;
  type: SupplyType;
  requisitionId: string | null;
  documentId: string | null;
  recount: boolean;
}) {
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [people, setPeople] = useState<PatientPerson[]>([]);
  const [recipientContext, setRecipientContext] =
    useState<DeliveryPreparation | null>(null);
  const recipientContextRef = useRef<DeliveryPreparation | null>(null);
  const [recipientComparison, setRecipientComparison] =
    useState<DeliveryPreparation | null>(null);
  const [recipientError, setRecipientError] = useState("");
  const [recipientPending, setRecipientPending] = useState(false);
  const [recipientLoadedSource, setRecipientLoadedSource] = useState("");
  const [recipientAttempt, setRecipientAttempt] = useState(0);
  const [form, setForm] = useState<WizardState>({
    quantities: {},
    notes: "",
    origin: "",
    source: "FAMILY",
    recipientId: "",
    recipientReason: "",
  });
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [requestOptions, setRequestOptions] = useState<ItemContext[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<SupplyDocument | null>(null);
  const [saved, setSaved] = useState<SupplyDocument | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frozenRef = useRef<{
    payload: SupplyPayload;
    key: string;
    draft: boolean;
    submissionKey: string;
    expectedVersion?: number;
  } | null>(null);
  const storageKey =
    "hca:v2:draft:" +
    type +
    ":" +
    context.userId +
    ":" +
    context.patient!.id +
    ":" +
    (documentId ?? "new") +
    ":" +
    (requisitionId ?? "standalone") +
    ":" +
    (recount ? "recount" : "edit");
  const canReadRequests = can(context, "req.read");
  const allowed = can(
    context,
    type === "BAL" ? "bal.count" : type.toLowerCase() + ".create",
  );
  const patientId = context.patient!.id;
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<{ data: CatalogProduct[] }>(
        "/api/catalog?careRecipientId=" + patientId,
        undefined,
        controller.signal,
      ),
      api<{ directory: PatientPerson[] }>(
        "/api/patient-settings?careRecipientId=" + patientId,
        undefined,
        controller.signal,
      ),
      requisitionId
        ? api<{ data: SourceRequest }>(
            "/api/requisitions/" + requisitionId,
            undefined,
            controller.signal,
          )
        : Promise.resolve(null),
    ])
      .then(async ([products, settings, source]) => {
        if (controller.signal.aborted) return;
        if (source?.data.is_historical)
          throw new Error(
            "Esta requisição histórica é somente consulta. Registre uma nova necessidade ou prepare uma ficha avulsa para o ato atual.",
          );
        setCatalog(products.data);
        setPeople(settings.directory);
        if (type !== "BAL" && canReadRequests) {
          const options = await api<{ data: ItemContext[] }>(
            "/api/requisitions/item-context?careRecipientId=" +
              patientId +
              "&productIds=" +
              products.data
                .map((product) => encodeURIComponent(product.id))
                .join(","),
            undefined,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setRequestOptions(options.data);
        }
        if (source && source.data.care_recipient_id !== patientId)
          throw new Error(
            "A requisição pertence a outro paciente. Selecione o contexto correspondente.",
          );
        const sourceLinks: Record<string, string[]> = {};
        for (const item of source?.data.requisition_items ?? []) {
          const productId = item.product_id ?? item.resolution?.product_id;
          if (productId) (sourceLinks[productId] ??= []).push(item.id);
        }
        setLinks(sourceLinks);
        let restored: WizardState | undefined;
        let preserved: typeof frozenRef.current = null;
        let recoveredId: string | undefined;
        try {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) {
            const envelope = JSON.parse(raw);
            if (
              Date.now() - envelope.savedAt < 86_400_000 &&
              envelope.form &&
              typeof envelope.form.quantities === "object"
            ) {
              restored = envelope.form;
              if (envelope.links && typeof envelope.links === "object")
                setLinks(envelope.links);
              recoveredId = envelope.editingId;
              if (envelope.intent?.key && envelope.intent?.payload)
                preserved = envelope.intent;
            } else sessionStorage.removeItem(storageKey);
          }
        } catch {
          /* A damaged optional draft cannot change authority or catalogue data. */
        }
        if (documentId || recoveredId) {
          const existing = (
            await api<{ data: SupplyDocument }>(
              "/api/documents/" + (documentId ?? recoveredId),
              undefined,
              controller.signal,
            )
          ).data;
          if (
            existing.type !== type ||
            existing.care_recipient_id !== patientId ||
            !(
              preserved ||
              existing.status === "draft" ||
              (recount && type === "BAL" && existing.status === "submitted")
            )
          )
            throw new Error("Esta ficha não permite edição neste contexto.");
          setEditing(existing);
          setLinks(
            Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                line.requisitionItemIds,
              ]),
            ),
          );
          setForm({
            quantities: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                recount ? "" : String(line.quantity),
              ]),
            ),
            notes: existing.payload.notes ?? "",
            origin: existing.payload.origin ?? "",
            source: existing.payload.source ?? "FAMILY",
            recipientId: existing.recipient_id ?? "",
            recipientReason: existing.payload.recipientReason ?? "",
            sharedNeedReasons: Object.fromEntries(
              existing.lines.map((line) => [
                line.product_id,
                String(line.metadata.sharedNeedReason ?? ""),
              ]),
            ),
          });
          if (restored && !documentId) setForm(restored);
          if (preserved) {
            frozenRef.current = preserved;
            setUncertain(true);
            setStep(5);
          }
        } else if (restored) {
          setForm(restored);
          setMessage("Rascunho deste dispositivo recuperado.");
          if (preserved) {
            frozenRef.current = preserved;
            setUncertain(true);
            setStep(5);
          }
        } else if (type === "BAL")
          setForm((current) => ({
            ...current,
            quantities: Object.fromEntries(
              products.data.map((product) => [product.id, ""]),
            ),
          }));
        else if (source)
          setForm((current) => ({
            ...current,
            quantities: Object.fromEntries(
              Object.keys(sourceLinks).map((id) => [id, ""]),
            ),
          }));
        setLoading(false);
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o formulário.",
          );
        }
      });
    return () => controller.abort();
  }, [
    patientId,
    requisitionId,
    storageKey,
    type,
    attempt,
    documentId,
    recount,
    canReadRequests,
  ]);
  useEffect(() => {
    if (type !== "ENT" || loading || loadError || uncertain || saved) return;
    const controller = new AbortController();
    api<{ data: DeliveryPreparation }>(
      "/api/documents/delivery-preparation?careRecipientId=" +
        patientId +
        "&source=" +
        form.source,
      undefined,
      controller.signal,
    )
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (recipientContextRef.current?.source === data.source) {
          setRecipientComparison(data);
        } else {
          recipientContextRef.current = data;
          setRecipientContext(data);
          setRecipientComparison(null);
          setForm((current) =>
            current.recipientId
              ? current
              : { ...current, recipientId: data.suggestedId ?? "" },
          );
        }
        setRecipientError("");
        setRecipientPending(false);
        setRecipientLoadedSource(data.source);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setRecipientError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os recebedores. Atualize esta seção.",
          );
          setRecipientPending(false);
          setRecipientLoadedSource(form.source);
        }
      });
    return () => controller.abort();
  }, [
    type,
    patientId,
    form.source,
    loading,
    loadError,
    uncertain,
    saved,
    recipientAttempt,
  ]);
  const recipientLoading =
    recipientPending || recipientLoadedSource !== form.source;
  const activeRecipientContext =
    recipientContext?.source === form.source ? recipientContext : null;
  useEffect(() => {
    if (loading || loadError || saved || uncertain || busy) return;
    const timer = window.setTimeout(() => {
      if (frozenRef.current) return;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            savedAt: Date.now(),
            form,
            links,
            editingId: editing?.id,
          }),
        );
      } catch {
        /* The form remains in memory. */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    form,
    links,
    editing,
    loading,
    loadError,
    saved,
    storageKey,
    uncertain,
    busy,
  ]);
  function validate(all = false) {
    const errors: Record<string, string> = {};
    if (
      type === "COM" &&
      (all || step === 0) &&
      !["purchase", "donation"].includes(form.origin)
    )
      errors.origin = "Escolha se este ato é uma compra ou uma doação.";
    const category = ["medicamentos", "higiene", "dieta"][step - 1];
    if (type === "ENT" && (all || step === 0) && !form.recipientId)
      errors.recipientId = "Selecione quem receberá esta entrega.";
    if (type === "ENT" && (all || step === 0)) {
      if (recipientLoading || recipientError || !activeRecipientContext)
        errors.recipientContext =
          "Consulte as pessoas e a escala antes de continuar. Os demais campos foram preservados.";
      else if (recipientComparison)
        errors.recipientContext =
          "Compare e adote explicitamente as referências atuais antes de continuar.";
      else if (
        !activeRecipientContext.people.some(
          (person) => person.id === form.recipientId,
        )
      )
        errors.recipientId =
          "Escolha uma pessoa que continue elegível para receber nesta direção.";
      if (
        activeRecipientContext &&
        !recipientError &&
        !recipientLoading &&
        !recipientComparison &&
        form.recipientId &&
        (form.recipientId !== activeRecipientContext?.suggestedId ||
          (editing?.recipient_id &&
            editing.recipient_id !== form.recipientId)) &&
        (form.recipientReason?.trim().length ?? 0) < 3
      )
        errors.recipientReason =
          "Explique a escolha manual ou troca do recebedor com 3 a 1000 caracteres.";
    }
    const relevant = catalog.filter(
      (product) =>
        (all || product.category === category) &&
        (type === "BAL" || Object.hasOwn(form.quantities, product.id)),
    );
    for (const product of relevant)
      if (
        !validQuantity(
          form.quantities[product.id] ?? "",
          product.quantity_decimals ?? 0,
          type === "BAL",
        )
      )
        errors[product.id] =
          "Informe " +
          ((product.quantity_decimals ?? 0)
            ? "quantidade válida"
            : "unidades inteiras") +
          (type === "BAL" ? ", inclusive zero." : " acima de zero.");
    if (all && !Object.keys(form.quantities).length)
      errors.lines = "Selecione ao menos um produto.";
    if (all || step === 0)
      for (const [productId, ids] of Object.entries(links)) {
        if (
          ids.length > 1 &&
          (form.sharedNeedReasons?.[productId]?.trim().length ?? 0) < 3
        )
          errors[productId + ":shared"] =
            "Justifique por que essas requisições representam a mesma necessidade.";
      }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Confira os campos destacados.");
      window.setTimeout(
        () =>
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        0,
      );
      return false;
    }
    setError("");
    return true;
  }
  async function next() {
    if (!validate()) return;
    if (type === "BAL" && step === 0 && !editing) {
      setBusy(true);
      try {
        const key = storageKey + ":start";
        let idempotencyKey = sessionStorage.getItem(key);
        if (!idempotencyKey) {
          idempotencyKey = crypto.randomUUID();
          sessionStorage.setItem(key, idempotencyKey);
        }
        const result = await api<{ data: SupplyDocument }>("/api/documents", {
          careRecipientId: context.patient!.id,
          type: "BAL",
          payload: {
            lines: catalog.map((product) => ({
              productId: product.id,
              quantity: "0",
            })),
            notes: "",
          },
          idempotencyKey,
          draft: true,
        });
        setEditing(result.data);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir a referência da contagem.",
        );
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }
  async function persist(draft: boolean) {
    if (!frozenRef.current) {
      if (!validate(true)) {
        if (draft) {
          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify({ savedAt: Date.now(), form }),
            );
            setMessage(
              "Rascunho salvo neste dispositivo. Complete os campos para emitir a ficha.",
            );
          } catch {
            setError("Não foi possível salvar o rascunho neste dispositivo.");
          }
        }
        return;
      }
      const lines: DraftLine[] = catalog
        .filter((product) => Object.hasOwn(form.quantities, product.id))
        .map((product) => ({
          productId: product.id,
          quantity: quantity(form.quantities[product.id]).toFixed(),
          ...(links[product.id]?.length
            ? {
                requisitionItemIds: links[product.id],
                metadata: {
                  sharedNeedReason: form.sharedNeedReasons?.[product.id] ?? "",
                },
              }
            : {}),
        }));
      const payload: SupplyPayload = {
        lines,
        notes: form.notes,
        ...(type === "COM"
          ? form.origin
            ? { origin: form.origin }
            : {}
          : type === "ENT"
            ? {
                source: form.source,
                destination: form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
                recipientId: form.recipientId,
                recipientReason: form.recipientReason?.trim() || undefined,
                recipientReference: activeRecipientContext!.referenceHash,
              }
            : {}),
      };
      frozenRef.current = {
        payload,
        key: crypto.randomUUID(),
        submissionKey: crypto.randomUUID(),
        draft,
        expectedVersion: editing?.version,
      };
    }
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form,
          links,
          editingId: editing?.id,
          intent: frozenRef.current,
        }),
      );
    } catch {
      /* Attempt retained in memory. */
    }
    try {
      const result = await api<{ data: SupplyDocument }>(
        editing ? "/api/documents/" + editing.id + "/revise" : "/api/documents",
        editing
          ? {
              payload: frozenRef.current.payload,
              idempotencyKey: frozenRef.current.key,
              submissionKey: frozenRef.current.submissionKey,
              expectedVersion: frozenRef.current.expectedVersion,
              recount,
              submit: !frozenRef.current.draft,
            }
          : {
              careRecipientId: context.patient!.id,
              type,
              payload: frozenRef.current.payload,
              idempotencyKey: frozenRef.current.key,
              draft: frozenRef.current.draft,
            },
      );
      setSaved(result.data);
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey + ":start");
      setUncertain(false);
    } catch (reason) {
      const known =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 413, 422].includes(reason.status);
      if (known) frozenRef.current = null;
      if (
        type === "ENT" &&
        reason instanceof ApiError &&
        reason.status === 409
      ) {
        setRecipientPending(true);
        setRecipientAttempt((value) => value + 1);
        setStep(0);
      }
      setUncertain(!known);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar a gravação.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function scan(code: string) {
    setError("");
    setMessage("");
    const result = await api<{
      data: { product_id: string; name: string; base_quantity: string }[];
    }>(
      "/api/catalog/presentations?careRecipientId=" +
        context.patient!.id +
        "&barcode=" +
        encodeURIComponent(code),
    );
    const presentation = result.data[0];
    if (!presentation) {
      setError(
        "Código desconhecido. Associe uma apresentação no catálogo ou selecione o produto manualmente. Nenhum item foi criado.",
      );
      return;
    }
    setForm((current) => ({
      ...current,
      quantities: {
        ...current.quantities,
        [presentation.product_id]: quantity(
          current.quantities[presentation.product_id] || "0",
        )
          .plus(presentation.base_quantity)
          .toFixed(),
      },
    }));
    const product = catalog.find((item) => item.id === presentation.product_id);
    setMessage(
      presentation.name +
        ": adicionados " +
        formatQuantity(presentation.base_quantity, product?.unit),
    );
    if (product)
      setStep(
        ["medicamentos", "higiene", "dieta"].indexOf(product.category) + 1,
      );
  }
  if (!allowed)
    return (
      <Notice>
        Seu vínculo não permite emitir esta ficha. Consulte as fichas
        autorizadas no histórico.
      </Notice>
    );
  if (saved)
    return (
      <section className="ui-card mx-auto max-w-3xl">
        <span className="ui-badge ui-badge-success">Documento persistido</span>
        <h2 className="mt-4 text-2xl font-semibold">
          {saved.code ?? "Rascunho salvo"}
        </h2>
        <p className="mt-2 break-all text-xs text-(--muted)">
          {saved.protocol}
        </p>
        <p className="my-5 text-sm leading-6">
          {saved.status === "draft"
            ? "A ficha está salva como rascunho e ainda não foi expedida."
            : type === "ENT"
              ? "Entrega registrada. O recebimento depende da confirmação do destinatário designado."
              : type === "COM"
                ? saved.payload.origin === "donation"
                  ? "Doação registrada. Acompanhe as parcelas e a validação da chegada."
                  : "Compra registrada. Acompanhe a aprovação, aquisição e validação do recebimento."
                : saved.status === "approved"
                  ? "Balanço concluído e estoque reconciliado."
                  : "Balanço registrado e aguardando as revisões configuradas."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className={primaryClass} href={"/fichas/" + saved.id}>
            Acompanhar ficha <Icon name="arrow" />
          </Link>
          <Link className={buttonClass} href="/fichas">
            Voltar à central
          </Link>
        </div>
        <p className="mt-4 text-xs text-(--muted)">
          A navegação está liberada. O envio de notificações é acompanhado
          abaixo.
        </p>
        {saved.status !== "draft" ? (
          <>
            <DocumentActions
              id={saved.id}
              code={saved.code ?? type}
              version={saved.version}
            />
            <DocumentDeliveryStatus id={saved.id} version={saved.version} />
          </>
        ) : null}
      </section>
    );
  return (
    <div className="mx-auto max-w-4xl">
      {loadError ? (
        <div className="space-y-3">
          <Notice error>{loadError}</Notice>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setLoading(true);
              setLoadError("");
              setAttempt((value) => value + 1);
            }}
          >
            Recarregar dados
          </button>
          <Link
            className={buttonClass}
            href={requisitionId ? "/historico/" + requisitionId : "/fichas"}
          >
            Voltar
          </Link>
        </div>
      ) : (
        <>
          <StepNavigator
            steps={steps}
            active={step}
            onChange={setStep}
            disabled={busy || uncertain || loading}
            label={"Etapas da " + type}
          />
          {message ? <Notice>{message}</Notice> : null}
          {error ? (
            <Notice error>
              {error}
              {loading ? null : (
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setLoading(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Recarregar dados
                </button>
              )}
            </Notice>
          ) : null}
          {loading ? (
            <Notice>Carregando catálogo e vínculos…</Notice>
          ) : (
            <section className="ui-card">
              <div className="mb-6">
                <p className="eyebrow">
                  {type} · {context.patient?.display_name}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{steps[step]}</h2>
              </div>
              <fieldset
                disabled={busy || uncertain}
                className="min-w-0 space-y-5"
              >
                <SupplyWizardStep
                  step={step}
                  type={type}
                  context={context}
                  form={form}
                  setForm={setForm}
                  fieldErrors={fieldErrors}
                  catalog={catalog}
                  people={people}
                  links={links}
                  setLinks={setLinks}
                  requestOptions={requestOptions}
                  requisitionId={requisitionId}
                  scan={scan}
                  recipientContext={activeRecipientContext}
                  recipientComparison={recipientComparison}
                  recipientError={recipientError}
                  recipientLoading={recipientLoading}
                  previousRecipient={editing?.recipient_id}
                  refreshRecipients={() => {
                    setRecipientPending(true);
                    setRecipientError("");
                    setRecipientAttempt((value) => value + 1);
                  }}
                  adoptRecipients={() => {
                    if (recipientComparison) {
                      recipientContextRef.current = recipientComparison;
                      setRecipientContext(recipientComparison);
                      setRecipientComparison(null);
                      setFieldErrors({});
                      requestAnimationFrame(() =>
                        document.getElementById("delivery-recipient")?.focus(),
                      );
                    }
                  }}
                />
              </fieldset>
              {uncertain ? (
                <Notice>
                  A confirmação da gravação está pendente. Recupere a mesma
                  tentativa antes de iniciar outra.
                </Notice>
              ) : null}
              <WizardActions
                step={step}
                total={6}
                saving={busy}
                uncertain={uncertain}
                blocked={type === "ENT" && step === 0 && recipientLoading}
                onBack={() => {
                  setStep((value) => value - 1);
                  setError("");
                }}
                onDraft={() => void persist(true)}
                onNext={next}
                onFinish={() => void persist(false)}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
