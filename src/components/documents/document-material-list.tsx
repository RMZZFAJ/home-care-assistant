"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { ActionButton, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { formatQuantity } from "@/lib/quantity";
import { useScopedRead } from "@/lib/use-scoped-read";
import { consumeMaterialVisit } from "@/lib/documents/material-visit";
import { documentMaterialSummary, materialPanelSections } from "@/lib/validation/document-material-context";
import { DocumentMaterialPanel, type LinkedMaterialDocument, type MaterialPanelPosition } from "./document-material-panel";

export type DocumentMaterialRow = {
  id: string;
  name: string;
  unit: string | null;
  status: string;
  statusDetail?: string;
  tone: "neutral" | "pending" | "success" | "danger";
  urgent?: boolean;
  done: boolean;
  pending?: boolean;
  facts: { label: string; value: ReactNode }[];
  detail?: ReactNode;
  related?: { document: LinkedMaterialDocument; detail: ReactNode }[];
};

const filters = ["all", "urgent", "pending", "done", "routine"] as const;
type Filter = typeof filters[number];
const place = z.object({
  documentId: z.uuid(), patientId: z.uuid(), actorId: z.uuid(),
  lineId: z.uuid(), section: z.enum(materialPanelSections),
  page: z.number().int().min(1).max(1_000_000), linked: z.object({
    id: z.uuid(), code: z.string().nullable(), type: z.enum(["REQ", "COM", "ENT", "BAL"]),
    kind: z.enum(["REQ", "COM", "ENT", "DEV", "BAL"]).optional(),
  }).nullable(),
  panelScroll: z.number(), pageScroll: z.number(), focusEntry: z.string().optional(),
  filter: z.enum(filters), search: z.string().max(160),
});

export function DocumentMaterialList({
  documentId, patientId, revision, active, label, heading, rows, settledLabel, today,
}: {
  documentId: string;
  patientId: string;
  revision: string;
  active: boolean;
  label: string;
  heading: ReactNode;
  rows: DocumentMaterialRow[];
  settledLabel: string;
  today: { location: "family" | "team"; label: string };
}) {
  const actorId = useWorkspaceState().data?.userId;
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [position, setPosition] = useState<MaterialPanelPosition | null>(null);
  const [epoch, setEpoch] = useState(0);
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const decode = useCallback((raw: unknown) => {
    const summary = documentMaterialSummary.parse(raw);
    if (summary.documentId !== documentId || summary.patientId !== patientId) throw new Error("A resposta pertence a outra ficha.");
    return summary;
  }, [documentId, patientId]);
  const readRevision = `${actorId ?? ""}:${revision}:${epoch}`;
  const summary = useScopedRead(active ? `/api/documents/${documentId}/materials` : null, readRevision, decode);
  const currentSummary = summary.loading || summary.error ? null : summary.data;
  const stock = new Map(currentSummary?.balances.map(row => [row.lineId, row]));
  const references = new Map<string, NonNullable<DocumentMaterialRow["related"]>>();
  for (const { lineId, document } of currentSummary?.references ?? []) {
    const list = references.get(lineId) ?? [];
    list.push({ document, detail: "Referência vinculada a este material" });
    references.set(lineId, list);
  }
  const materialRows = rows.map(row => {
    const additional = references.get(row.id);
    return additional ? {
      ...row, related: [...(row.related ?? []), ...additional.filter(link =>
        !row.related?.some(previous => previous.document.id === link.document.id))],
    } : row;
  });
  const selected = position && materialRows.find(row => row.id === position.lineId);

  useEffect(() => {
    if (!active) return;
    const invalidate = () => setEpoch(value => value + 1);
    window.addEventListener("hca:data-changed", invalidate);
    window.addEventListener("hca:profile-updated", invalidate);
    return () => {
      window.removeEventListener("hca:data-changed", invalidate);
      window.removeEventListener("hca:profile-updated", invalidate);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      const saved = place.safeParse(window.history.state?.hcaMaterialReturn);
      if (!saved.success || saved.data.documentId !== documentId || saved.data.patientId !== patientId
        || saved.data.actorId !== actorId) return;
      const { search, filter, pageScroll, ...resume } = saved.data;
      window.history.replaceState({ ...window.history.state, hcaMaterialReturn: null }, "", window.location.href);
      consumeMaterialVisit();
      setSearch(search);
      setFilter(filter);
      setPosition(resume);
      requestAnimationFrame(() => window.scrollTo({ top: pageScroll, behavior: "instant" }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, actorId, documentId, patientId]);

  function saveReturn(panel: MaterialPanelPosition) {
    const restore = { ...panel, documentId, patientId, actorId, filter, search, pageScroll: window.scrollY };
    window.history.replaceState({ ...window.history.state, hcaMaterialReturn: restore }, "", window.location.href);
  }

  const filterTitles = { all: "Todos", urgent: "Urgentes", pending: "Pendentes", done: settledLabel, routine: "Rotina" };
  const query = normalizeCatalogText(search);
  const matching = materialRows.filter(row => normalizeCatalogText(row.name).includes(query));
  function matches(row: DocumentMaterialRow, value: Filter) {
    switch (value) {
      case "urgent": return Boolean(row.urgent);
      case "pending": return row.pending ?? !row.done;
      case "done": return row.done;
      case "routine": return !row.urgent;
      default: return true;
    }
  }
  const visible = matching.filter(row => matches(row, filter));
  const count = (value: Filter) => matching.filter(row => matches(row, value)).length;
  return <div className="doc-area hca-document-materials">
    <section className="doc-card hca-v7-material-list" aria-label={label}>
      <header className="doc-section-heading hca-v7-material-heading"><div>{heading}</div></header>
      <div className="hca-v7-material-tools">
        <ActionButton ref={filterButtonRef} variant="quiet" aria-expanded={filterOpen} onClick={() => setFilterOpen(value => !value)}>
          <Icon name="sliders" />{filterTitles[filter]} ({count(filter)})<Icon name="down" />
        </ActionButton>
        <TextInput ref={searchRef} type="search" aria-label="Pesquisar material" placeholder="Buscar" value={search}
          maxLength={160} onChange={event => setSearch(event.currentTarget.value)} />
      </div>
      {filterOpen ? <div className="hca-v7-material-filters" role="group" aria-label="Filtrar materiais">
        {filters.map(value => <ActionButton key={value} variant={value === filter ? "primary" : "quiet"} aria-pressed={value === filter}
          onClick={() => {
            setFilter(value);
            setFilterOpen(false);
            filterButtonRef.current?.focus();
          }}>{filterTitles[value]} ({count(value)})</ActionButton>)}
      </div> : null}
      {summary.error ? <div className="hca-v7-material-read-error">
        <p role="status">O saldo atual não pôde ser consultado.</p><ActionButton onClick={summary.refresh}>Atualizar saldo</ActionButton>
      </div> : null}
      {visible.length ? <ul aria-label={label}>
        {visible.map(row => {
          const balance = stock.get(row.id)?.[today.location];
          return <li key={row.id} data-material-line-id={row.id}>
            <button type="button" className="hca-v7-material-row" data-urgent={row.urgent || undefined}
              aria-label={`Detalhes de ${row.name}${row.urgent ? " · Urgente" : ""}`}
              aria-describedby={[`material-status-${row.id}`, `material-unit-${row.id}`, `material-facts-${row.id}`,
                row.statusDetail ? `material-status-detail-${row.id}` : null, row.related?.length ? `material-links-${row.id}` : null].filter(Boolean).join(" ")}
              ref={element => { if (element) buttonsRef.current.set(row.id, element); else buttonsRef.current.delete(row.id); }}
              onClick={() => setPosition({ lineId: row.id, section: "stock", page: 1, linked: null, panelScroll: 0 })}>
              <span className="hca-v7-material-title">
                <strong>{row.name}</strong>
                <span className={`ui-badge ui-badge-${row.tone}`} id={`material-status-${row.id}`}>{row.status}</span><Icon name="chevron" width={15} height={15} />
              </span>
              <small className="hca-v7-material-unit" id={`material-unit-${row.id}`}>{row.unit ?? "Unidade não preservada"}</small>
              {row.statusDetail ? <small className="hca-v7-material-unit" id={`material-status-detail-${row.id}`}>{row.statusDetail}</small> : null}
              {row.related?.length ? <small className="hca-v7-material-document-codes" id={`material-links-${row.id}`}>
                <Icon name="link" width={12} height={12} />
                {[...new Set(row.related.map(item => item.document.code ?? item.document.kind ?? item.document.type))].join(" · ")}
              </small> : null}
              <span className="hca-v7-material-facts" id={`material-facts-${row.id}`}>
                {[...row.facts, { label: today.label, value: balance === undefined || balance === null
                  ? summary.loading ? "Consultando…" : "Não disponível" : formatQuantity(balance) }].map(fact =>
                  <span key={fact.label}><small>{fact.label}</small><b>{fact.value}</b></span>)}
              </span>
            </button>
          </li>;
        })}
      </ul> : <div className="hca-v7-material-read-error"><p role="status">Nenhum material neste filtro.</p>
        {search ? <ActionButton onClick={() => {
          setSearch("");
          searchRef.current?.focus();
        }}>Limpar busca</ActionButton> : null}</div>}
    </section>
    {active && selected && position ? <DocumentMaterialPanel
      row={selected} documentId={documentId} patientId={patientId} revision={readRevision}
      position={position} onPosition={setPosition} onNavigate={saveReturn}
      finalFocus={() => buttonsRef.current.get(selected.id) ?? false} onClose={() => setPosition(null)}
    /> : null}
  </div>;
}
