"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ActionButton, FormField, Pill, SelectField, TextInput, type PillTone } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { documentStatusLabel } from "@/lib/documents/presentation";
import { formatBrazilDate } from "@/lib/receipt";
import type { DocumentSummary } from "@/types/documents";

const statuses = {
  submitted: { label: "Em revisão", tone: "warning" },
  approved: { label: "Aplicado", tone: "success" },
  draft: { label: "Rascunho", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
  archived: { label: "Arquivado", tone: "neutral" },
} satisfies Record<string, { label: string; tone: PillTone }>;

export function balanceHistoryStatus(status: string) {
  return Object.hasOwn(statuses, status) ? statuses[status as keyof typeof statuses] :
    { label: documentStatusLabel(status), tone: "neutral" as const };
}

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
});

export function BalanceHistoryRow({ row, href }: { row: DocumentSummary; href: string }) {
  const status = balanceHistoryStatus(row.status);
  return <Link href={href} className="hca-balance-review-link" prefetch={false}>
    <span className="hca-balance-preview-icon"><Icon name="file" width={21} height={21} /></span>
    <span>
      <strong>{row.code ?? (row.status === "draft" ? "Rascunho de balanço" : "Contagem de estoque")}</strong>
      <small><time dateTime={row.created_at} title={formatBrazilDate(row.created_at)}>{shortDate.format(new Date(row.created_at))}</time>
        {" · "}{row.balanceCounterName ?? (row.status === "draft" ? "Contagem ainda não emitida" : "Autoria da contagem não preservada")}
      </small>
    </span>
    <Pill tone={status.tone}>{status.label}</Pill>
  </Link>;
}

type Filters = { search: string; status: string; from: string; to: string };

export function BalanceHistoryFilters({ filters, count, onApply }: {
  filters: Filters;
  count: number;
  onApply: (filters: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const formId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return <>
    <div className="hca-balance-list-heading">
      <h2 id="balance-history-heading">Balanços registrados</h2>
      <ActionButton ref={triggerRef} className="hca-balance-settings-link hca-balance-history-filter" aria-label="Filtrar balanços" aria-haspopup="dialog"
        onClick={() => { setDraft(filters); setOpen(true); }}>
        <Icon name="sliders" width={18} height={18} />
        {count ? <span className="badge badge-neutral" aria-hidden="true">{count}</span> : null}
      </ActionButton>
    </div>
    <Dialog open={open} title="Filtrar balanços" finalFocus={triggerRef} onClose={() => setOpen(false)} footer={<>
      <ActionButton onClick={() => setOpen(false)}>Voltar</ActionButton>
      <ActionButton variant="primary" type="submit" form={formId}>Aplicar filtro</ActionButton>
    </>}>
      <form className="hca-form-stack" id={formId} onSubmit={event => {
        event.preventDefault();
        setOpen(false);
        onApply({ ...draft, search: draft.search.trim() });
      }}>
        <FormField label="Situação"><SelectField value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
          <option value="">Todas</option>
          {Object.entries(statuses).map(([key, status]) => <option key={key} value={key}>{status.label}</option>)}
          {draft.status && !Object.hasOwn(statuses, draft.status) ? <option value={draft.status}>{balanceHistoryStatus(draft.status).label}</option> : null}
        </SelectField></FormField>
        <FormField label="A partir de"><TextInput type="date" value={draft.from} max={draft.to || undefined}
          onChange={event => setDraft({ ...draft, from: event.target.value })} /></FormField>
        <FormField label="Até"><TextInput type="date" value={draft.to} min={draft.from || undefined}
          onChange={event => setDraft({ ...draft, to: event.target.value })} /></FormField>
        <FormField label="Código ou protocolo"><TextInput type="search" value={draft.search} maxLength={100}
          onChange={event => setDraft({ ...draft, search: event.target.value })} /></FormField>
      </form>
    </Dialog>
  </>;
}
