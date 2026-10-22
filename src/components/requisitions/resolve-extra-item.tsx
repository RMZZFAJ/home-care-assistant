"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  buttonClass,
  inputClass,
  Notice,
  primaryClass,
} from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import type { CatalogProduct } from "@/types/documents";

export function ResolveExtraItem({
  patientId,
  requestId,
  items,
  onChange,
}: {
  patientId: string;
  requestId: string;
  items: { id: string; name: string }[];
  onChange: () => void;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{
    itemId: string;
    productId: string;
    reason: string;
    idempotencyKey: string;
  } | null>(null);
  const pendingRef = useRef<typeof review>(null);
  const [uncertain, setUncertain] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: CatalogProduct[] }>(
      "/api/catalog?careRecipientId=" + patientId,
      undefined,
      controller.signal,
    )
      .then((result) => setProducts(result.data))
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [patientId, attempt]);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setReview({
      itemId: String(form.get("itemId")),
      productId: String(form.get("productId")),
      reason: String(form.get("reason")),
      idempotencyKey: crypto.randomUUID(),
    });
  }
  async function confirm() {
    if (!pendingRef.current) pendingRef.current = review;
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "/api/requisitions/" + requestId + "/resolve",
        pendingRef.current,
      );
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      onChange();
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status)
      ) {
        pendingRef.current = null;
        setReview(null);
      }
      setUncertain(Boolean(pendingRef.current));
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar a associação.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ui-card">
      <h2 className="font-semibold">Identificar itens extras no catálogo</h2>
      <p className="mt-2 text-sm leading-6 text-(--muted)">
        Associe cada item extra a um produto deste paciente antes de incluí-lo
        em COM ou ENT. O texto original da requisição será preservado e a
        decisão ficará registrada em uma nova versão.
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      <form className="mt-4 space-y-4" onSubmit={prepare}>
        <fieldset disabled={busy || uncertain} className="min-w-0 space-y-4">
          <label className="block text-sm font-semibold">
            Item extra
            <select
              name="itemId"
              className={inputClass}
              aria-label="Item extra"
              required
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Produto correspondente
            <select
              name="productId"
              className={inputClass}
              aria-label="Produto correspondente"
              required
            >
              <option value="">Selecione após conferir nome e unidade</option>
              {products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name} · {product.unit}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Justificativa da associação
            <textarea
              className={inputClass}
              name="reason"
              minLength={3}
              maxLength={1000}
              required
              rows={3}
            />
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button
            className={primaryClass}
            disabled={busy}
            type={uncertain ? "button" : "submit"}
            onClick={uncertain ? () => void confirm() : undefined}
          >
            {uncertain ? "Recuperar associação" : "Revisar associação"}
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={busy || uncertain}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Atualizar catálogo
          </button>
          <a
            className={buttonClass}
            href="/admin?section=catalog"
            target="_blank"
            rel="noopener"
          >
            Cadastrar produto
          </a>
        </div>
      </form>
      <Dialog
        open={Boolean(review)}
        title="Confirmar identificação do item"
        onClose={() => {
          if (!busy && !uncertain) setReview(null);
        }}
      >
        <p className="text-sm">
          {items.find((item) => item.id === review?.itemId)?.name} →{" "}
          {products.find((product) => product.id === review?.productId)?.name}
        </p>
        <p className="mt-3 text-sm">{review?.reason}</p>
        <div className="ui-form-actions">
          <button
            className={buttonClass}
            disabled={busy || uncertain}
            onClick={() => setReview(null)}
          >
            Voltar
          </button>
          <button
            className={primaryClass}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy
              ? "Confirmando…"
              : uncertain
                ? "Recuperar associação"
                : "Confirmar associação"}
          </button>
        </div>
        {error ? <Notice error>{error}</Notice> : null}
      </Dialog>
    </section>
  );
}
