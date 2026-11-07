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
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseFlowPage, type FlowSubmission as Submission } from "@/lib/validation/flow-reviews";

type Review = {
  id: string;
  accept: boolean;
  kind: string;
  text: string;
  lines: { productId: string; quantity: string }[];
};
export function FlowReviews({
  patientId,
  products,
  onChange,
}: {
  patientId: string;
  products: CatalogProduct[];
  onChange: () => void;
}) {
  const live = useLiveRevision(), [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const readKey = JSON.stringify([patientId, page, attempt, live]);
  const [result, setResult] = useState<{ key: string; data: ReturnType<typeof parseFlowPage> } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string; denied: boolean } | null>(null);
  const denied = failure?.denied === true;
  const rows = denied || result?.data.page !== page ? [] : result.data.data, configured = result?.data.configured === true, total = result?.data.total ?? 0;
  const loading = result?.key !== readKey && failure?.key !== readKey;
  const [selected, setSelected] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<Review | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<unknown>(
      `/api/whatsapp/flows/submissions?careRecipientId=${patientId}&page=${page}&pageSize=20`,
      undefined,
      controller.signal,
    )
      .then(parseFlowPage).then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key: readKey, data });
          setFailure(null);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setFailure({ key: readKey, message: reason instanceof Error ? reason.message : "Não foi possível consultar sugestões.", denied: reason instanceof ApiError && [401,403,404,409].includes(reason.status) });
      });
    return () => controller.abort();
  }, [patientId, page, readKey]);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setReview({
      id: selected.id,
      accept: true,
      kind: String(form.get("kind")),
      text: String(form.get("text")),
      lines: products
        .filter((product) => form.has("use:" + product.id))
        .map((product) => ({
          productId: product.id,
          quantity: String(form.get(product.id)),
        })),
    });
  }
  async function save(input: Review) {
    if (!pendingRef.current) pendingRef.current = input;
    setBusy(true);
    setError("");
    try {
      await api("/api/whatsapp/flows/submissions", pendingRef.current);
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      setSelected(null);
      setAttempt((value) => value + 1);
      onChange();
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status)
      )
        pendingRef.current = null;
      setUncertain(Boolean(pendingRef.current));
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar a revisão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ui-card" aria-label="Relatos recebidos por Flow">
      <h2 className="font-semibold">Relatos recebidos por Flow</h2>
      <button type="button" className={buttonClass + " mt-3"} onClick={() => setAttempt(value => value + 1)}>Atualizar sugestões</button>
      {loading ? <p role="status" className="mt-3">Consultando sugestões…</p> : null}
      {failure ? <Notice error>{failure.message}</Notice> : null}
      <p className="mt-2 text-sm text-(--muted)">
        {configured
          ? "Confira os dados recebidos no WhatsApp antes de registrá-los no aplicativo."
          : "O canal de Flows aguarda configuração do provedor. Sugestões já recebidas continuam disponíveis para revisão."}
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {uncertain ? (
        <button
          className={primaryClass}
          disabled={busy}
          onClick={() => void save(pendingRef.current!)}
        >
          Recuperar revisão
        </button>
      ) : null}
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li
            className="rounded-lg border border-(--line) p-3 text-sm"
            key={row.id}
          >
            <p>{row.body.text ?? "Relato recebido para revisão"}</p>
            <p className="mt-1 text-xs text-(--muted)">
              {formatBrazilDate(row.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className={buttonClass}
                disabled={busy || uncertain}
                onClick={() => setSelected(row)}
              >
                Conferir sugestão
              </button>
              <button
                className={buttonClass}
                disabled={busy || uncertain}
                onClick={() =>
                  void save({
                    id: row.id,
                    accept: false,
                    kind: "shortage",
                    text: "Sugestão descartada pelo próprio autor",
                    lines: [],
                  })
                }
              >
                Descartar sugestão
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && !failure && !rows.length ? (
        <p className="mt-4 text-sm text-(--muted)">
          Nenhuma sugestão pendente de confirmação.
        </p>
      ) : null}
      {total > 20 && !denied ? <nav className="hca-toolbar" aria-label="Páginas das sugestões"><button type="button" className={buttonClass} disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Página anterior de sugestões</button><span>Página {page} de {Math.ceil(total / 20)} · {total} sugestões</span><button type="button" className={buttonClass} disabled={loading || page * 20 >= total} onClick={() => setPage(value => value + 1)}>Próxima página de sugestões</button></nav> : null}
      {selected && !denied ? (
        <form
          className="mt-5 space-y-4 border-t border-(--line) pt-4"
          key={selected.id}
          onSubmit={prepare}
        >
          <fieldset className="min-w-0 space-y-4" disabled={busy || uncertain}>
            <label className="block text-sm font-semibold">
              Tipo do relato
              <select
                aria-label="Tipo do relato"
                className={inputClass}
                name="kind"
                defaultValue={selected.body.kind ?? "consumption"}
              >
                <option value="consumption">Consumo extraordinário</option>
                <option value="shortage">Falta de material</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Descrição conferida
              <textarea
                name="text"
                className={inputClass}
                rows={3}
                minLength={3}
                maxLength={2000}
                defaultValue={selected.body.text ?? ""}
                required
              />
            </label>
            {products.map((product) => (
              <div
                className="rounded-lg border border-(--line) p-3"
                key={product.id}
              >
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name={"use:" + product.id}
                    defaultChecked={selected.body.products?.includes(
                      product.id,
                    )}
                  />
                  {product.name}
                </label>
                <label className="block text-xs">
                  Quantidade conferida · {product.unit}
                  <input
                    className={inputClass}
                    name={product.id}
                    inputMode="decimal"
                    type="number"
                    step="any"
                    min="0.000001"
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <p className="text-xs leading-5 text-(--muted)">
            A revisão cria um relato pendente. O estoque só muda após a
            confirmação de uma pessoa autorizada.
          </p>
          <button className={primaryClass} disabled={busy || uncertain}>
            Revisar e registrar relato
          </button>
        </form>
      ) : null}
      <Dialog
        open={Boolean(review) && !denied}
        title="Registrar dados conferidos do Flow"
        onClose={() => {
          if (!busy && !uncertain) setReview(null);
        }}
      >
        <p className="whitespace-pre-wrap text-sm">{review?.text}</p>
        <p className="mt-3 text-sm">
          {review?.lines.length ?? 0} produto(s) selecionado(s). O relato
          seguirá para confirmação autorizada.
        </p>
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
            onClick={() => review && void save(review)}
          >
            {busy
              ? "Registrando…"
              : uncertain
                ? "Recuperar revisão"
                : "Confirmar relato conferido"}
          </button>
        </div>
        {error ? <Notice error>{error}</Notice> : null}
      </Dialog>
    </section>
  );
}
