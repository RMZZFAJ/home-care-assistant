"use client";
import { Menu } from "@base-ui/react/menu";
import { ActionButton, SelectField, TextInput } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { consumptionStateLabels } from "@/lib/consumption/follow-up";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionSummary } from "@/types/consumption";
import { ConsumptionEditor } from "./consumption-editor";
import { TeamConsumptionWizard } from "./team-consumption-wizard";
import { TeamConsumptionAction } from "./team-consumption-action";
import { ConsumptionRecord } from "./consumption-record";
import { ConsumptionDetail } from "./consumption-detail";
import { FlowReviews } from "./flow-reviews";
import type { FlowSubmission } from "@/lib/validation/flow-reviews";
import { parseConsumptionListRead } from "@/lib/validation/consumption";
import { parseStockBalances } from "@/lib/validation/stock-reads";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useNotificationReference } from "@/lib/notifications/use-notification-reference";
import {
  NotificationReference,
  type ReminderOrigin,
} from "@/components/notifications/notification-reference";

type Cursor = { at: string; id: string };
const emptyFilters = { q: "", kind: "", status: "", from: "", to: "" };
const filterKeys = ["q", "kind", "status", "from", "to"] as const;
const reportKinds = [
  { value: "", label: "Todos" },
  { value: "consumption", label: "Consumos" },
  { value: "shortage", label: "Faltas" },
];
export function ConsumptionConsole() {
  return (
    <Workspace title="Consumo e faltas" heading={context => (
      <div className="page-heading">
        {context.patient ? <p className="eyebrow">{context.patient.display_name}</p> : null}
        <h1>Consumo e faltas</h1>
        <p className="hca-stock-subtitle">Registros do plantão e avisos à família</p>
      </div>
    )}>
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
    [...filterKeys, "sourceReminder"]
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
  const [panel, setPanel] = useState<"filters" | "reference" | null>(null);
  const [editorOrigin, setEditorOrigin] = useState<ReminderOrigin | null>(null);
  const [teamEditor, setTeamEditor] = useState<HTMLElement | null>(null);
  const [teamFlow, setTeamFlow] = useState<FlowSubmission>();
  const [shortage, setShortage] = useState<HTMLElement | null>(null);
  const mayRecordTeam = can(context, "consumption.team.write") && context.patient?.is_active !== false;
  const mayReadStock = can(context, "stock.family.read") || can(context, "stock.team.read");
  const mayOpenLegacy = mayReadStock || can(context, "consumption.report");
  const hasFilters = filterKeys.some(key => Boolean(fields[key]));
  const decodeTeamStock = useCallback(
    (raw: unknown) => parseStockBalances(raw, { careRecipientId: patient, custody: "CARE_TEAM" }),
    [patient],
  );
  const stock = useScopedRead(
    mayRecordTeam ? `/api/stock/balances?careRecipientId=${patient}&custody=CARE_TEAM` : null,
    `${live}:${attempt}`,
    decodeTeamStock,
  );
  const listHeadingRef = useRef<HTMLHeadingElement>(null),
    filterRef = useRef<HTMLButtonElement>(null),
    moreRef = useRef<HTMLButtonElement>(null),
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
  function applyFilters(filters: typeof emptyFilters) {
    const values = new URLSearchParams(query);
    let changed = false;
    for (const key of filterKeys) {
      const value = filters[key].trim();
      if (value !== (values.get(key) ?? "")) changed = true;
      if (value) values.set(key, value);
      else values.delete(key);
    }
    setDraft(filters);
    if (!changed) {
      setAttempt(value => value + 1);
      return;
    }
    values.set("careRecipientId", patient);
    if (selected) {
      values.set("ref", selected);
      if (params.get("refKind")) values.set("refKind", params.get("refKind")!);
    }
    router.push("/consumo?" + values, { scroll: false });
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
          if (mayRecordTeam) setTeamEditor(opener);
          else setEditor(opener);
        }}
      />
      {message ? <Notice>{message}</Notice> : null}
      <section className="hca-consumption-list" aria-label="Relatos registrados">
        <h2 className="sr-only focus:not-sr-only" tabIndex={-1} ref={listHeadingRef}>
          Relatos registrados
        </h2>
        <div className="hca-stock-custody-tabs" role="group" aria-label="Tipo de registro">
          {reportKinds.map(({ value, label }) => (
            <button key={value} type="button" aria-pressed={fields.kind === value}
              onClick={() => applyFilters({ ...fields, q: draft.q, kind: value })}>{label}</button>
          ))}
        </div>
        <div className="hca-consumption-tools">
          <form role="search" className="hca-consumption-search" onSubmit={event => {
            event.preventDefault();
            applyFilters({ ...fields, q: draft.q });
          }}>
            <TextInput aria-label="Buscar relato ou material" placeholder="Buscar relato ou material"
              maxLength={120} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} />
            <ActionButton variant="quiet" compact type="submit" aria-label="Buscar relatos">
              <Icon name="search" />
            </ActionButton>
          </form>
          <ActionButton ref={filterRef} compact aria-label="Filtrar relatos" aria-haspopup="dialog"
            variant={fields.status || fields.from || fields.to ? "primary" : "secondary"}
            onClick={() => { setDraft({ ...fields, q: draft.q }); setPanel("filters"); }}>
            <Icon name="filter" />
          </ActionButton>
        </div>
        <div className="hca-stock-list-meta">
          <span className="hca-field-hint">
            {rows ? `${rows.length} ${rows.length === 1 ? "registro" : "registros"}${next ? " carregados" : ""}` : ""}
          </span>
          <div className="hca-consumption-list-links">
            <ActionButton compact variant="quiet" aria-label="Atualizar lista"
              onClick={() => setAttempt(value => value + 1)}><Icon name="refresh" /></ActionButton>
            {mayReadStock ? <Link className="hca-control hca-control--compact hca-control--secondary"
              href={`/estoque?careRecipientId=${patient}`}><Icon name="box" /> Estoque</Link> : null}
            <Menu.Root>
              <Menu.Trigger render={<ActionButton ref={moreRef} compact aria-label="Mais opções de consumo" />}>
                <Icon name="more" />
              </Menu.Trigger>
              <MenuPopup>
                <Menu.Item className="hca-menu-item" onClick={() => { setReferenceError(""); setPanel("reference"); }}>
                  <Icon name="link" /> Consultar referência
                </Menu.Item>
                {mayOpenLegacy ? <Menu.Item className="hca-menu-item" onClick={() => {
                  setEditorOrigin(null);
                  setEditor(moreRef.current);
                }}><Icon name="history" /> Relatos anteriores</Menu.Item> : null}
              </MenuPopup>
            </Menu.Root>
          </div>
        </div>
        {error ? (
          <Notice error>
            {error} Use Atualizar lista para repetir a consulta.
          </Notice>
        ) : null}
        {reading ? <Notice>Carregando relatos…</Notice> : null}
        {current?.queriedAt ? <p className={reading || error ? "hca-field-hint" : "sr-only"}>
          {reading || error ? "Última consulta confirmada; aguardando atualização." : "Relatos consultados:"} {formatBrazilDate(current.queriedAt)}.
        </p> : null}
        <ul className="hca-consumption-records" aria-label="Relatos da consulta" aria-busy={reading || moreBusy}>
          {rows?.map(row => <ConsumptionRecord key={row.id} row={row} onOpen={target => { triggerRef.current = target; open(row.id); }} />)}
        </ul>
        {!reading && rows?.length === 0 && !error ? (
          <div className="hca-consumption-empty">
            <Icon name="search" />
            <p>Nenhum relato encontrado para estes filtros.</p>
            {hasFilters ? <ActionButton compact onClick={() => applyFilters(emptyFilters)}>Limpar filtros</ActionButton> : null}
          </div>
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
        {mayRecordTeam ? <div className="hca-consumption-actions">
          <ActionButton onClick={event => setShortage(event.currentTarget)}><Icon name="bell" /> Avisar falta</ActionButton>
          <ActionButton variant="primary" onClick={event => {
            setEditorOrigin(null);
            setTeamEditor(event.currentTarget);
          }}><Icon name="plus" /> Registrar consumo</ActionButton>
        </div> : null}
      </section>
      <Drawer open={panel === "filters"} title="Filtrar relatos" headingIcon="filter"
        popupClassName="hca-consumption-sheet" onClose={() => setPanel(null)} finalFocus={filterRef}>
        <form className="grid gap-4" onSubmit={event => {
          event.preventDefault();
          applyFilters(draft);
          setPanel(null);
        }}>
          <label className="grid gap-1 text-sm">Estado
            <SelectField value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
              <option value="">Todos</option>
              {Object.entries(consumptionStateLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </SelectField>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">Desde
              <input className={inputClass} type="date" value={draft.from}
                onChange={event => setDraft({ ...draft, from: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">Até
              <input className={inputClass} type="date" value={draft.to}
                onChange={event => setDraft({ ...draft, to: event.target.value })} />
            </label>
          </div>
          <div className="hca-toolbar">
            <ActionButton onClick={() => { applyFilters(emptyFilters); setPanel(null); }}>Limpar filtros</ActionButton>
            <ActionButton type="submit" variant="primary">Aplicar filtros</ActionButton>
          </div>
        </form>
      </Drawer>
      <Drawer open={panel === "reference"} title="Consultar referência" headingIcon="link"
        popupClassName="hca-consumption-sheet" onClose={() => setPanel(null)} finalFocus={moreRef}>
        <form className="grid gap-3" onSubmit={event => {
          event.preventDefault();
          const id = String(new FormData(event.currentTarget).get("reference") ?? "").trim();
          if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
            setReferenceError("Confira a referência completa do relato.");
            return;
          }
          setPanel(null);
          triggerRef.current = moreRef.current;
          open(id);
        }}>
          <label className="grid gap-1 text-sm">Referência do relato
            <TextInput name="reference" maxLength={36} required aria-invalid={Boolean(referenceError)}
              aria-describedby={referenceError ? "consumption-reference-error" : undefined} />
          </label>
          {referenceError ? <p role="alert" id="consumption-reference-error">{referenceError}</p> : null}
          <div><ActionButton type="submit" variant="primary">Abrir relato</ActionButton></div>
        </form>
      </Drawer>
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
          onOpenRecord={open}
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
      {teamEditor && mayRecordTeam ? <TeamConsumptionWizard context={context} products={products}
        balances={new Map((stock.data?.overview ?? []).flatMap(item => item.team ? [[item.productId, item.team.confirmed] as const] : []))}
        materialLoading={stock.loading || catalogLoading}
        materialError={stock.error || catalogError}
        retryMaterials={() => { stock.refresh(); catalogRetry(); }}
        opener={teamEditor} sourceReminder={editorOrigin ?? undefined} sourceFlow={teamFlow}
        onClose={() => { setTeamEditor(null); setEditorOrigin(null); setTeamFlow(undefined); }}
        onSaved={id => {
          setTeamEditor(null);
          setEditorOrigin(null);
          setTeamFlow(undefined);
          setMessage("Consumo registrado no estoque da equipe.");
          setAttempt(value => value + 1);
          open(id);
        }} /> : null}
      {shortage && mayRecordTeam ? <TeamConsumptionAction context={context} kind="shortage" products={products}
        opener={shortage} onClose={() => setShortage(null)} onSaved={id => {
          setShortage(null);
          setAttempt(value => value + 1);
          open(id);
        }} /> : null}
      <FlowReviews
        key={context.userId}
        context={context}
        products={catalogError ? [] : products}
        catalogReady={!catalogLoading && !catalogError}
        refreshRevision={attempt}
        onContinueConsumption={mayRecordTeam ? (source, opener) => {
          setEditorOrigin(null);
          setTeamFlow(source);
          setTeamEditor(opener);
        } : undefined}
        onChange={() => setAttempt((value) => value + 1)}
      />
    </div>
  );
}
