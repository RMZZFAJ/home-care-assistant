"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useId, useSyncExternalStore } from "react";
import { Icon, type IconName } from "./icon";

type ActivityStep = { label: string; icon: IconName };
type Activity = { title: string; detail?: string; steps?: readonly ActivityStep[]; stage?: number };
const entries = new Map<string, Activity>();
const listeners = new Set<() => void>();
let snapshot: Activity | undefined;
function refresh() {
  const all = [...entries.values()];
  snapshot = all.findLast(entry => entry.steps?.length) ?? all.at(-1);
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const serverSnapshot = () => undefined;

/** Phases advance only when the caller observes the corresponding operation state. */
export function useOperationActivity(active: boolean, activity: Activity) {
  const id = useId();
  const serialized = JSON.stringify(activity);
  useEffect(() => {
    if (active) entries.set(id, JSON.parse(serialized) as Activity); else entries.delete(id);
    refresh();
  }, [active, id, serialized]);
  useEffect(() => () => { entries.delete(id); refresh(); }, [id]);
}
export function PageLoadingActivity({ title = "Carregando a página", detail = "Aguarde enquanto consultamos as informações disponíveis." }: { title?: string; detail?: string }) {
  useOperationActivity(true, { title, detail });
  return <p className="sr-only" role="status">{title}. {detail}</p>;
}

/** One modal surface also covers concurrent reads, without stacking loading dialogs. */
export function OperationActivityHost() {
  const activity = useSyncExternalStore(subscribe, () => snapshot, serverSnapshot);
  const current = activity?.steps ? Math.max(0, Math.min(activity.stage ?? 0, activity.steps.length - 1)) : 0;
  return <Dialog.Root open={Boolean(activity)} disablePointerDismissal onOpenChange={(open, details) => { if (!open) details.cancel(); }}>
    {activity ? <Dialog.Portal><div className="hca-activity-overlay hca-l1"><Dialog.Backdrop className="activity-backdrop" /><Dialog.Viewport className="hca-activity-viewport"><Dialog.Popup className={`activity-card${activity.steps ? " activity-dynamic" : ""}`}>
      {activity?.steps ? <><div className="connection-animation" aria-hidden="true"><span><Icon name="user" width={25} height={25} /></span><i /><span key={current}><Icon name={activity.steps[current].icon} width={28} height={28} /></span></div><span className="activity-kicker">{activity.title}</span></> : <div className="activity-spinner" aria-hidden="true"><span /><Icon name="home" width={23} height={23} /></div>}
      <Dialog.Title render={<h2 />} aria-live="polite">{activity?.steps?.[current].label ?? activity?.title}</Dialog.Title><Dialog.Description render={<p />}>{activity?.detail ?? "Aguarde um momento."}</Dialog.Description>
      {activity?.steps ? <ol className="activity-steps">{activity.steps.map((step, index) => <li key={step.label} className={index < current ? "done" : index === current ? "current" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Icon name="check" width={14} height={14} /> : index === current ? <i className="spinner" /> : index + 1}</span>{step.label}</li>)}</ol> : null}
    </Dialog.Popup></Dialog.Viewport></div></Dialog.Portal> : null}
  </Dialog.Root>;
}
