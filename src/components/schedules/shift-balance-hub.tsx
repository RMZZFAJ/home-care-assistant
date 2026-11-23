"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BalanceAssignmentHistory, BalanceFollowUp } from "@/components/balances/balance-console";
import { HistoryContent } from "@/components/documents/document-history";
import { BalanceNotice } from "@/components/notifications/balance-notice";
import { can, Notice, Workspace, type WorkspaceContext } from "@/components/workspace";
import { PatientSchedule } from "./schedule-console";
import { ScheduleHistory } from "./schedule-history";

type View = "shifts" | "balances" | "history";

export function ShiftBalanceHub({ entry }: { entry: Exclude<View, "history"> }) {
  const params = useSearchParams();
  const scheduleHistoryRequested = [...params.keys()].some(key => key.startsWith("scheduleHistory"));
  const historyRequested = params.get("view") === "history" || scheduleHistoryRequested;
  return <Workspace title="Plantões e balanços" heading={context => (
    <div className="page-heading">
      <div>
        {context.patient ? <p className="eyebrow">{context.patient.display_name}</p> : null}
        <h1>Plantões e balanços</h1>
        <p className="hca-agenda-subtitle">A rotina da equipe, no mesmo lugar.</p>
      </div>
    </div>
  )}>
    {context => context.patient ? <ShiftBalanceContent key={context.userId + ":" + context.patient.id}
      context={context} entry={entry} requested={historyRequested ? "history" : entry} scheduleHistoryRequested={scheduleHistoryRequested} /> :
      <Notice>Selecione um paciente para consultar plantões e balanços.</Notice>}
  </Workspace>;
}

function ShiftBalanceContent({ context, entry, requested, scheduleHistoryRequested }: {
  context: WorkspaceContext;
  entry: Exclude<View, "history">;
  requested: View;
  scheduleHistoryRequested: boolean;
}) {
  const patient = context.patient!;
  const shifts = can(context, "schedule.read.team") || can(context, "schedule.read.own");
  const balances = can(context, "bal.read");
  const scheduleDenied = scheduleHistoryRequested && !shifts;
  const scheduleRecoveryOnly = entry === "shifts" && !shifts;
  if (!shifts && !balances) return scheduleRecoveryOnly
    ? <PatientSchedule context={context} />
    : <Notice error>Seu vínculo não permite consultar plantões ou balanços.</Notice>;

  let view = requested;
  if (view === "shifts" && !shifts) view = "balances";
  if (view === "balances" && !balances) view = "shifts";
  const patientQuery = new URLSearchParams({ careRecipientId: patient.id }).toString();
  const historyPath = balances ? "/balancos" : "/escalas";
  return <div className="hca-form-stack">
    <nav className="hca-shift-hub-nav" aria-label="Plantões e balanços">
      {shifts ? <Link href={"/escalas?" + patientQuery} aria-current={view === "shifts" ? "page" : undefined} prefetch={false}>Plantões</Link> : null}
      {balances ? <Link href={"/balancos?" + patientQuery} aria-current={view === "balances" ? "page" : undefined} prefetch={false}>Balanços</Link> : null}
      <Link href={historyPath + "?" + patientQuery + "&view=history"} aria-current={view === "history" ? "page" : undefined} prefetch={false}>Histórico</Link>
    </nav>
    {view === "shifts" || scheduleRecoveryOnly ? <PatientSchedule context={context} /> : null}
    {view === "balances" ? <>
      <BalanceNotice context={context} />
      <BalanceFollowUp context={context} />
    </> : null}
    {view === "history" ? <>
      {balances ? <>
        <h2>Histórico de balanços</h2>
        <HistoryContent context={context} balanceOnly />
        <BalanceAssignmentHistory patientId={patient.id} />
      </> : null}
      {shifts ? <ScheduleHistory patientId={patient.id} readerId={context.userId} /> : null}
      {scheduleDenied && !scheduleRecoveryOnly ? <Notice error>Seu vínculo não permite consultar a agenda.</Notice> : null}
    </> : null}
  </div>;
}
