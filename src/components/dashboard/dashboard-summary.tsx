"use client";
import { ProgressMeter } from '@/components/ui/feedback';
import Link from "next/link";

import { Icon } from "@/components/ui/primitives";
import { DocumentRow } from "@/components/documents/document-history";
import type { DashboardData } from "@/types/dashboard";
import { formatQuantity } from "@/lib/quantity";
import { ModelSectionHead } from "@/components/ui/model-section";

export function ShiftSummary({data}:{data:DashboardData}) {
  const s=data.nextShift;
  if(!s)return null;
  const stamp=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:s.timezone,dateStyle:"short",timeStyle:"short"}).format(new Date(value));
  return <section className="card week-card"><ModelSectionHead title={s.active?"Plantão previsto para agora":"Próximo plantão previsto"} icon="calendar" action={<Link className="btn btn-ghost" href="/escalas" prefetch={false}>Ver escala<Icon name="arrow" /></Link>} /><div className="card-body"><strong>{s.shift_types?.name} · {s.professionalName}</strong><p>{stamp(s.starts_at)} → {stamp(s.ends_at)}</p></div></section>;
}

export function RecentDocuments({ data }: { data: DashboardData }) {
  return <section className="card recent-card"><ModelSectionHead title="Movimentações recentes" icon="history" action={<Link className="btn btn-ghost" href="/historico" prefetch={false}>Ver histórico<Icon name="arrow" /></Link>} />
    <div className="av-record-list">{data.recent.length ? data.recent.map((row) => <DocumentRow key={row.id} row={row} />) : <p className="card-body">As fichas emitidas aparecerão aqui.</p>}</div>
  </section>;
}
export function RequestProgress({ data }: { data: DashboardData }) {
  const request = data.recent.find((row) => row.type === "REQ" && row.fulfillment);
  if (!request?.fulfillment) return null;
  return <section className="ui-card hca-request-progress"><div className="hca-section-heading"><h2>Atendimento da requisição</h2><Icon name="forms" /></div>
    <strong>{request.code}</strong><p>{request.fulfillment.fulfilled} de {request.fulfillment.total} itens atendidos</p>
    <ProgressMeter value={request.fulfillment.fulfilled} max={Math.max(1, request.fulfillment.total)} aria-label="Itens da requisição atendidos" />
    <p className="text-xs text-(--muted)">Ciência familiar e recebimento de materiais possuem registros próprios.</p>
    <Link href={"/documentos/" + request.id} className="ui-button ui-button-secondary" prefetch={false}>Abrir requisição</Link>
  </section>;
}
export function CriticalStockSummary({ data }: { data: DashboardData }) {
  if (!data.criticalStock.length) return null;
  return <section className="card"><ModelSectionHead title="Estoque que precisa de atenção" icon="stock" />
    {data.criticalStock.slice(0, 4).map((item) => <Link className="av-task" key={item.productId + item.custody} href={"/estoque?custody=" + item.custody} prefetch={false}>
      <span className="task-icon"><Icon name="box" width={18} height={18} /></span><span><strong>{item.name}</strong><small>{item.custody === "FAMILY" ? "Família" : "Equipe"} · Confirmado: {formatQuantity(item.confirmed)} {item.unit} · Mínimo: {formatQuantity(item.minimum)}</small></span><Icon name="chevron" />
    </Link>)}
  </section>;
}
