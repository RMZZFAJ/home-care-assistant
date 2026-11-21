"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useLayoutEffect, useId, useSyncExternalStore } from "react";
import { useIssuanceRouteActivity } from "@/components/documents/document-issuance-navigation";
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
  useLayoutEffect(() => {
    if (active) entries.set(id, JSON.parse(serialized) as Activity); else entries.delete(id);
    refresh();
  }, [active, id, serialized]);
  useLayoutEffect(() => () => { entries.delete(id); refresh(); }, [id]);
}
export function PageLoadingActivity({ title = "Carregando a página", detail = "Aguarde enquanto consultamos as informações disponíveis." }: { title?: string; detail?: string }) {
  const issuance = useIssuanceRouteActivity();
  const activity = issuance ?? { title, detail };
  useOperationActivity(true, activity);
  return <p className="sr-only" role="status">{activity.title}. {activity.detail}</p>;
}

/** One modal surface also covers concurrent reads, without stacking loading dialogs. */
export function OperationActivityHost() {
  const activity = useSyncExternalStore(subscribe, () => snapshot, serverSnapshot);
  const steps = activity?.steps?.length ? activity.steps : undefined;
  const current = steps ? Math.max(0, Math.min(activity?.stage ?? 0, steps.length - 1)) : 0;
  const activeStep = steps?.[current];
  return <Dialog.Root open={Boolean(activity)} disablePointerDismissal onOpenChange={(open, details) => { if (!open) details.cancel(); }}>
    {activity ? <Dialog.Portal><div className="hca-activity-overlay hca-l1"><Dialog.Backdrop className="activity-backdrop" /><Dialog.Viewport className="hca-activity-viewport"><Dialog.Popup className={`activity-card${activeStep ? " activity-dynamic" : ""}`}>
      {activeStep ? <>
        <div className="connection-animation" aria-hidden="true">
          <span><Icon name="user" width={25} height={25} /></span>
          <i />
          <span key={current}><Icon name={activeStep.icon} width={28} height={28} /></span>
        </div>
        <span className="activity-kicker">{activity.title}</span>
      </> : <div className="activity-spinner" aria-hidden="true"><span /><Icon name="home" width={23} height={23} /></div>}
      <Dialog.Title aria-live="polite">{activeStep?.label ?? activity.title}</Dialog.Title>
      <Dialog.Description>{activity.detail ?? "Aguarde um momento."}</Dialog.Description>
      {steps ? <ol className="activity-steps" aria-label="Etapas da operação">
        {steps.map((step, index) => (
          <li key={step.label} className={index < current ? "done" : index === current ? "current" : ""} aria-current={index === current ? "step" : undefined}>
            <span aria-hidden="true">{index < current ? <Icon name="check" width={14} height={14} /> : index === current ? <i className="activity-step-spinner" /> : index + 1}</span>
            {index < current ? <small className="sr-only">Concluída. </small> : null}{step.label}
          </li>
        ))}
      </ol> : null}
    </Dialog.Popup></Dialog.Viewport></div></Dialog.Portal> : null}
  </Dialog.Root>;
}
