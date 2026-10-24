"use client";
import { DocumentActions } from "./document-actions";

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
      {(context) =>
        context.patient ? (
          <PatientSupplyWizard
            key={context.patient.id + params.toString()}
            context={context}
            type={type}
            requisitionId={params.get("requisitionId")}
            documentId={params.get("documentId")}
            recount={params.get("recount") === "true"}
          />
        ) : (
          <Notice>Selecione um paciente para abrir uma ficha.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientSupplyWizard({
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
  const [form, setForm] = useState<WizardState>({
    quantities: {},
    notes: "",
    origin: "purchase",
    source: "FAMILY",
    recipientId: "",
  });
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [requestOptions, setRequestOptions] = useState<ItemContext[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    const controller = new AbortController();
    const patientId = context.patient!.id;
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
            origin: existing.payload.origin ?? "purchase",
            source: existing.payload.source ?? "FAMILY",
            recipientId: existing.recipient_id ?? "",
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
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o formulário.",
          );
        }
      });
    return () => controller.abort();
  }, [
    context.patient,
    requisitionId,
    storageKey,
    type,
    attempt,
    documentId,
    recount,
    canReadRequests,
  ]);
  useEffect(() => {
    if (loading || saved || uncertain || busy) return;
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
  }, [form, links, editing, loading, saved, storageKey, uncertain, busy]);
  function validate(all = false) {
    const errors: Record<string, string> = {};
    const category = ["medicamentos", "higiene", "dieta"][step - 1];
    if (type === "ENT" && (all || step === 0) && !form.recipientId)
      errors.recipientId = "Selecione quem receberá esta entrega.";
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
          ? { origin: form.origin }
          : type === "ENT"
            ? {
                source: form.source,
                destination: form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY",
                recipientId: form.recipientId,
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
                ? "Compra registrada. Acompanhe a aprovação, aquisição e validação do recebimento."
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
          <fieldset disabled={busy || uncertain} className="min-w-0 space-y-5">
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
            />
          </fieldset>
          {uncertain ? (
            <Notice>
              A confirmação da gravação está pendente. Recupere a mesma
              tentativa antes de iniciar outra.
            </Notice>
          ) : null}
          <WizardActions step={step} total={6} saving={busy} uncertain={uncertain} onBack={() => { setStep((value) => value - 1); setError(""); }} onDraft={() => void persist(true)} onNext={next} onFinish={() => void persist(false)} />
        </section>
      )}
    </div>
  );
}
