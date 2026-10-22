"use client";
import Link from "next/link";
import { buttonClass } from "@/components/workspace";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { buildWhatsAppSummary, formatBrazilDate } from "@/lib/receipt";
import type { RequisitionReceipt } from "@/types/requisition";
import { Summary } from "./requisition-steps";

export type SavedReceipt = RequisitionReceipt & {
  id?: string;
  requisitionId?: string;
};

export function Receipt({ receipt }: { receipt: SavedReceipt }) {
  const share = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(buildWhatsAppSummary(receipt))}`,
      "_blank",
      "noopener,noreferrer",
    );
  return (
    <div className="p-3 sm:p-5">
      <section className="mx-auto max-w-3xl rounded-2xl border border-(--line) bg-white p-5 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
          Requisição registrada
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Comprovante oficial</h1>
        <div className="mt-6 grid gap-4 rounded-xl bg-[#f1f7f7] p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-(--muted)">Protocolo</p>
            <p className="text-xl font-bold">{receipt.protocol}</p>
          </div>
          <div>
            <p className="text-sm text-(--muted)">Data e hora</p>
            <p className="font-semibold">
              {formatBrazilDate(receipt.createdAt)}
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm">
          Solicitante: <strong>{receipt.requesterName}</strong>
          <br />
          Pessoa assistida: <strong>{receipt.recipientName}</strong>
        </p>
        <Summary
          title="Itens"
          rows={[
            ...receipt.lines.map(
              (item) =>
                `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
            ),
            ...receipt.extraItems.map(
              (item) =>
                `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
            ),
          ]}
        />
        <Summary title="Observações" rows={receipt.observations} />
        {receipt.id || receipt.requisitionId ? (
          <DocumentDeliveryStatus id={(receipt.id ?? receipt.requisitionId)!} />
        ) : null}
        <div className="mt-8 flex flex-col gap-3 border-t border-(--line) pt-5 sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-12 rounded-lg bg-(--brand) px-4 py-2 text-sm font-bold text-white"
          >
            Imprimir / salvar como PDF
          </button>
          <button
            type="button"
            onClick={share}
            className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
          >
            Compartilhar resumo pelo WhatsApp
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          <Link
            className={buttonClass}
            href={
              receipt.id || receipt.requisitionId
                ? `/historico/${receipt.id ?? receipt.requisitionId}`
                : "/historico"
            }
          >
            Consultar registro e notificações
          </Link>
          <Link className={buttonClass} href="/fichas/req">
            Nova requisição
          </Link>
        </div>
        <p className="mt-4 text-xs text-(--muted)">
          O compartilhamento abre uma conversa com texto pré-preenchido; nenhum
          PDF é anexado automaticamente.
        </p>
      </section>
    </div>
  );
}
