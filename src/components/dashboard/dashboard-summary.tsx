"use client";
import Link from "next/link";
import { ProgressBar } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";
import { DocumentRow } from "@/components/documents/document-history";
import type { DashboardData } from "@/types/dashboard";
import { formatQuantity } from "@/lib/quantity";

export function RecentDocuments({ data }: { data: DashboardData }) {
  return <section className="hca-records"><div className="hca-dashboard-section-heading"><h2>Movimentações recentes</h2><Link href="/historico" prefetch={false}>Ver histórico</Link></div>
    {data.recent.length ? data.recent.map((row) => <DocumentRow key={row.id} row={row} />) : <p className="p-5 text-sm text-(--muted)">As fichas emitidas aparecerão aqui.</p>}
  </section>;
}
export function RequestProgress({ data }: { data: DashboardData }) {
  const request = data.recent.find((row) => row.type === "REQ" && row.fulfillment);
  if (!request?.fulfillment) return null;
  return <section className="ui-card hca-request-progress"><div className="hca-section-heading"><h2>Atendimento da requisição</h2><Icon name="forms" /></div>
    <strong>{request.code}</strong><p>{request.fulfillment.fulfilled} de {request.fulfillment.total} itens atendidos</p>
    <ProgressBar value={request.fulfillment.fulfilled} max={Math.max(1, request.fulfillment.total)} aria-label="Itens da requisição atendidos" />
    <p className="text-xs text-(--muted)">Ciência familiar e recebimento de materiais possuem registros próprios.</p>
    <Link href={"/historico/" + request.id} className="ui-button ui-button-secondary" prefetch={false}>Abrir requisição</Link>
  </section>;
}
export function CriticalStockSummary({ data }: { data: DashboardData }) {
  if (!data.criticalStock.length) return null;
  return <section className="hca-records"><div className="hca-dashboard-section-heading"><h2>Estoque que precisa de atenção</h2><Icon name="stock" /></div>
    {data.criticalStock.slice(0, 4).map((item) => <Link className="hca-record" key={item.productId + item.custody} href={"/estoque?custody=" + item.custody} prefetch={false}>
      <span className="hca-record-main"><strong>{item.name}</strong><small>{item.custody === "FAMILY" ? "Família" : "Equipe"} · Confirmado: {formatQuantity(item.confirmed)} {item.unit} · Mínimo: {formatQuantity(item.minimum)}</small></span><Icon name="arrow" />
    </Link>)}
  </section>;
}
