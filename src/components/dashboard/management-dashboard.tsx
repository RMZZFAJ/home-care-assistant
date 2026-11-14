"use client";
import Link from "next/link";
import type { DashboardData } from "@/types/dashboard";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import { MetricCard } from "./metric-card";
import { TaskList } from "./task-list";
import { TaskAttention } from "./task-attention";
import { DashboardNotices } from "./dashboard-notices";
import { OpenRequests } from "./open-requests";
import { CriticalStockSummary, RecentDocuments, ShiftSummary } from "./dashboard-summary";
import { WeekSchedule } from "./week-schedule";

export function ManagementDashboard({ context, data }: { context: WorkspaceContext; data: DashboardData; }) {
  return <div className="dashboard-v2 family-dashboard">
    <TaskAttention tasks={data.pendingTasks} context={context} />
    <div className="home-quick-actions">
      {can(context, "ent.create") ? <Link href="/fichas/ent" className="btn btn-primary" prefetch={false}><Icon name="truck" width={16} height={16} />Nova entrega</Link> : null}
      {can(context, "ent.create") ? <Link href="/fichas/devolucao" className="btn" prefetch={false}><Icon name="truck" width={16} height={16} />Nova devolução</Link> : null}
      {can(context, "com.create") ? <Link href="/fichas/com" className="btn" prefetch={false}><Icon name="plus" width={16} height={16} />Nova compra</Link> : null}
    </div>
    <div className="metrics-grid">
      {can(context, "req.read") ? <MetricCard label="Requisições em aberto" value={data.requests} href="/historico?type=REQ&status=open" icon="forms" action="Ver requisições" /> : null}
      {can(context, "ent.read") ? <MetricCard label="Entregas a conferir" value={data.teamReceipts} href="/entregas" icon="truck" action="Ver entregas" /> : null}
      {can(context, "req.science") ? <MetricCard label="Ciências pendentes" value={data.sciencePending} href="/historico?type=REQ&status=science_required" icon="check" action="Ver requisições" /> : null}
      {can(context, "com.approve") ? <MetricCard label="Compras a aprovar" value={data.purchases} href="/historico?type=COM&status=pending_approval" icon="stock" action="Ver compras" /> : null}
      {data.archivePending > 0 ? <MetricCard label="Conclusões para revisar e arquivar" value={data.archivePending} href="/historico?type=REQ&status=archive_pending" icon="history" action="Revisar conclusões" /> : null}
      {data.criticalStock.length ? <MetricCard label="Saldos abaixo do mínimo" value={data.criticalStock.length} href="/estoque" icon="stock" action="Consultar estoque" /> : null}
    </div>
    <div className="dashboard-grid"><div className="dashboard-main"><div className="hca-home-tasks"><TaskList title="Suas pendências" tasks={data.pendingTasks} /></div><OpenRequests patientId={context.patient!.id} /></div><aside className="dashboard-aside"><DashboardNotices patientId={context.patient!.id} /><WeekSchedule context={context} /><ShiftSummary data={data} /></aside></div>
    <CriticalStockSummary data={data} />
    <RecentDocuments data={data} />
  </div>;
}
