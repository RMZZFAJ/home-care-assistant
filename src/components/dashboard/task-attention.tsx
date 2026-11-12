import Link from "next/link";
import { Icon } from "@/components/ui/primitives";
import type { DashboardTask } from "@/types/dashboard";
import "./task-attention.css";

/** A shortcut to an authorized task; this summary never completes the task. */
export function TaskAttention({ tasks }: { tasks: DashboardTask[] }) {
  const task = tasks.find(item => item.priority === "attention") ?? tasks[0];
  if (!task) return null;
  return (
    <section className="hca-task-attention-banner" aria-label="Próxima providência">
      <div className="hca-task-attention-heading">
        <div>
          <p className="hca-task-attention-overline">O que precisa de atenção</p>
          <h2>{task.title}</h2>
          <p>{task.description}</p>
        </div>
        <Icon name={task.kind === "delivery" ? "truck" : task.kind === "science" ? "check" : "file"} />
      </div>
      <Link href={task.href} className="ui-button ui-button-primary" prefetch={false}>
        Abrir próxima providência <Icon name="arrow" />
      </Link>
    </section>
  );
}
