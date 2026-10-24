"use client";
import Link from "next/link";
import type { DashboardData } from "@/types/dashboard";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import { MetricCard } from "./metric-card";
import { TaskList } from "./task-list";
import { CriticalStockSummary, RecentDocuments, RequestProgress } from "./dashboard-summary";

export function ManagementDashboard({ context, data }: { context: WorkspaceContext; data: DashboardData }) {
  return <div className="hca-dashboard">
    <div className="hca-dashboard-intro"><div><h2>O que precisa da sua atenção</h2><p>Decisões e acompanhamento de {context.patient?.display_name}.</p></div><div className="hca-toolbar">
      {can(context, "ent.create") ? <Link href="/fichas/ent" className="ui-button ui-button-primary" prefetch={false}><Icon name="plus" />Nova entrega</Link> : null}
      {can(context, "com.create") ? <Link href="/fichas/com" className="ui-button ui-button-secondary" prefetch={false}>Organizar compra</Link> : null}
    </div></div>
    <div className="hca-dashboard-metrics">
      {can(context, "req.read") ? <MetricCard label="Requisições abertas" value={data.requests} href="/historico?type=REQ" icon="forms" /> : null}
      {can(context, "ent.read") ? <MetricCard label="Entregas a conferir" value={data.teamReceipts} href="/entregas" icon="truck" /> : null}
      {data.sciencePending > 0 ? <MetricCard label="Ciências pendentes" value={data.sciencePending} href="/historico?type=REQ&status=science_required" icon="check" /> : null}
      {can(context, "com.approve") ? <MetricCard label="Compras a aprovar" value={data.purchases} href="/historico?type=COM&status=pending_approval" icon="stock" /> : null}
      {data.criticalStock.length ? <MetricCard label="Saldos abaixo do mínimo" value={data.criticalStock.length} href="/estoque" icon="stock" /> : null}
    </div>
    <div className="hca-dashboard-columns"><TaskList title="Ações que precisam de você" tasks={data.pendingTasks} /><div className="hca-dashboard-stack"><RequestProgress data={data} /><CriticalStockSummary data={data} /></div></div>
    <RecentDocuments data={data} />
  </div>;
}
