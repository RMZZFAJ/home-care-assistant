"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { api, Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";

export function RelatedDocument({ id, type = "REQ", label }: { id: string; type?: string; label: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="min-h-11 text-left font-semibold underline" onClick={() => setOpen(true)}>{label}</button>
    <Dialog open={open} title={label} onClose={() => setOpen(false)}>{open ? <RelatedContent id={id} type={type} /> : null}</Dialog></>;
}
function RelatedContent({ id, type }: { id: string; type: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: Record<string, unknown> }>((type === "REQ" ? "/api/requisitions/" : "/api/documents/") + id, undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result.data); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [id, type]);
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Notice>Consultando documento autorizado…</Notice>;
  const lines = (data.requisition_items ?? data.lines ?? []) as Record<string, unknown>[];
  return <div className="space-y-4"><p>{String(data.code ?? data.protocol)} · {formatBrazilDate(String(data.created_at))}</p>
    <ul className="space-y-2">{lines.map(line => <li className="rounded-lg border border-(--line) p-3 text-sm" key={String(line.id)}>{String(line.product_name_snapshot ?? line.name_snapshot ?? line.custom_name ?? "Produto")}{line.urgent ? " · Urgente" : ""}{line.quantity !== undefined ? " · Expedido/proposto " + String(line.quantity) : ""}{line.accepted_quantity !== undefined ? " · Aceito " + String(line.accepted_quantity) : ""}</li>)}</ul>
    <p className="text-xs text-(--muted)">Feche esta consulta para continuar de onde parou.</p></div>;
}
