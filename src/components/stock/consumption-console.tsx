"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@fluentui/react-components";
import {
  api,
  ApiError,
  can,
  inputClass,
  Notice,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionSummary } from "@/types/consumption";
import { ConsumptionEditor } from "./consumption-editor";
import { ConsumptionDetail } from "./consumption-detail";
import { FlowReviews } from "./flow-reviews";
import { parseConsumptionPage } from "@/lib/validation/consumption";

type Cursor = { at: string; id: string };
export function ConsumptionConsole() {
  return (
    <Workspace title="Faltas e consumo extraordinário">
      {(context) =>
        context.patient ? (
          <Reports key={context.patient.id} context={context} />
        ) : (
          <Notice>Selecione um paciente.</Notice>
        )
      }
    </Workspace>
  );
}
function Reports({ context }: { context: WorkspaceContext }) {
  const params = useSearchParams(),
    router = useRouter(),
    live = useLiveRevision(),
    patient = context.patient!.id;
  const selected = params.get("ref"),
    [query, setQuery] = useState(() =>
      new URLSearchParams(
        [...params].filter(([key]) =>
          ["q", "kind", "status", "from", "to"].includes(key),
        ),
      ).toString(),
    );
  const [read, setRead] = useState<{ query: string; key: string; rows: ConsumptionSummary[] | null; next: Cursor | null; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0),
    [moreBusy, setMoreBusy] = useState(false);
  const readKey = JSON.stringify([patient, query, live, attempt]), current = read?.query === query ? read : null;
  const rows = current?.rows ?? null, next = current?.next ?? null, error = current?.error ?? "", reading = current?.key !== readKey;
  const [products, setProducts] = useState<CatalogProduct[]>([]),
    [catalogError, setCatalogError] = useState(""),
    [catalogLoading, setCatalogLoading] = useState(true),
    [catalogAttempt, setCatalogAttempt] = useState(0);
  const [editor, setEditor] = useState<HTMLElement | null>(null),
    [message, setMessage] = useState(""),
    [referenceError, setReferenceError] = useState("");
  const listHeadingRef = useRef<HTMLHeadingElement>(null),
    triggerRef = useRef<HTMLElement | null>(null),
    generationRef = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    generationRef.current++;
    api<unknown>(
      `/api/consumption?careRecipientId=${patient}&${query}`,
      undefined,
      controller.signal,
    )
      .then(value => parseConsumptionPage(value, patient)).then((result) => {
        if (!controller.signal.aborted) {
          setRead({ query, key: readKey, rows: result.data, next: result.next, error: "" });
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          const unavailable = reason instanceof ApiError && [401, 403, 404, 409].includes(reason.status);
          setRead(previous => ({ query, key: readKey, rows: !unavailable && previous?.query === query ? previous.rows : null, next: !unavailable && previous?.query === query ? previous.next : null, error: reason instanceof Error ? reason.message : "Não foi possível consultar os relatos." }));
        }
      });
    return () => controller.abort();
  }, [patient, query, readKey]);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: CatalogProduct[] }>(
      `/api/catalog?careRecipientId=${patient}&includeInactive=true`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setProducts(result.data);
          setCatalogError("");
          setCatalogLoading(false);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setCatalogError(reason.message);
          setCatalogLoading(false);
        }
      });
    return () => controller.abort();
  }, [patient, catalogAttempt]);
  function open(id: string | null) {
    const values = new URLSearchParams(query);
    if (id) values.set("ref", id);
    router.replace("/consumo" + (values.size ? "?" + values : ""), {
      scroll: false,
    });
  }
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget))
      if (typeof value === "string" && value.trim())
        values.set(key, value.trim());
    setQuery(values.toString());
    if (selected) values.set("ref", selected);
    router.replace("/consumo" + (values.size ? "?" + values : ""), {
      scroll: false,
    });
  }
  async function loadMore() {
    if (!next) return;
    setMoreBusy(true);
    const snapshot = generationRef.current;
    try {
      const response = await api<unknown>(
        `/api/consumption?careRecipientId=${patient}&${query}&` +
          new URLSearchParams({ beforeAt: next.at, beforeId: next.id }),
      );
      const result = parseConsumptionPage(response, patient);
      if (snapshot === generationRef.current) {
        setRead(previous => previous?.query === query ? { ...previous, rows: [...new Map([...(previous.rows ?? []), ...result.data].map(row => [row.id, row])).values()], next: result.next, error: "" } : previous);
      }
    } catch (reason) {
      if (snapshot === generationRef.current)
        setRead(previous => previous?.query === query ? { ...previous, error: reason instanceof Error ? reason.message : "Não foi possível carregar outra página." } : previous);
    } finally {
      setMoreBusy(false);
    }
  }
  const catalogRetry = () => {
    setCatalogLoading(true);
    setCatalogAttempt((value) => value + 1);
  };
  return (
    <div className="space-y-5">
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        {can(context, "consumption.report") ? (
          <Button
            appearance="primary"
            onClick={(event) => setEditor(event.currentTarget)}
          >
            Registrar ocorrência
          </Button>
        ) : null}
        <Button onClick={() => setAttempt((value) => value + 1)}>
          Atualizar lista
        </Button>
      </div>
      <section className="ui-card" aria-label="Relatos registrados">
        <h2 className="font-semibold" tabIndex={-1} ref={listHeadingRef}>
          Relatos registrados
        </h2>
        <form className="my-4 grid gap-3 sm:grid-cols-2" onSubmit={filter}>
          <label className="block text-sm">
            Buscar no relato original
            <input
              className={inputClass}
              name="q"
              maxLength={120}
              defaultValue={params.get("q") ?? ""}
            />
          </label>
          <label className="block text-sm">
            Tipo
            <select
              className={inputClass}
              name="kind"
              defaultValue={params.get("kind") ?? ""}
            >
              <option value="">Todos</option>
              <option value="consumption">Consumo</option>
              <option value="shortage">Falta</option>
            </select>
          </label>
          <label className="block text-sm">
            Estado
            <select
              className={inputClass}
              name="status"
              defaultValue={params.get("status") ?? ""}
            >
              <option value="">Todos</option>
              <option value="reported">Aguardando conferência</option>
              <option value="confirmed">Confirmado</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </label>
          <label className="block text-sm">
            Desde
            <input
              className={inputClass}
              name="from"
              type="date"
              defaultValue={params.get("from") ?? ""}
            />
          </label>
          <label className="block text-sm">
            Até
            <input
              className={inputClass}
              name="to"
              type="date"
              defaultValue={params.get("to") ?? ""}
            />
          </label>
          <Button type="submit">Aplicar filtros</Button>
        </form>
        <form
          className="my-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const id = String(
              new FormData(event.currentTarget).get("reference") ?? "",
            ).trim();
            if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
              setReferenceError("Confira a referência completa do relato.");
              return;
            }
            setReferenceError("");
            open(id);
          }}
        >
          <label className="block text-sm">
            Referência do relato
            <input
              className={inputClass}
              name="reference"
              maxLength={36}
              required
              aria-invalid={Boolean(referenceError)}
              aria-describedby={
                referenceError ? "consumption-reference-error" : undefined
              }
            />
          </label>
          {referenceError ? (
            <p role="alert" id="consumption-reference-error">
              {referenceError}
            </p>
          ) : null}
          <Button type="submit">Consultar referência</Button>
        </form>
        {error ? (
          <Notice error>
            {error} Use Atualizar lista para repetir a consulta.
          </Notice>
        ) : null}
        {reading ? <Notice>Carregando relatos…</Notice> : null}
        {rows && rows.length > 0 && (reading || error) ? <p className="my-3 text-sm text-(--muted)">Última consulta confirmada; aguardando atualização.</p> : null}
        <ul className="space-y-3">
          {rows?.map((row) => (
            <li
              className="rounded border border-(--line) p-4 break-words"
              key={row.id}
            >
              <p className="font-semibold">
                {row.kind === "shortage" ? "Falta" : "Consumo"} ·{" "}
                {row.location === "FAMILY" ? "Família" : "Equipe"} ·{" "}
                {row.status === "reported"
                  ? "Aguardando conferência"
                  : row.status === "confirmed"
                    ? "Confirmado"
                    : "Rejeitado"}
              </p>
              <p className="my-2 whitespace-pre-wrap text-sm">{row.body}</p>
              <p className="text-xs text-(--muted)">
                {row.reported_name ?? "Nome original não preservado"} ·{" "}
                {formatBrazilDate(row.created_at)} · versão {row.version}
              </p>
              <Button
                className="mt-3"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  open(row.id);
                }}
              >
                Abrir relato <span className="sr-only">{row.id}</span>
              </Button>
            </li>
          ))}
        </ul>
        {!reading && rows?.length === 0 && !error ? (
          <p>Nenhum relato encontrado para estes filtros.</p>
        ) : null}
        {next ? (
          <Button
            className="mt-4"
            disabled={moreBusy || reading}
            onClick={() => void loadMore()}
          >
            Carregar mais relatos
          </Button>
        ) : null}
      </section>
      {selected ? (
        <ConsumptionDetail
          key={selected}
          id={selected}
          context={context}
          products={products}
          catalogError={catalogError}
          catalogLoading={catalogLoading}
          onCatalogRetry={catalogRetry}
          onChange={() => setAttempt((value) => value + 1)}
          onClose={() => {
            open(null);
            requestAnimationFrame(() => {
              if (triggerRef.current?.isConnected) triggerRef.current.focus();
              else listHeadingRef.current?.focus();
            });
          }}
        />
      ) : null}
      {editor ? (
        <ConsumptionEditor
          context={context}
          products={products}
          catalogError={catalogError}
          catalogLoading={catalogLoading}
          onCatalogRetry={catalogRetry}
          restoreFocusTo={editor}
          onClose={() => setEditor(null)}
          onSaved={(id) => {
            setEditor(null);
            setMessage(
              "Relato identificado. Consulte a referência para acompanhar complementos, conferência e movimentos registrados.",
            );
            setAttempt((value) => value + 1);
            open(id);
          }}
        />
      ) : null}
      {can(context, "consumption.report") &&
      !catalogLoading &&
      !catalogError ? (
        <FlowReviews
          patientId={patient}
          products={products}
          onChange={() => setAttempt((value) => value + 1)}
        />
      ) : null}
    </div>
  );
}
