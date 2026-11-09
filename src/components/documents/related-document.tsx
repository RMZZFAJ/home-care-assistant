"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { api, Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { RequisitionOpening } from "@/components/requisitions/requisition-opening";
import { RequisitionDisplay } from "@/components/requisitions/requisition-display";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";
import type { DocumentType, SupplyType } from "@/types/documents";
import { SupplyLineSummary } from "./supply-line-summary";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseRelatedSupplyRead } from "@/lib/validation/related-document";

export function RelatedDocument({
  id,
  type = "REQ",
  label,
}: {
  id: string;
  type?: DocumentType;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="min-h-11 text-left font-semibold underline"
        onClick={(event) => { event.currentTarget.focus(); setOpen(true); }}
      >
        {label}
      </button>
      {open ? <Dialog open title={label} onClose={close}>
        {type === "REQ" ? <RequisitionOpening id={id} withinDialog onCancel={close}><RelatedContent id={id} type={type} /></RequisitionOpening> : <RelatedSupplyContent key={id + type} id={id} type={type} />}
      </Dialog> : null}
    </>
  );
}
function RelatedSupplyContent({ id, type }: { id: string; type: SupplyType }) {
  const decode = useCallback((value: unknown) => parseRelatedSupplyRead(value, id, type), [id, type]);
  const read = useScopedRead(`/api/documents/${id}`, "", decode);
  const data = !read.loading && !read.error ? read.data?.data : null;
  return <div className="space-y-4" aria-busy={read.loading}>
    <button type="button" className="min-h-11 font-semibold underline" aria-disabled={read.loading} onClick={() => { if (!read.loading) read.refresh(); }}>Atualizar consulta</button>
    {read.loading ? <Notice>Consultando documento autorizado…</Notice> : read.error ? <Notice error>{read.error}</Notice> : data ? <>
      <p>{data.code} · {formatBrazilDate(data.created_at)}</p>
      {data.lines.map(line => <SupplyLineSummary key={line.id} line={line} type={type} status={data.status} declarationOnly={Boolean(data.transfer && data.transfer.state !== "dispatched")} />)}
    </> : null}
    <p className="text-xs text-(--muted)">Feche esta consulta para continuar de onde parou.</p>
  </div>;
}
function RelatedContent({ id, type }: { id: string; type: "REQ" }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: Record<string, unknown> }>(
      (type === "REQ" ? "/api/requisitions/" : "/api/documents/") + id,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [id, type]);
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Notice>Consultando documento autorizado…</Notice>;
  const lines = (data.requisition_items ?? data.lines ?? []) as Record<
    string,
    unknown
  >[];
  return (
    <div className="space-y-4">
      {type === "REQ" ? <RequisitionDisplay key={id} id={id} reference={data.progress as { version: number; materialIdentity: string }} /> : null}
      <p>
        {String(data.code ?? data.protocol)} ·{" "}
        {formatBrazilDate(String(data.created_at))}
      </p>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li
            className="rounded-lg border border-(--line) p-3 text-sm"
            key={String(line.id)}
          >
            {String(
              line.product_name_snapshot ??
                line.name_snapshot ??
                line.custom_name ??
                "Produto",
            )}
            {line.urgent ? " · Urgente" : ""}
            {type === "REQ" ? <><p>Estoque da equipe: {formatStockObservation(typeof line.current_stock === "number" || typeof line.current_stock === "string" ? line.current_stock : null, line.stock_observation as StockObservation, typeof line.unit_snapshot === "string" ? line.unit_snapshot : undefined)}</p><p className="text-xs text-(--muted)">{formatStockObservationTime(typeof line.stock_observation_at === "string" ? line.stock_observation_at : null, line.stock_observation_time_source as StockObservationTimeSource)}</p></> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-(--muted)">
        Feche esta consulta para continuar de onde parou.
      </p>
    </div>
  );
}
