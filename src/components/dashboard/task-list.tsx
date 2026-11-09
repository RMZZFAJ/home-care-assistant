"use client";
import { Pill } from "@/components/ui/controls";
import Link from "next/link";

import { EmptyState, Icon, type IconName } from "@/components/ui/primitives";
import type { DashboardTask } from "@/types/dashboard";

const icons: Record<DashboardTask["kind"], IconName> = { science: "check", delivery: "truck", purchase: "stock", balance: "forms", archive: "history", occurrence: "forms" };
export function TaskList({ tasks, title }: { tasks: DashboardTask[]; title: string }) {
  return <section className="hca-records" aria-label={title}>
    <div className="hca-dashboard-section-heading"><h2>{title}</h2><Pill  tone={tasks.length ? "warning" : "neutral"}>{tasks.length ? "Prioridades" : "Em dia"}</Pill></div>
    {tasks.length ? tasks.map((task) => <Link className="hca-record" key={task.id} href={task.href} prefetch={false}>
      <span className={`hca-task-icon ${task.priority === "attention" ? "hca-task-attention" : ""}`}><Icon name={icons[task.kind]} /></span>
      <span className="hca-record-main"><strong>{task.title}</strong><small>{task.description}</small></span><Icon name="arrow" />
    </Link>) : <EmptyState title="Nenhuma tarefa nesta seleção">Novas pendências autorizadas aparecerão aqui.</EmptyState>}
  </section>;
}
