"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
import { parseConsumptionListRead } from "@/lib/validation/consumption";
import { useNotificationReference } from "@/lib/notifications/use-notification-reference";
import {
  NotificationReference,
  type ReminderOrigin,
} from "@/components/notifications/notification-reference";

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
  const selected = params.get("ref");
  const query = new URLSearchParams(
    ["q", "kind", "status", "from", "to", "sourceReminder"]
      .filter(key => Boolean(params.get(key)))
      .map(key => [key, params.get(key)!]),
  ).toString();
  const fields = { q: params.get("q") ?? "", kind: params.get("kind") ?? "", status: params.get("status") ?? "", from: params.get("from") ?? "", to: params.get("to") ?? "" };
  const [draft, setDraft] = useState(fields), [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setDraft(fields);
  }
  const explicitReport = params.get("refKind") === "report",
    notice = useNotificationReference(
      patient,
      "consumption",
      explicitReport ? null : (selected ?? params.get("sourceReminder")),
      params.get("refKind") ?? "auto",
    );
  const [read, setRead] = useState<{
    query: string;
    key: string;
    rows: ConsumptionSummary[] | null;
    next: Cursor | null;
    queriedAt: string | null;
    error: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0),
    [moreRequestKey, setMoreRequestKey] = useState<string | null>(null);
  const readKey = JSON.stringify([patient, query, live, attempt]),
    current = read?.query === query ? read : null;
  const rows = current?.rows ?? null,
    next = current?.next ?? null,
    error = current?.error ?? "",
    reading = current?.key !== readKey,
    moreBusy = moreRequestKey === readKey;
  const [products, setProducts] = useState<CatalogProduct[]>([]),
    [catalogError, setCatalogError] = useState(""),
    [catalogLoading, setCatalogLoading] = useState(true),
    [catalogAttempt, setCatalogAttempt] = useState(0);
  const [editor, setEditor] = useState<HTMLElement | null>(null),
    [message, setMessage] = useState(""),
    [referenceError, setReferenceError] = useState("");
  const [editorOrigin, setEditorOrigin] = useState<ReminderOrigin | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null),
    triggerRef = useRef<HTMLElement | null>(null),
    generationRef = useRef(0),
    moreRequestRef = useRef<{ key: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    generationRef.current++;
    api<unknown>(
      `/api/consumption?careRecipientId=${patient}&${query}`,
      undefined,
      controller.signal,
    )
      .then((value) => parseConsumptionListRead(value, patient, new URLSearchParams(query)))
      .then((result) => {
        if (!controller.signal.aborted) {
          setRead({
            query,
            key: readKey,
            rows: result.data,
            next: result.next,
            queriedAt: new Date().toISOString(),
            error: "",
          });
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          const unavailable =
            reason instanceof ApiError &&
            [401, 403, 404, 409].includes(reason.status);
          setRead((previous) => ({
            query,
            key: readKey,
            rows:
              !unavailable && previous?.query === query ? previous.rows : null,
            next:
              !unavailable && previous?.query === query ? previous.next : null,
            queriedAt:
              !unavailable && previous?.query === query ? previous.queriedAt : null,
            error:
              reason instanceof Error
                ? reason.message
                : "Não foi possível consultar os relatos.",
          }));
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
    values.set("careRecipientId", patient);
    if (id) {
      values.set("ref", id);
      values.set("refKind", "report");
    }
    router.replace("/consumo" + (values.size ? "?" + values : ""), {
      scroll: false,
    });
  }
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new URLSearchParams();
    values.set("careRecipientId", patient);
    const source = new URLSearchParams(query).get("sourceReminder");
    if (source) values.set("sourceReminder", source);
    for (const [key, value] of new FormData(event.currentTarget))
      if (typeof value === "string" && value.trim())
        values.set(key, value.trim());
    const applied = new URLSearchParams(values);
    applied.delete("careRecipientId");
    if (["q", "kind", "status", "from", "to", "sourceReminder"].every(key =>
      (applied.get(key) ?? "") === (new URLSearchParams(query).get(key) ?? ""),
    )) setAttempt(value => value + 1);
    if (selected) {
      values.set("ref", selected);
      if (params.get("refKind")) values.set("refKind", params.get("refKind")!);
    }
    router.push("/consumo" + (values.size ? "?" + values : ""), {
      scroll: false,
    });
  }
  async function loadMore() {
    if (!next || reading || error || moreRequestRef.current?.key === readKey) return;
    const request = { key: readKey };
    moreRequestRef.current = request;
    setMoreRequestKey(readKey);
    const snapshot = generationRef.current;
    try {
      const response = await api<unknown>(
        `/api/consumption?careRecipientId=${patient}&${query}&` +
          new URLSearchParams({ beforeAt: next.at, beforeId: next.id }),
      );
      const result = parseConsumptionListRead(response, patient, new URLSearchParams(query), next);
      if (result.data.some(row => rows?.some(existing => existing.id === row.id)))
        throw new Error("A página recebida repete relatos já consultados. Atualize a lista.");
      if (snapshot === generationRef.current && moreRequestRef.current === request) {
        setRead((previous) =>
          previous?.key === readKey
            ? {
                ...previous,
                rows: [...(previous.rows ?? []), ...result.data],
                next: result.next,
                queriedAt: new Date().toISOString(),
                error: "",
              }
            : previous,
        );
      }
    } catch (reason) {
      if (snapshot === generationRef.current && moreRequestRef.current === request) {
        const unavailable = reason instanceof ApiError && [401, 403, 404, 409].includes(reason.status);
        setRead((previous) =>
          previous?.key === readKey
            ? {
                ...previous,
                rows: unavailable ? null : previous.rows,
                next: unavailable ? null : previous.next,
                queriedAt: unavailable ? null : previous.queriedAt,
                error:
                  reason instanceof Error
                    ? reason.message
                    : "Não foi possível carregar outra página.",
              }
            : previous,
        );
      }
    } finally {
      if (moreRequestRef.current === request) moreRequestRef.current = null;
      setMoreRequestKey(previous => previous === readKey ? null : previous);
    }
  }
  const catalogRetry = () => {
    setCatalogLoading(true);
    setCatalogAttempt((value) => value + 1);
  };
  return (
    <div className="space-y-5">
      <NotificationReference
        key={patient + ":" + notice.reference}
        read={notice}
        context={context}
        onReport={(origin, opener) => {
          setEditorOrigin(origin);
          setEditor(opener);
        }}
      />
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        {can(context, "consumption.report") ? (
          <ActionButton
            variant="primary"
            onClick={(event) => {
              setEditorOrigin(null);
              setEditor(event.currentTarget);
            }}
          >
            Registrar ocorrência
          </ActionButton>
        ) : null}
        {can(context, "stock.family.read") ||
        can(context, "stock.team.read") ? (
          <ActionButton
            onClick={(e) => {
              setEditorOrigin(null);
              setEditor(e.currentTarget);
            }}
          >
            Meu preenchimento de relato
          </ActionButton>
        ) : null}
        <ActionButton onClick={() => setAttempt((value) => value + 1)}>
          Atualizar lista
        </ActionButton>
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
              value={draft.q}
              onChange={event => setDraft({ ...draft, q: event.target.value })}
            />
          </label>
          <label className="block text-sm">
            Tipo
            <select
              className={inputClass}
              name="kind"
              value={draft.kind}
              onChange={event => setDraft({ ...draft, kind: event.target.value })}
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
              value={draft.status}
              onChange={event => setDraft({ ...draft, status: event.target.value })}
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
              value={draft.from}
              onChange={event => setDraft({ ...draft, from: event.target.value })}
            />
          </label>
          <label className="block text-sm">
            Até
            <input
              className={inputClass}
              name="to"
              type="date"
              value={draft.to}
              onChange={event => setDraft({ ...draft, to: event.target.value })}
            />
          </label>
          <ActionButton type="submit">Aplicar filtros</ActionButton>
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
          <ActionButton type="submit">Consultar referência</ActionButton>
        </form>
        {error ? (
          <Notice error>
            {error} Use Atualizar lista para repetir a consulta.
          </Notice>
        ) : null}
        {reading ? <Notice>Carregando relatos…</Notice> : null}
        {current?.queriedAt ? <p className="my-3 text-sm text-(--muted)">
          {reading || error ? "Última consulta confirmada; aguardando atualização." : "Relatos consultados:"} {formatBrazilDate(current.queriedAt)}.
        </p> : null}
        <ul className="space-y-3" aria-label="Relatos da consulta" aria-busy={reading || moreBusy}>
          {rows?.map((row) => (
            <li
              className="rounded border border-(--line) p-4 wrap-break-word"
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
              <ActionButton
                className="mt-3"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  open(row.id);
                }}
              >
                Abrir relato <span className="sr-only">{row.id}</span>
              </ActionButton>
            </li>
          ))}
        </ul>
        {!reading && rows?.length === 0 && !error ? (
          <p>Nenhum relato encontrado para estes filtros.</p>
        ) : null}
        {next ? (
          <ActionButton
            className="mt-4"
            disabled={moreBusy || reading || Boolean(error)}
            onClick={() => void loadMore()}
          >
            Carregar mais relatos
          </ActionButton>
        ) : null}
      </section>
      {selected && (explicitReport || notice.data?.kind === "report") ? (
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
          key={editorOrigin?.id ?? "standalone"}
          sourceReminder={editorOrigin ?? undefined}
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
      <FlowReviews
        key={context.userId}
        context={context}
        products={catalogError ? [] : products}
        catalogReady={!catalogLoading && !catalogError}
        onChange={() => setAttempt((value) => value + 1)}
      />
    </div>
  );
}
