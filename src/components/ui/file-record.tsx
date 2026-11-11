import type { ReactNode } from "react";
import { Icon } from "./primitives";

/** Canonical file row; full native content and its actions remain separate. */
export function FileRecord({ title, children, actions, identity }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode; identity?: string;
}) {
  return <li className="hca-file-record" data-file-id={identity}>
    <span className="hca-file-mark" aria-hidden="true"><Icon name="file" /></span>
    <div className="hca-file-main"><strong className="hca-file-title">{title}</strong>{children}</div>
    {actions ? <div className="hca-file-actions">{actions}</div> : null}
  </li>;
}
