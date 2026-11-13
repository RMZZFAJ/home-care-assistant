"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import type { DashboardTask } from "@/types/dashboard";
import "./task-attention.css";

/** A shortcut to an authorized task; this summary never completes the task. */
export function TaskAttention({ tasks, context }: { tasks: DashboardTask[]; context: WorkspaceContext; }) {
  const key = "hca:attention:" + context.userId + ":" + context.patient!.id;
  const [hidden, setHidden] = useState<Record<string, number>>(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "{}"); return saved && typeof saved === "object" && !Array.isArray(saved) ? saved as Record<string, number> : {}; } catch { return {}; }
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const available = tasks.filter(task => typeof hidden[task.id] !== "number" || hidden[task.id] <= now || hidden[task.id] > now + 86_400_000);
  const task = available.find(item => item.priority === "attention") ?? available[0];
  if (!task) return null;
  const professionalBalance = task.kind === "balance" && ["professional", "supervisor"].includes(context.patient!.role);
  return (
    <section className="hca-task-attention-banner" aria-label="Próxima providência">
      <div className="hca-task-attention-heading">
        <div>
          <p className="hca-task-attention-overline">Precisa de atenção</p>
          <h2>{task.title}</h2>
          <p>{task.description}</p>
        </div>
        <Icon name={task.kind === "delivery" ? "truck" : task.kind === "science" ? "check" : "file"} />
        {!professionalBalance ? <ActionButton variant="quiet" aria-label="Ocultar este aviso por 24 horas" onClick={() => { const next = { ...hidden, [task.id]: Date.now() + 86_400_000 }; setHidden(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Current page still honors dismissal. */ } }}><Icon name="close" /></ActionButton> : null}
      </div>
      <Link href={task.href} className="ui-button ui-button-primary" prefetch={false}>
        {professionalBalance ? "Fazer balanço" : "Abrir próxima providência"} <Icon name="arrow" />
      </Link>
      {professionalBalance && can(context, "bal.defer.request") ? <Link href="/balancos?purpose=request_deferral" className="ui-button ui-button-secondary" prefetch={false}>Solicitar adiamento</Link> : null}
    </section>
  );
}
