"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validQuantity } from "@/lib/quantity";
import type {
  RequisitionFormData,
  RequisitionLine,
} from "@/types/requisition";
import type { ItemContext } from "@/types/documents";
import {
  api,
  ApiError,
  buttonClass,
  Notice,
  may,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { WizardActions } from "@/components/forms/wizard-actions";
import { StepNavigator } from "@/components/ui/primitives";

import {
  Identity,
  CatalogStep,
  Extras,
  Observations,
  Review,
  type Product,
} from "./requisition-steps";
import { Receipt, type SavedReceipt } from "./requisition-receipt";

const steps = [
  "Identificação",
  "Medicamentos",
  "Higiene",
  "Dieta",
  "Itens extras",
  "Observações",
  "Revisão",
];
export function RequisitionWizard() {
  return (
    <Workspace title="Requisição de insumos" compact>
      {(context) =>
        context.patient ? (
          <PatientRequisition context={context} />
        ) : (
          <Notice>Selecione um paciente para iniciar.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientRequisition({ context }: { context: WorkspaceContext }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RequisitionFormData>({
    lines: [],
    extraItems: [],
    observations: [],
  });
  const [receipt, setReceipt] = useState<SavedReceipt | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const frozenRef = useRef<Record<string, unknown> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemContext, setItemContext] = useState<ItemContext[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const storageKey =
    "hca:v2:requisition:" + context.userId + ":" + context.patient!.id;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (
          Date.now() - saved.savedAt > 86_400_000 ||
          (saved.form?.careRecipientId &&
            saved.form.careRecipientId !== context.patient!.id)
        ) {
          sessionStorage.removeItem(storageKey);
          return;
        }
        if (
          saved.form &&
          Array.isArray(saved.form.lines) &&
          Array.isArray(saved.form.extraItems) &&
          Array.isArray(saved.form.observations)
        ) {
          setForm(saved.form);
          setMessage("Rascunho deste dispositivo recuperado.");
          if (saved.intent) {
            frozenRef.current = saved.intent;
            setStep(6);
            setUncertain(true);
          }
        }
      } catch {
        /* Optional local recovery cannot authorize an operation. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey, context.patient]);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Product[] }>(
      "/api/catalog?careRecipientId=" + context.patient!.id,
      undefined,
      controller.signal,
    )
      .then(async (body) => {
        const items = body.data.filter(
          (item) => item.active !== false && item.is_active !== false,
        );
        const info = await api<{ data: ItemContext[] }>(
          "/api/requisitions/item-context?careRecipientId=" +
            context.patient!.id +
            "&productIds=" +
            items.map((item) => encodeURIComponent(item.id)).join(","),
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setProducts(items);
          setItemContext(info.data);
          setCatalogError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setCatalogError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o catálogo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCatalog(false);
      });
    return () => controller.abort();
  }, [context.patient, catalogAttempt]);
  useEffect(() => {
    if (receipt || uncertain || saving || loadingCatalog) return;
    const timer = window.setTimeout(() => {
      if (frozenRef.current) return;
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: Date.now(), form }),
        );
      } catch {
        /* In-memory draft remains available. */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form, loadingCatalog, receipt, saving, storageKey, uncertain]);
  const currentCategory = (["medicamentos", "higiene", "dieta"] as const)[
    step - 1
  ];
  const categoryItems = useMemo(
    () => products.filter((item) => item.category === currentCategory),
    [products, currentCategory],
  );
  const selected = (id: string) =>
    form.lines.find((line) => line.productId === id);
  function updateLine(item: Product, patch: Partial<RequisitionLine>) {
    setForm((current) => {
      const existing = current.lines.find((line) => line.productId === item.id);
      return {
        ...current,
        lines: existing
          ? current.lines.map((line) =>
              line.productId === item.id ? { ...line, ...patch } : line,
            )
          : [
              ...current.lines,
              {
                productId: item.id,
                productName: item.name,
                category: item.category,
                unit: item.unit,
                currentStock: 0,
                urgent: false,
                ...patch,
              },
            ],
      };
    });
  }
  function removeLine(id: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.productId !== id),
    }));
  }
  function validate(all = false) {
    const errors: Record<string, string> = {};
    for (const line of form.lines.filter(
      (line) => all || line.category === currentCategory,
    )) {
      if (
        !validQuantity(
          String(line.currentStock),
          products.find((item) => item.id === line.productId)
            ?.quantity_decimals ?? 0,
          true,
        )
      )
        errors[line.productId] = "Revise a quantidade e a precisão da unidade.";
      if (
        itemContext.find((item) => item.productId === line.productId)?.pending
          .length &&
        (line.repeatReason?.trim().length ?? 0) < 3
      )
        errors[line.productId + ":repeat"] =
          "Justifique a nova requisição deste produto ainda pendente.";
    }
    if (
      (all || step === 4) &&
      form.extraItems.some(
        (item) =>
          !item.name.trim() ||
          !Number.isFinite(item.currentStock) ||
          item.currentStock < 0,
      )
    )
      errors.extras = "Preencha ou remova os itens extras incompletos.";
    if ((all || step === 5) && form.observations.some((item) => !item.trim()))
      errors.observations = "Preencha ou remova as observações vazias.";
    if (all && !form.lines.length && !form.extraItems.length)
      errors.lines = "Selecione ao menos um item.";
    setFieldErrors(errors);
    if (
      !may(context, "request") ||
      loadingCatalog ||
      catalogError ||
      Object.keys(errors).length
    ) {
      setError(
        Object.values(errors)[0] ?? "Aguarde o catálogo e confira seu acesso.",
      );
      if (all && Object.keys(errors).length) {
        const id = Object.keys(errors)[0].split(":")[0];
        const product = products.find((item) => item.id === id);
        if (product)
          setStep(
            ["medicamentos", "higiene", "dieta"].indexOf(product.category) + 1,
          );
      }
      window.setTimeout(
        () =>
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        50,
      );
      return false;
    }
    setError("");
    return true;
  }
  async function submit() {
    if (!frozenRef.current && !validate(true)) return;
    if (!frozenRef.current)
      frozenRef.current = {
        ...form,
        careRecipientId: context.patient!.id,
        idempotencyKey: crypto.randomUUID(),
      };
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          savedAt: Date.now(),
          form,
          intent: frozenRef.current,
        }),
      );
    } catch {
      /* Retained in memory. */
    }
    setSaving(true);
    setError("");
    try {
      const body = await api<{ receipt: SavedReceipt }>(
        "/api/requisitions",
        frozenRef.current,
      );
      if (!body.receipt)
        throw new Error(
          "Consulte o histórico ou recupere esta tentativa para confirmar o comprovante.",
        );
      setReceipt(body.receipt);
      setUncertain(false);
      sessionStorage.removeItem(storageKey);
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        ([400, 403, 404, 413, 422].includes(reason.status) ||
          reason.code === "DUPLICATE_REVIEW_REQUIRED");
      if (rejected) {
        frozenRef.current = null;
        sessionStorage.removeItem(storageKey);
        if (
          reason instanceof ApiError &&
          reason.code === "DUPLICATE_REVIEW_REQUIRED"
        ) {
          setCatalogAttempt((value) => value + 1);
          setStep(1);
        }
      }
      setUncertain(!rejected);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (receipt) return <Receipt receipt={receipt} />;
  if (!may(context, "request"))
    return (
      <Notice>
        Seu vínculo permite consultar as fichas autorizadas no histórico.
      </Notice>
    );
  return (
    <div className="mx-auto max-w-4xl">
      <StepNavigator
        steps={steps}
        active={step}
        onChange={setStep}
        disabled={uncertain || saving || loadingCatalog}
        label="Etapas da requisição"
      />
      {message ? <Notice>{message}</Notice> : null}
      {catalogError ? (
        <Notice error>
          {catalogError}
          <button
            className={buttonClass}
            onClick={() => {
              setLoadingCatalog(true);
              setCatalogAttempt((value) => value + 1);
            }}
          >
            Recarregar catálogo
          </button>
        </Notice>
      ) : null}
      {loadingCatalog ? (
        <Notice>Carregando catálogo e pendências…</Notice>
      ) : (
        <section className="ui-card">
          <p className="eyebrow">REQ · {context.patient!.display_name}</p>
          <h2 className="my-4 text-xl font-semibold">{steps[step]}</h2>
          <fieldset
            disabled={saving || uncertain || Boolean(catalogError)}
            className="min-w-0"
          >
            {step === 0 ? (
              <Identity
                name={context.patient!.display_name}
                requesterName={context.fullName}
              />
            ) : null}
            {step >= 1 && step <= 3 ? (
              <CatalogStep
                items={categoryItems}
                itemContext={itemContext}
                selected={selected}
                updateLine={updateLine}
                removeLine={removeLine}
                errors={fieldErrors}
              />
            ) : null}
            {step === 4 ? (
              <Extras
                items={form.extraItems}
                setItems={(extraItems) => setForm({ ...form, extraItems })}
                products={products}
                adopt={(product, extra) => {
                  updateLine(product, {
                    currentStock: extra.currentStock,
                    urgent: extra.urgent,
                  });
                  setForm((current) => ({
                    ...current,
                    extraItems: current.extraItems.filter(
                      (item) => item.id !== extra.id,
                    ),
                  }));
                }}
              />
            ) : null}
            {step === 5 ? (
              <Observations
                observations={form.observations}
                setObservations={(observations) =>
                  setForm({ ...form, observations })
                }
              />
            ) : null}
            {step === 6 ? (
              <Review
                form={form}
                recipientName={context.patient!.display_name}
                requesterName={context.fullName}
              />
            ) : null}
          </fieldset>
          {error ? <Notice error>{error}</Notice> : null}
          {uncertain ? (
            <Notice>
              Confirme a tentativa preservada antes de iniciar outra requisição.
              Nenhum dado será reenviado com uma chave nova.
            </Notice>
          ) : null}
          <WizardActions step={step} total={7} saving={saving} uncertain={uncertain} blocked={Boolean(catalogError)} finishLabel="Concluir requisição" onBack={() => setStep((value) => value - 1)} onDraft={() => { try { sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), form })); setMessage("Rascunho salvo neste dispositivo."); } catch { setError("O armazenamento deste dispositivo está indisponível."); } }} onNext={() => { if (validate()) setStep((value) => value + 1); }} onFinish={() => void submit()} />
        </section>
      )}
    </div>
  );
}
