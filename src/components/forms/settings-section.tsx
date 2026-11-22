"use client";
import { ActionButton } from "@/components/ui/controls";
import { createContext, use, useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/primitives";

const SettingsCardContext = createContext(false);

/** Profile tabs provide the grouping; each setting remains an ordinary card. */
export function SettingsSectionCards({ children }: { children: ReactNode }) {
  return <SettingsCardContext value={true}>{children}</SettingsCardContext>;
}

/** Keep fields mounted so closing a section does not discard its draft. */
export function SettingsSection({ title, summary, initiallyOpen = false, children }: {
  title: string; summary?: ReactNode; initiallyOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const card = use(SettingsCardContext);
  return <section className="ui-card hca-settings-section" aria-labelledby={id + "-title"}>
    <h2 id={id + "-title"}>{card ? title : <ActionButton variant="quiet" aria-expanded={open} aria-controls={id + "-content"} onClick={() => setOpen((current) => !current)}>
      <span>{title}</span><Icon name="down" style={{ transform: open ? "rotate(180deg)" : undefined }} />
    </ActionButton>}</h2>
    {summary ? <p className="hca-settings-summary">{summary}</p> : null}
    <div id={id + "-content"} hidden={!card && !open} className="hca-settings-content">{children}</div>
  </section>;
}
