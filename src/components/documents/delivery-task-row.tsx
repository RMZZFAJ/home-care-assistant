import Link from "next/link";
import { ActionLink } from "@/components/ui/controls";
import { Icon, StatusBadge } from "@/components/ui/primitives";
import { formatBrazilDate } from "@/lib/receipt";
import { materialTransferLabel } from "@/lib/documents/transfer-follow-up";
import type { DeliveryListItem } from "@/types/documents";

const custody = { FAMILY: "Família", CARE_TEAM: "Equipe" };
export function DeliveryTaskRow({ row, fresh }: { row: DeliveryListItem; fresh: boolean }) {
  const facts = row.deliverySummary, href = "/documentos/" + row.id;
  const finalLines = row.document_lines.filter(line => line.fully_checked).length;
  const hasDirection = facts.source !== null && facts.destination !== null;
  return <article className="hca-delivery-task-row" data-delivery-id={row.id}>
    <span className="hca-delivery-task-icon"><Icon name="truck" /></span>
    <div className="hca-delivery-task-main">
      <Link href={href} prefetch={false} className="hca-delivery-code">{row.code ?? (row.status === "draft" ? "Rascunho" : "Registro sem expedição")}</Link>
      <small>ENT · {hasDirection ? materialTransferLabel(facts.source!, facts.destination!) : "Entrega / Entrada"} · {formatBrazilDate(row.created_at)}</small>
      <small>{hasDirection ? `${custody[facts.source!]} → ${custody[facts.destination!]}` : "Percurso não preservado neste registro"}</small>
      <small>Registrado por: {facts.recordedByName ?? "Nome não preservado neste registro"}</small>
      <small>Recebedor designado: {facts.recipientName ?? "Nome não preservado neste registro"}</small>
      {facts.counterpartyName ? <small>Concordância designada: {facts.counterpartyName}</small> : null}
      {facts.receivedByName ? <small>Conferência pessoal registrada por: {facts.receivedByName}</small> : null}
      <small>{row.document_lines.length} {row.document_lines.length === 1 ? "material" : "materiais"} · {finalLines}/{row.document_lines.length} linhas finalizadas</small>
      {row.task ? <p>{row.task.label}</p> : null}
    </div>
    <div className="hca-delivery-task-end">
      <StatusBadge status={row.status} />
      <ActionLink compact variant={row.task?.code === "receive" ? "primary" : "secondary"}
        href={row.task ? href + "?documentTab=workflow" : href}
        aria-disabled={row.task && !fresh ? true : undefined}
        tabIndex={row.task && !fresh ? -1 : undefined}
        onClick={event => { if (row.task && !fresh) event.preventDefault(); }}>
        {row.task?.code === "receive" ? "Conferir" : row.task ? "Abrir tarefa" : "Acompanhar"}
        <Icon name="arrow" />
      </ActionLink>
    </div>
  </article>;
}
