"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const sections = [
  { id: "overview", label: "Visão técnica" },
  { id: "continuity", label: "Continuidade" },
  { id: "events", label: "Eventos e envios" },
];

export function TechnicalTabs({ children }: { children: Record<string, ReactNode> }) {
  const requested = useSearchParams().get("supportTab");
  const value = sections.some(section => section.id === requested) ? requested! : "overview";
  return <Tabs.Root value={value} onValueChange={next => {
    if (typeof next !== "string" || !sections.some(section => section.id === next)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("supportTab", next);
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
  }}>
    <Tabs.List aria-label="Seções da central técnica" className="hca-document-tab-list">
      {sections.map(section => <Tabs.Tab key={section.id} value={section.id} className="hca-document-tab">{section.label}</Tabs.Tab>)}
    </Tabs.List>
    {sections.map(section => <Tabs.Panel key={section.id} value={section.id} className="hca-technical-panel">{children[section.id]}</Tabs.Panel>)}
  </Tabs.Root>;
}
