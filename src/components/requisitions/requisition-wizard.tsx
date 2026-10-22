"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deliveryLabels,
  recipientGroupLabels,
  deliveryErrorLabels,
  type DeliveryStatus,
} from "@/lib/notifications/presentation";
import { textRows } from "@/lib/text-rows";
import {
  matchCatalog,
  normalizeCatalogText as normalize,
} from "@/lib/catalog-match";
import { buildWhatsAppSummary, formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, validQuantity } from "@/lib/quantity";
import type {
  ExtraItem,
  RequisitionFormData,
  RequisitionLine,
  RequisitionReceipt,
} from "@/types/requisition";
import type { ItemContext } from "@/types/documents";
import Link from "next/link";
import {
  api,
  ApiError,
  buttonClass,
  inputClass,
  primaryClass,
  Notice,
  may,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { StepNavigator } from "@/components/ui/primitives";

const steps = [
  "Identificação",
  "Medicamentos",
  "Higiene",
  "Dieta",
  "Itens extras",
  "Observações",
  "Revisão",
];
const emptyExtra = (): ExtraItem => ({
  id: "extra-" + crypto.randomUUID(),
  name: "",
  currentStock: 0,
  urgent: false,
});
type Product = {
  id: string;
  name: string;
  category: RequisitionLine["category"];
  unit: string;
  quantity_decimals?: number;
  aliases?: string[];
  active?: boolean;
  is_active?: boolean;
};
type SavedReceipt = RequisitionReceipt & {
  id?: string;
  requisitionId?: string;
};
export function RequisitionWizard() {
  return (
    <Workspace title="Requisição de insumos">
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
          <div className="ui-form-actions">
            <button
              className={buttonClass}
              disabled={step === 0 || saving || uncertain}
              onClick={() => setStep((value) => value - 1)}
            >
              Voltar
            </button>
            <button
              className={buttonClass}
              disabled={saving || uncertain}
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    storageKey,
                    JSON.stringify({ savedAt: Date.now(), form }),
                  );
                  setMessage("Rascunho salvo neste dispositivo.");
                } catch {
                  setError(
                    "O armazenamento deste dispositivo está indisponível.",
                  );
                }
              }}
            >
              Salvar rascunho
            </button>
            {step < 6 ? (
              <button
                className={primaryClass}
                disabled={Boolean(catalogError)}
                onClick={() => {
                  if (validate()) setStep((value) => value + 1);
                }}
              >
                {step === 5 ? "Revisar" : "Avançar"}
              </button>
            ) : (
              <button
                className={primaryClass}
                disabled={saving}
                onClick={() => void submit()}
              >
                {saving
                  ? "Registrando…"
                  : uncertain
                    ? "Recuperar esta tentativa"
                    : "Concluir requisição"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
function Identity({
  name,
  requesterName,
}: {
  name: string;
  requesterName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Paciente: <strong>{name}</strong>
      </p>
      <p className="text-sm">
        Solicitante: <strong>{requesterName}</strong>
      </p>
      <Notice>
        Marque os produtos necessários e informe o estoque observado com a
        equipe. A requisição não contém quantidade solicitada e não movimenta o
        estoque.
      </Notice>
    </div>
  );
}
function CatalogStep({
  items,
  itemContext,
  selected,
  updateLine,
  removeLine,
  errors,
}: {
  items: Product[];
  itemContext: ItemContext[];
  selected: (id: string) => RequisitionLine | undefined;
  updateLine: (item: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  errors: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const visible = items.filter((item) =>
    [item.name, ...(item.aliases ?? [])].some((name) =>
      normalize(name).includes(normalize(search)),
    ),
  );
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Buscar produto
        <input
          className={inputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou nome alternativo"
        />
      </label>
      {!visible.length ? (
        <Notice>Nenhum produto encontrado nesta categoria.</Notice>
      ) : null}
      {visible.map((item) => {
        const line = selected(item.id);
        const info = itemContext.find((entry) => entry.productId === item.id);
        return (
          <article
            key={item.id}
            className={"ui-product-choice " + (line ? "is-selected" : "")}
          >
            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={Boolean(line)}
                onChange={() =>
                  line ? removeLine(item.id) : updateLine(item, {})
                }
              />
              {item.name}
              <span className="ml-auto text-xs font-normal text-(--muted)">
                {item.unit}
              </span>
            </label>
            {line ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-(--muted)">
                  Família · saldo confirmado deste produto:{" "}
                  {info?.familyStock === null || !info
                    ? "consulta indisponível"
                    : formatQuantity(info.familyStock, item.unit)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Estoque observado com a equipe
                    <input
                      className={inputClass}
                      type="number"
                      inputMode={
                        (item.quantity_decimals ?? 0) ? "decimal" : "numeric"
                      }
                      min="0"
                      max="100000"
                      step={
                        (item.quantity_decimals ?? 0)
                          ? 10 ** -(item.quantity_decimals ?? 0)
                          : 1
                      }
                      value={
                        Number.isNaN(line.currentStock) ? "" : line.currentStock
                      }
                      aria-invalid={Boolean(errors[item.id])}
                      onChange={(event) =>
                        updateLine(item, {
                          currentStock:
                            event.target.value === ""
                              ? NaN
                              : Number(event.target.value),
                        })
                      }
                    />
                    {errors[item.id] ? (
                      <span className="ui-field-error">{errors[item.id]}</span>
                    ) : null}
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={line.urgent}
                      onChange={(event) =>
                        updateLine(item, { urgent: event.target.checked })
                      }
                    />
                    Reposição urgente
                  </label>
                </div>
                {info?.pending.length ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                    <p>
                      Este produto ainda tem requisição pendente:{" "}
                      {info.pending.map((pending) => (
                        <Link
                          key={pending.lineId}
                          className="underline mr-2"
                          href={"/historico/" + pending.requisitionId}
                        >
                          {pending.code}
                        </Link>
                      ))}
                    </p>
                    <label className="mt-3 block font-semibold">
                      Motivo da nova requisição
                      <textarea
                        className={inputClass}
                        value={line.repeatReason ?? ""}
                        minLength={3}
                        maxLength={1000}
                        aria-invalid={Boolean(errors[item.id + ":repeat"])}
                        onChange={(event) =>
                          updateLine(item, {
                            repeatReason: event.target.value || undefined,
                          })
                        }
                      />
                      {errors[item.id + ":repeat"] ? (
                        <span className="ui-field-error">
                          {errors[item.id + ":repeat"]}
                        </span>
                      ) : null}
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
function Extras({
  items,
  setItems,
  products,
  adopt,
}: {
  items: ExtraItem[];
  setItems: (items: ExtraItem[]) => void;
  products: Product[];
  adopt: (product: Product, extra: ExtraItem) => void;
}) {
  const classificationLabels = {
    exact: "Correspondência exata no catálogo.",
    alias: "Nome alternativo reconhecido no catálogo.",
    approximate:
      "Correspondência aproximada. Confira nome e unidade antes de escolher.",
    ambiguous:
      "Correspondência ambígua: há mais de um item possível. Escolha explicitamente o correto.",
    absent: "Nenhuma correspondência no catálogo deste paciente.",
  };
  const candidateLabels = {
    exact: "Nome exato",
    alias: "Nome alternativo",
    approximate: "Grafia aproximada",
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-(--muted)">
        Adicione materiais não disponíveis no catálogo e informe somente o
        estoque atual. As sugestões exigem sua escolha antes de vincular um
        item.
      </p>
      {items.map((item, index) => {
        const result = matchCatalog(item.name, products);
        return (
          <div
            key={item.id}
            className="grid gap-3 rounded-xl border border-(--line) p-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <label className="text-sm font-semibold">
              Nome
              <input
                value={item.name}
                maxLength={200}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? { ...current, name: event.target.value }
                        : current,
                    ),
                  )
                }
                className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Estoque atual
              <input
                type="number"
                min="0"
                step="1"
                value={item.currentStock}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? {
                            ...current,
                            currentStock: Number(event.target.value),
                          }
                        : current,
                    ),
                  )
                }
                className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setItems(items.filter((current) => current.id !== item.id))
                }
                className="min-h-12 w-full rounded-lg border border-red-200 px-3 text-left text-sm font-semibold text-red-700 sm:w-auto"
              >
                Remover item {index + 1}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={item.urgent}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? { ...current, urgent: event.target.checked }
                        : current,
                    ),
                  )
                }
              />
              Reposição urgente
            </label>
            {normalize(item.name) && (
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 sm:col-span-3">
                <p role="status" className="text-sm font-semibold">
                  {classificationLabels[result.classification]}
                </p>
                {result.candidates.slice(0, 5).map((candidate) => (
                  <button
                    key={candidate.product.id}
                    type="button"
                    className="block min-h-11 w-full rounded border border-(--brand) p-2 text-left text-sm"
                    onClick={() => adopt(candidate.product, item)}
                  >
                    Usar item do catálogo: {candidate.product.name} (
                    {candidate.product.unit})
                    <span className="mt-1 block text-xs text-(--muted)">
                      {candidateLabels[candidate.kind]}
                      {candidate.kind === "alias"
                        ? `: ${candidate.matchedName}`
                        : ""}
                    </span>
                  </button>
                ))}
                {result.candidates.length > 5 && (
                  <p className="text-xs text-(--muted)">
                    Mostrando 5 de {result.candidates.length} possibilidades.
                    Refine o nome para localizar o item correto.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setItems([...items, emptyExtra()])}
        className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
      >
        + Incluir novo item
      </button>
    </div>
  );
}
function Observations({
  observations,
  setObservations,
}: {
  observations: string[];
  setObservations: (observations: string[]) => void;
}) {
  const [rows, setRows] = useState(() =>
    observations.map((value) => ({ id: crypto.randomUUID(), value })),
  );
  function update(next: typeof rows) {
    setRows(next);
    setObservations(next.map((row) => row.value));
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-(--muted)">
        Registre apenas informações operacionais necessárias.
      </p>
      {rows.map((row, index) => (
        <div key={row.id} className="flex gap-2">
          <textarea
            aria-label={`Observação ${index + 1}`}
            rows={3}
            value={row.value}
            onChange={(event) =>
              update(
                rows.map((item) =>
                  item.id === row.id
                    ? { ...item, value: event.target.value }
                    : item,
                ),
              )
            }
            className="w-full rounded-lg border border-(--line) p-3"
          />
          <button
            type="button"
            onClick={() => update(rows.filter((item) => item.id !== row.id))}
            className="self-start text-sm font-semibold text-red-700"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([...rows, { id: crypto.randomUUID(), value: "" }])
        }
        className="rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
      >
        + Incluir nova observação
      </button>
    </div>
  );
}
function Review({
  form,
  recipientName,
  requesterName,
}: {
  form: RequisitionFormData;
  recipientName: string;
  requesterName: string;
}) {
  const lines = form.lines;
  const extras = form.extraItems.filter((item) => item.name.trim());
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-(--muted)">Solicitante</p>
        <p className="font-semibold">{requesterName}</p>
        <p className="mt-4 text-sm text-(--muted)">Pessoa assistida</p>
        <p className="font-semibold">{recipientName}</p>
      </div>
      <Summary
        title="Itens do catálogo"
        rows={lines.map(
          (item) =>
            `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
        )}
      />
      <Summary
        title="Itens extras"
        rows={extras.map(
          (item) =>
            `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
        )}
      />
      <Summary
        title="Observações"
        rows={form.observations.filter((item) => item.trim())}
      />
    </div>
  );
}
function Summary({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      {rows.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {textRows(rows).map((row) => (
            <li key={row.key}>{row.value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>
      )}
    </div>
  );
}
function Receipt({ receipt }: { receipt: SavedReceipt }) {
  const share = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(buildWhatsAppSummary(receipt))}`,
      "_blank",
      "noopener,noreferrer",
    );
  return (
    <div className="p-3 sm:p-5">
      <section className="mx-auto max-w-3xl rounded-2xl border border-(--line) bg-white p-5 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
          Requisição registrada
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Comprovante oficial</h1>
        <div className="mt-6 grid gap-4 rounded-xl bg-[#f1f7f7] p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-(--muted)">Protocolo</p>
            <p className="text-xl font-bold">{receipt.protocol}</p>
          </div>
          <div>
            <p className="text-sm text-(--muted)">Data e hora</p>
            <p className="font-semibold">
              {formatBrazilDate(receipt.createdAt)}
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm">
          Solicitante: <strong>{receipt.requesterName}</strong>
          <br />
          Pessoa assistida: <strong>{receipt.recipientName}</strong>
        </p>
        <Summary
          title="Itens"
          rows={[
            ...receipt.lines.map(
              (item) =>
                `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
            ),
            ...receipt.extraItems.map(
              (item) =>
                `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
            ),
          ]}
        />
        <Summary title="Observações" rows={receipt.observations} />
        <ReceiptNotifications id={receipt.id ?? receipt.requisitionId} />
        <div className="mt-8 flex flex-col gap-3 border-t border-(--line) pt-5 sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-12 rounded-lg bg-(--brand) px-4 py-2 text-sm font-bold text-white"
          >
            Imprimir / salvar como PDF
          </button>
          <button
            type="button"
            onClick={share}
            className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
          >
            Compartilhar resumo pelo WhatsApp
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          <Link
            className={buttonClass}
            href={
              receipt.id || receipt.requisitionId
                ? `/historico/${receipt.id ?? receipt.requisitionId}`
                : "/historico"
            }
          >
            Consultar registro e notificações
          </Link>
          <Link className={buttonClass} href="/fichas/req">
            Nova requisição
          </Link>
        </div>
        <p className="mt-4 text-xs text-(--muted)">
          O compartilhamento abre uma conversa com texto pré-preenchido; nenhum
          PDF é anexado automaticamente.
        </p>
      </section>
    </div>
  );
}

function ReceiptNotifications({ id }: { id?: string }) {
  const [states, setStates] = useState<DeliveryStatus[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let timer: number | undefined;
    function update() {
      if (document.hidden) {
        timer = window.setTimeout(update, 5000);
        return;
      }
      api<{ data: { requisition_notifications: DeliveryStatus[] } }>(
        `/api/requisitions/${id}`,
        undefined,
        controller.signal,
      ).then(
        (body) => {
          if (controller.signal.aborted) return;
          setStates(body.data.requisition_notifications);
          setError("");
          if (
            body.data.requisition_notifications.some((item) =>
              [
                "pending",
                "processing",
                "accepted",
                "sent",
                "delivered",
              ].includes(item.state),
            )
          )
            timer = window.setTimeout(update, 5000);
        },
        () => {
          if (!controller.signal.aborted) {
            setError(
              "Consulte o acompanhamento para verificar as notificações.",
            );
            timer = window.setTimeout(update, 15000);
          }
        },
      );
    }
    update();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [id]);
  if (!id) return null;
  return (
    <section className="mt-6">
      <h2 className="font-bold">Notificações</h2>
      {error ? (
        <p className="mt-2 text-sm">{error}</p>
      ) : states === null ? (
        <p className="mt-2 text-sm">Consultando estados registrados…</p>
      ) : states.length === 0 ? (
        <p className="mt-2 text-sm">Nenhuma notificação configurada.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {states.map((item) => (
            <li key={item.id}>
              {recipientGroupLabels[item.recipient_group] ??
                item.recipient_group}{" "}
              · {item.recipient_label} · {item.channel} ·{" "}
              {deliveryLabels[item.state] ?? item.state}
              <p className="text-xs text-(--muted)">
                {item.attempts} tentativa(s)
                {item.attempted_at
                  ? ` · Última tentativa: ${formatBrazilDate(item.attempted_at)}`
                  : " · Ainda não processada"}
              </p>
              {item.error_code && (
                <p>
                  {deliveryErrorLabels[item.error_code] ??
                    deliveryErrorLabels.PROCESSING_FAILED}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-(--muted)">
        A requisição foi persistida. O acompanhamento mostra os eventos de
        entrega confirmados separadamente.
      </p>
    </section>
  );
}
