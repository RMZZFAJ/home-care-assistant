"use client";
import Link from "next/link";
import type { DashboardData } from "@/types/dashboard";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import { TaskList } from "./task-list";
import { TaskAttention } from "./task-attention";
import { DashboardNotices } from "./dashboard-notices";
import { MetricCard } from "./metric-card";
import { CriticalStockSummary, RecentDocuments, ShiftSummary } from "./dashboard-summary";

export function OperationsDashboard({ context, data }: { context: WorkspaceContext; data: DashboardData; }) {
  const supervisor = context.patient?.role === "supervisor";
  return <div className="dashboard-v2 operational-dashboard">
    <TaskAttention tasks={data.pendingTasks} context={context} />
    <div className="home-quick-actions">
      {supervisor && can(context, "bal.read") ? <Link href="/historico?type=BAL&status=submitted" className="btn btn-primary" prefetch={false}><Icon name="forms" />Acompanhar balanços</Link> : can(context, "req.create") ? <Link href="/fichas/req" className="btn btn-primary" prefetch={false}><Icon name="plus" />Nova requisição</Link> : null}
      {can(context, "consumption.report") ? <Link href="/consumo" className="btn" prefetch={false}><Icon name="forms" />Registrar consumo</Link> : null}
    </div>
    <div className="dashboard-grid"><TaskList title={supervisor ? "Pendências da equipe" : "Suas pendências"} tasks={data.pendingTasks} /><aside className="dashboard-aside"><DashboardNotices patientId={context.patient!.id} />{supervisor ? <div className="metrics-grid"><MetricCard label="Balanços para revisar" value={data.balances} href="/historico?type=BAL&status=submitted" icon="forms" action="Ver balanços" /><MetricCard label="Entregas a conferir" value={data.teamReceipts} href="/entregas" icon="truck" action="Ver entregas" /></div> : null}<ShiftSummary data={data} /></aside></div>
    {supervisor ? <CriticalStockSummary data={data} /> : null}
    <RecentDocuments data={data} />
  </div>;
}
