"use client";
import { ModelSectionHead } from "@/components/ui/model-section";
import Link from "next/link";

import { EmptyState, Icon, type IconName } from "@/components/ui/primitives";
import type { DashboardTask } from "@/types/dashboard";

const icons: Record<DashboardTask["kind"], IconName> = { science: "check", delivery: "truck", purchase: "stock", balance: "forms", archive: "history", occurrence: "forms" };
export function TaskList({ tasks, title }: { tasks: DashboardTask[]; title: string }) {
  return <section className="card tasks-card" aria-label={title}>
    <ModelSectionHead title={title} icon="note" action={tasks.length ? <span className="badge badge-neutral">{tasks.length}</span> : undefined} />
    <div className="av-task-list">{tasks.length ? tasks.map((task) => <Link className="av-task" key={task.id} href={task.href} prefetch={false}>
      <span className="task-icon"><Icon name={icons[task.kind]} width={18} height={18} /></span>
      <span><strong>{task.title}</strong><small>{task.description}</small></span><Icon name="chevron" width={17} height={17} />
    </Link>) : <EmptyState title="Nenhuma pendência por aqui">Novas tarefas para você aparecerão nesta lista.</EmptyState>}</div>
  </section>;
}
