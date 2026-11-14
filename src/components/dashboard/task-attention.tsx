"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkspaceContext } from "@/types/workspace";
import { can } from "@/lib/client/capabilities";
import { Icon } from "@/components/ui/primitives";
import type { DashboardTask } from "@/types/dashboard";

/** A shortcut to an authorized task; this summary never completes the task. */
export function TaskAttention({ tasks, context }: { tasks: DashboardTask[]; context: WorkspaceContext; }) {
  const key = "hca:attention:" + context.userId + ":" + context.patient!.id;
  const [hidden, setHidden] = useState<Record<string, number>>(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "{}"); return saved && typeof saved === "object" && !Array.isArray(saved) ? saved as Record<string, number> : {}; } catch { return {}; }
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const available = tasks.filter(task => typeof hidden[task.id] !== "number" || hidden[task.id] <= now || hidden[task.id] > now + 86_400_000);
  const attention = available.filter(item => item.priority === "attention").slice(0, 2);
  if (!attention.length) return null;
  return (
    <section className="attention-section" aria-label="Precisa de atenção"><h2>Precisa de atenção</h2><div className="attention-grid">{attention.map(task => {
      const professionalBalance = task.kind === "balance" && ["professional", "supervisor"].includes(context.patient!.role);
      return <article key={task.id} className={`attention-item hca-task-attention-banner${professionalBalance ? "" : " can-dismiss"}`}><span className="attention-icon"><Icon name={task.kind === "delivery" ? "truck" : task.kind === "science" ? "file" : "alert"} width={18} height={18} /></span><div><h3>{task.title}</h3><p>{task.description}</p></div><div className="attention-actions"><Link href={task.href} className="btn btn-ghost" prefetch={false}><Icon name="arrow" />{professionalBalance ? "Fazer balanço" : task.kind === "science" ? "Ver requisição" : "Abrir próxima providência"}</Link>{professionalBalance && can(context, "bal.defer.request") ? <Link href="/balancos?purpose=request_deferral" className="btn btn-ghost" prefetch={false}>Solicitar adiamento</Link> : null}</div>{!professionalBalance ? <button type="button" className="attention-dismiss" aria-label="Ocultar este aviso por 24 horas" onClick={() => { const clickedAt = Date.now(); const next = { ...hidden, [task.id]: clickedAt + 86_400_000 }; setNow(clickedAt); setHidden(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Current page still honors dismissal. */ } }}><Icon name="close" width={13} height={13} /></button> : null}</article>;
    })}</div>
    </section>
  );
}
