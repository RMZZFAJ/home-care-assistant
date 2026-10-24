"use client";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "../workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { FlowReviews } from "./flow-reviews";
import { Button } from "@fluentui/react-components";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog, Icon } from "@/components/ui/primitives";
import type { CatalogProduct } from "@/types/documents";
type Report = {
  id: string;
  kind: string;
  location: string;
  status: string;
  body: string;
  created_at: string;
  lines: { productId: string; quantity: string }[];
};
export function ConsumptionConsole() {
  return (
    <Workspace title="Faltas e consumo extraordinário">
      {(context) =>
        context.patient ? (
          <Reports context={context} />
        ) : (
          <Notice>Selecione um paciente.</Notice>
        )
      }
    </Workspace>
  );
}
function Reports({ context }: { context: WorkspaceContext }) {
  const [editor, setEditor] = useState<HTMLElement | null>(null);
  const [review, setReview] = useState<{ row: Report; accept: boolean } | null>(null);
  const [rows, setRows] = useState<Report[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pendingRef = useRef<unknown>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<{ data: Report[] }>(
        "/api/consumption?careRecipientId=" + context.patient!.id,
        undefined,
        controller.signal,
      ),
      api<{ data: CatalogProduct[] }>(
        "/api/catalog?careRecipientId=" + context.patient!.id,
        undefined,
        controller.signal,
      ),
    ])
      .then(([r, p]) => {
        setRows(r.data);
        setProducts(p.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [context.patient, attempt]);
  async function send(payload: unknown) {
    setBusy(true);
    setError("");
    if (!pendingRef.current) pendingRef.current = payload;
    try {
      await api("/api/consumption", pendingRef.current);
      pendingRef.current = null;
      setUncertain(false);
      setEditor(null);
      setLines({});
      setMessage(
        "Operação confirmada. Relatos só alteram o estoque após confirmação autorizada.",
      );
      setAttempt((value) => value + 1);
      return true;
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [400, 403, 404, 409].includes(reason.status)
      )
        pendingRef.current = null;
      setUncertain(Boolean(pendingRef.current));
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {can(context, "consumption.report") ? <div className="hca-toolbar"><Button appearance="primary" icon={<Icon name="plus" />} onClick={(event) => setEditor(event.currentTarget)}>Registrar ocorrência</Button></div> : null}
      {can(context, "consumption.report") && editor ? (
        <RecordDrawer title="Registrar relato" onClose={() => setEditor(null)} restoreFocusTo={editor} busy={busy} preventClose={uncertain}>
          {error ? <Notice error>{error}</Notice> : null}
          {uncertain ? <Notice>O envio está preservado. Recupere a mesma tentativa para confirmar o resultado.</Notice> : null}
          <p className="mt-2 text-sm text-(--muted)">
            Relate apenas produtos sob responsabilidade familiar. Quantidades
            serão conferidas antes de movimentar o estoque.
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void send({
                action: "report",
                careRecipientId: context.patient!.id,
                kind: form.get("kind"),
                location: form.get("location"),
                text: form.get("text"),
                lines: Object.entries(lines).map(([productId, quantity]) => ({
                  productId,
                  quantity,
                })),
                idempotencyKey: crypto.randomUUID(),
              });
            }}
          >
            <fieldset
              disabled={busy || uncertain}
              className="min-w-0 space-y-4"
            >
              <label className="block text-sm font-semibold">
                Tipo
                <select name="kind" className={inputClass}>
                  <option value="consumption">Consumo extraordinário</option>
                  <option value="shortage">Falta de material</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Custódia
                <select name="location" className={inputClass}>
                  <option value="CARE_TEAM">Equipe</option>
                  {can(context, "stock.family.read") ? (
                    <option value="FAMILY">Família</option>
                  ) : null}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                O que aconteceu?
                <textarea
                  name="text"
                  className={inputClass}
                  minLength={3}
                  maxLength={2000}
                  rows={3}
                  required
                />
              </label>
              <details>
                <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                  Produtos e quantidades confirmáveis
                </summary>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded border border-(--line) p-3"
                    >
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Object.hasOwn(lines, product.id)}
                          onChange={(event) =>
                            setLines((current) => {
                              const next = { ...current };
                              if (event.target.checked) next[product.id] = "";
                              else delete next[product.id];
                              return next;
                            })
                          }
                        />
                        {product.name}
                      </label>
                      {Object.hasOwn(lines, product.id) ? (
                        <label className="block text-sm">
                          Quantidade · {product.unit}
                          <input
                            className={inputClass}
                            type="number"
                            inputMode="decimal"
                            min="0.000001"
                            step="any"
                            value={lines[product.id]}
                            onChange={(event) =>
                              setLines({
                                ...lines,
                                [product.id]: event.target.value,
                              })
                            }
                            required
                          />
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            </fieldset>
            <button className={primaryClass} disabled={busy}>
              {uncertain ? "Recuperar relato" : "Registrar para conferência"}
            </button>
          </form>
        </RecordDrawer>
      ) : null}
      {can(context, "consumption.report") ? (
        <FlowReviews
          patientId={context.patient!.id}
          products={products}
          onChange={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      <section className="ui-card">
        <h2 className="font-semibold">Relatos registrados</h2>
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded border border-(--line) p-4">
              <p className="text-sm font-semibold">
                {row.kind === "shortage" ? "Falta" : "Consumo"} ·{" "}
                {row.location === "FAMILY" ? "Família" : "Equipe"} ·{" "}
                {row.status === "reported"
                  ? "Aguardando confirmação"
                  : row.status === "confirmed"
                    ? "Confirmado"
                    : "Rejeitado"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{row.body}</p>
              <ul className="mt-2 text-xs">
                {row.lines.map((line) => (
                  <li key={line.productId}>
                    {products.find((product) => product.id === line.productId)
                      ?.name ?? "Produto"}{" "}
                    · {line.quantity}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-(--muted)">
                {formatBrazilDate(row.created_at)}
              </p>
              {row.status === "reported" &&
              can(
                context,
                row.location === "FAMILY"
                  ? "stock.family.manage"
                  : "consumption.confirm",
              ) ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    className={primaryClass}
                    disabled={busy}
                    onClick={() => setReview({ row, accept: true })}
                  >
                    Confirmar relato e movimento
                  </button>
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => setReview({ row, accept: false })}
                  >
                    Rejeitar relato
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {!rows.length ? (
          <p className="mt-4 text-sm text-(--muted)">
            Nenhum relato registrado.
          </p>
        ) : null}
      </section>
      <Dialog open={Boolean(review)} title="Revisar confirmação do relato" onClose={() => { if (!busy && !uncertain) setReview(null); }}>{review ? <><p>{review.row.body}</p><ul className="my-4 space-y-2">{review.row.lines.map((line) => <li key={line.productId}>{products.find((product) => product.id === line.productId)?.name ?? "Produto"} · {line.quantity}</li>)}</ul><p className="hca-field-hint">{review.accept ? "A confirmação registra o consumo na custódia indicada. O relato e o movimento permanecem auditáveis." : "A rejeição preserva o relato sem movimentar o estoque."}</p>{error ? <Notice error>{error}</Notice> : null}<div className="hca-toolbar"><Button disabled={busy || uncertain} onClick={() => setReview(null)}>Voltar</Button><Button appearance="primary" disabled={busy} onClick={async () => { if (await send({ action: "confirm", id: review.row.id, accept: review.accept })) setReview(null); }}>{uncertain ? "Recuperar confirmação" : review.accept ? "Confirmar consumo" : "Confirmar rejeição"}</Button></div></> : null}</Dialog>
    </div>
  );
}
