"use client";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";

/** Keep fields mounted so closing a section does not discard its draft. */
export function SettingsSection({ title, summary, initiallyOpen = false, children }: {
  title: string; summary?: ReactNode; initiallyOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return <section className="ui-card hca-settings-section" aria-labelledby={id + "-title"}>
    <h2 id={id + "-title"}><Button appearance="subtle" aria-expanded={open} aria-controls={id + "-content"} onClick={() => setOpen((current) => !current)}>
      <span>{title}</span><Icon name="chevron" style={{ transform: open ? "rotate(180deg)" : undefined }} />
    </Button></h2>
    {summary ? <p className="hca-settings-summary">{summary}</p> : null}
    <div id={id + "-content"} hidden={!open} className="hca-settings-content">{children}</div>
  </section>;
}
