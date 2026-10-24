"use client";
import Link from "next/link";
import type { DashboardData } from "@/types/dashboard";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import { TaskList } from "./task-list";
import { MetricCard } from "./metric-card";
import { CriticalStockSummary, RecentDocuments } from "./dashboard-summary";

export function OperationsDashboard({ context, data }: { context: WorkspaceContext; data: DashboardData }) {
  const supervisor = context.patient?.role === "supervisor";
  return <div className="hca-dashboard hca-operational-dashboard">
    <div className="hca-dashboard-intro"><div><h2>Olá, {context.fullName.split(" ")[0]}.</h2><p>{supervisor ? "Acompanhe a equipe e as situações que precisam de supervisão." : "Suas próximas tarefas no cuidado de " + context.patient?.display_name + "."}</p></div></div>
    <TaskList title={supervisor ? "Pendências da equipe" : "Precisa da sua atenção"} tasks={data.pendingTasks} />
    {supervisor ? <div className="hca-dashboard-metrics"><MetricCard label="Entregas da equipe" value={data.teamReceipts} href="/entregas" icon="truck" /><MetricCard label="Balanços para revisão" value={data.balances} href="/historico?type=BAL&status=submitted" icon="forms" /></div> : null}
    <section><div className="hca-section-heading"><h2>Ações rápidas</h2></div><div className="hca-quick-actions">
      {supervisor && can(context, "bal.read") ? <Link href="/historico?type=BAL&status=submitted" className="hca-quick-action hca-quick-action-primary" prefetch={false}><Icon name="forms" /><strong>Acompanhar balanços</strong></Link> : can(context, "req.create") ? <Link href="/fichas/req" className="hca-quick-action hca-quick-action-primary" prefetch={false}><Icon name="plus" /><strong>Nova requisição</strong></Link> : null}
      {data.balanceEligibility?.available && can(context, "bal.count") ? <Link href={data.balanceEligibility.href} className="hca-quick-action" prefetch={false}><Icon name="forms" /><strong>Fazer balanço</strong></Link> : can(context, "consumption.report") ? <Link href="/consumo" className="hca-quick-action" prefetch={false}><Icon name="forms" /><strong>Registrar ocorrência</strong></Link> : null}
    </div></section>
    {supervisor ? <CriticalStockSummary data={data} /> : null}
    <RecentDocuments data={data} />
  </div>;
}
