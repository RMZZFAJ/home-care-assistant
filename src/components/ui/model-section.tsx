import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/** Section composition shared with the approved L1 laboratory. */
export function ModelSectionHead({ title, icon, action }: { title: string; icon: IconName; action?: ReactNode }) {
  return <header className="card-head av-section-head"><div><Icon name={icon} width={18} height={18} /><h2>{title}</h2></div>{action}</header>;
}

export function DocumentSection({ title, icon, children, action, className = "" }: { title: string; icon: IconName; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`doc-card ${className}`}><header className="doc-card-head"><h2><Icon name={icon} width={18} height={18} />{title}</h2>{action}</header><div className="doc-card-body">{children}</div></section>;
}
