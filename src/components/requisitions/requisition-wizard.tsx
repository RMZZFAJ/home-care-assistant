"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemainingNeedReference } from "./remaining-need-reference";
import {
  restoreStockObservation,
  validStockObservation,
} from "@/lib/stock-observation";
import type { RequisitionFormData, RequisitionLine } from "@/types/requisition";
import type { ItemContext } from "@/types/documents";
import {
  api,
  ApiError,
  buttonClass,
  Notice,
  may,
  can,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { RecurringSelection } from "./recurring-selection";
import { applyMaterialSelection } from "@/lib/requisitions/recurring-selection";
import { draftFlowStages, navigationForStep, stepForNavigation } from "@/lib/forms/draft-navigation";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
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

const steps = draftFlowStages.REQ.map(stage => stage.label);
export function RequisitionWizard() {
  const sourceId = useSearchParams().get("sourceRequisitionId");
  return (
    <Workspace title="Requisição de insumos" compact>
      {(context) =>
        context.patient ? (
          <PatientRequisition
            key={
              context.userId +
              ":" +
              context.patient.id +
              ":" +
              (sourceId ?? "new")
            }
            context={context}
            sourceId={sourceId}
          />
        ) : (
          <Notice>Selecione um paciente para iniciar.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientRequisition({
  context,
  sourceId,
}: {
  context: WorkspaceContext;
  sourceId: string | null;
}) {
  const [sourceReady, setSourceReady] = useState(!sourceId);
  const [sourceAttempt, setSourceAttempt] = useState(0);
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
  const fieldsRef = useRef<HTMLDivElement>(null), focusErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusErrorRef.current) return;
    const target = [...(fieldsRef.current?.querySelectorAll<HTMLElement>('[data-field-error]') ?? [])].find(element => element.dataset.fieldError === focusErrorRef.current) ?? fieldsRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (target) { target.focus(); focusErrorRef.current = null; }
  }, [step, fieldErrors]);
  const frozenRef = useRef<Record<string, unknown> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemContext, setItemContext] = useState<ItemContext[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const storageKey =
    "hca:v2:requisition:" +
    context.userId +
    ":" +
    context.patient!.id +
    (sourceId ? ":remaining:" + sourceId : "");
  const draftContent: RequisitionFormData = {
    lines: form.lines,
    extraItems: form.extraItems,
    observations: form.observations,
    ...(form.remainingNeed ? { remainingNeed: form.remainingNeed } : {}),
  };
  const privateDraft = useCreationDraft({
    userId: context.userId,
    patientId: context.patient!.id,
    kind: "REQ",
    navigation: navigationForStep("REQ", step),
    enabled: can(context, "req.read"),
    onResume: (draft) => {
      if (!draft.content || !("lines" in draft.content)) return false;
      if ((draft.content.remainingNeed?.requisitionId ?? null) !== sourceId)
        return false;
      setForm({
        ...draft.content,
        lines: draft.content.lines.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          return product
            ? {
                ...line,
                productName: product.name,
                unit: product.unit,
                category: product.category,
              }
            : line;
        }),
      });
      setStep(stepForNavigation("REQ", draft.navigation));
      setError("");
      setFieldErrors({});
      return true;
    },
    onDiscard: () => {
      setForm({ lines: [], extraItems: [], observations: [] });
      setStep(0);
      setFieldErrors({});
      sessionStorage.removeItem(storageKey);
    },
  });
  const offeredSource =
    privateDraft.offered?.content && "lines" in privateDraft.offered.content
      ? (privateDraft.offered.content.remainingNeed?.requisitionId ?? null)
      : null;
  const resumeHref =
    privateDraft.offered && offeredSource !== sourceId
      ? `/fichas/req?careRecipientId=${context.patient!.id}${offeredSource ? "&sourceRequisitionId=" + offeredSource : ""}`
      : undefined;
  const missingProducts = form.lines.filter(
    (line) => !products.some((item) => item.id === line.productId),
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (
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
          setForm({
            ...saved.form,
            lines: saved.form.lines.map(restoreStockObservation),
            extraItems: saved.form.extraItems.map(restoreStockObservation),
          });
          setMessage(saved.intent
            ? "Tentativa desta aba recuperada. Consulte a mesma tentativa antes de iniciar outra requisição."
            : "Preenchimento desta aba recuperado. Salve um rascunho na conta para retomar em outra sessão ou aparelho.");
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
    const declarationTime = new Date().toISOString();
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
                currentStock: null,
                stockObservation: "unfilled",
                stockObservationAt: declarationTime,
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
    if (missingProducts.length)
      errors.catalog =
        "Há materiais fora do catálogo ativo. Confira e remova-os antes de emitir.";
    if (sourceId && (all || step === 0)) {
      if (!sourceReady || form.remainingNeed?.requisitionId !== sourceId)
        errors.remainingSource =
          "Consulte e escolha a referência da requisição de origem.";
      else if (
        [...form.remainingNeed.reason.trim()].length < 3 ||
        form.remainingNeed.reason.trim().length > 1000
      )
        errors.remainingNeed =
          "Informe o motivo da necessidade remanescente, entre3 e1000 caracteres.";
    }
    for (const line of form.lines.filter(
      (line) => all || line.category === currentCategory,
    )) {
      if (
        !validStockObservation(
          line,
          products.find((item) => item.id === line.productId)
            ?.quantity_decimals ?? 0,
        )
      )
        errors[line.productId] =
          line.stockObservation === "legacy_unclassified"
            ? "Confirme como informar a observação recuperada do rascunho antigo."
            : "Revise a informação do estoque e a precisão da unidade.";
      if (
        itemContext.find((item) => item.productId === line.productId)?.pending
          .length &&
        ((line.repeatReason?.trim().length ?? 0) < 3 || (line.repeatReason?.trim().length ?? 0) > 1000)
      )
        errors[line.productId + ":repeat"] =
          "Justifique a nova requisição deste produto, entre três e 1.000 caracteres.";
    }
    if (all || step === 4) for (const item of form.extraItems) {
      if (!item.name.trim()) errors[item.id + ":name"] = "Informe o nome do item extra ou remova-o.";
      if (!validStockObservation(item)) errors[item.id + ":stock"] = "Revise a informação de estoque deste item extra.";
    }
    if (all || step === 5) form.observations.forEach((item, index) => {
      if (!item.trim()) errors["observation:" + index] = "Preencha a observação ou remova-a.";
      else if (item.trim().length > 1000) errors["observation:" + index] = "A observação deve ter até 1.000 caracteres.";
    });
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
        const key = Object.keys(errors)[0];
        const product = products.find((item) => key === item.id || key === item.id + ":repeat");
        if (product)
          setStep(
            ["medicamentos", "higiene", "dieta"].indexOf(product.category) + 1,
          );
        else if (form.extraItems.some(item => key === item.id + ":name" || key === item.id + ":stock")) setStep(4);
        else if (key.startsWith("observation:")) setStep(5);
        else if (key.startsWith("remaining")) setStep(0);
        else if (key === "lines" || key === "catalog") setStep(1);
      }
      focusErrorRef.current = Object.keys(errors)[0] ?? null;
      return false;
    }
    setError("");
    return true;
  }
  async function submit() {
    if (!frozenRef.current && (privateDraft.blocked || !validate(true))) return;
    if (!frozenRef.current)
      frozenRef.current = {
        ...form,
        ...(privateDraft.draftCommit
          ? { draftCommit: privateDraft.draftCommit }
          : {}),
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
          reason.code === "DRAFT_VERSION_CONFLICT" ||
          reason.code === "VERSION_CONFLICT" ||
          reason.code === "DUPLICATE_REVIEW_REQUIRED");
      if (rejected) {
        if (
          reason instanceof ApiError &&
          reason.code === "DRAFT_VERSION_CONFLICT"
        ) {
          await privateDraft.reportConflict();
          setStep(0);
        }
        if (
          reason instanceof ApiError &&
          reason.code === "VERSION_CONFLICT" &&
          sourceId
        ) {
          setSourceAttempt((value) => value + 1);
          setStep(0);
        }
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
  if (privateDraft.readDenied)
    return (
      <Notice error>
        Seu acesso ao rascunho foi encerrado. Selecione um vínculo autorizado.
      </Notice>
    );
  if (!can(context, "req.read"))
    return <Notice>Seu acesso à requisição foi encerrado.</Notice>;
  const selectionLibrary = (readonly = false) => <RecurringSelection key={context.userId+":"+context.patient!.id} userId={context.userId} patientId={context.patient!.id} catalogue={products} lines={form.lines}
    disabled={readonly||saving||uncertain||loadingCatalog||Boolean(catalogError)||privateDraft.blocked||!may(context,"request")} canSave={may(context,"request")}
    cataloguePending={loadingCatalog} catalogueError={catalogError} onRefresh={()=>{setLoadingCatalog(true);setCatalogAttempt(value=>value+1);}}
    onApply={ids=>setForm(current=>({...current,lines:applyMaterialSelection(current.lines,ids,products).lines}))}/>;
  if (
    !may(context, "request") &&
    !uncertain &&
    !privateDraft.pending &&
    !privateDraft.offered &&
    !privateDraft.base
  )
    return (
      <div className="hca-form-stack"><Notice>
        Seu vínculo permite consultar as fichas autorizadas no histórico.
      </Notice>{selectionLibrary(true)}</div>
    );
  return (
    <div ref={fieldsRef} className="mx-auto max-w-4xl min-w-0 space-y-5">
      {selectionLibrary()}
      <CreationDraftPanel
        draft={privateDraft}
        current={draftContent}
        patientName={context.patient!.display_name}
        resumeHref={resumeHref}
        disabled={saving || uncertain || loadingCatalog}
      />
      {missingProducts.length ? (
        <Notice error>
          Materiais do preenchimento que não estão no catálogo ativo:{" "}
          {missingProducts.map((line) => (
            <div key={line.productId}>
              {line.productName}
              <button
                className={buttonClass}
                disabled={
                  saving ||
                  uncertain ||
                  privateDraft.blocked ||
                  !may(context, "request")
                }
                onClick={() => removeLine(line.productId)}
              >
                Remover material indisponível
              </button>
            </div>
          ))}
        </Notice>
      ) : null}
      {sourceId ? (
        <RemainingNeedReference
          sourceId={sourceId}
          patientId={context.patient!.id}
          value={form.remainingNeed}
          onChange={(remainingNeed) =>
            setForm((current) => ({ ...current, remainingNeed }))
          }
          readonly={
            step !== 0 ||
            uncertain ||
            saving ||
            privateDraft.blocked ||
            !may(context, "request")
          }
          attempt={sourceAttempt}
          onReady={setSourceReady}
          reasonError={fieldErrors.remainingNeed}
        />
      ) : null}
      <StepNavigator
        steps={steps}
        active={step}
        onChange={setStep}
        disabled={uncertain || saving || loadingCatalog || privateDraft.blocked}
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
            disabled={
              saving ||
              uncertain ||
              privateDraft.blocked ||
              !may(context, "request") ||
              Boolean(catalogError)
            }
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
                selectedCount={form.lines.length}
              />
            ) : null}
            {step === 4 ? (
              <Extras
                errors={fieldErrors}
                items={form.extraItems}
                setItems={(extraItems) => setForm({ ...form, extraItems })}
                products={products}
                adopt={(product, extra) => {
                  updateLine(product, {
                    currentStock: extra.currentStock,
                    stockObservation: extra.stockObservation,
                    stockObservationAt: extra.stockObservationAt,
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
                errors={fieldErrors}
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
          <WizardActions
            step={step}
            total={7}
            saving={
              saving ||
              privateDraft.busy ||
              (privateDraft.blocked && !uncertain) ||
              (!may(context, "request") && !uncertain)
            }
            uncertain={uncertain}
            blocked={Boolean(catalogError) || Boolean(sourceId && !sourceReady)}
            finishLabel="Concluir requisição"
            onBack={() => setStep((value) => value - 1)}
            onDraft={() => void privateDraft.save(draftContent)}
            onNext={() => {
              if (validate()) setStep((value) => value + 1);
            }}
            onFinish={() => void submit()}
          />
        </section>
      )}
    </div>
  );
}
