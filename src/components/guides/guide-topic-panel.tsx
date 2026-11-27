"use client";

import Link from "next/link";
import { useRef, useState, type ComponentProps } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { Notice, primaryClass } from "@/components/workspace";
import { guideTopics, type GuideTopic } from "@/lib/guide-content";
import "./guides.css";

export function GuideTopicPanel({ topic, href, fromTask, finalFocus, onClose }: {
  topic: GuideTopic; href?: string; fromTask?: boolean;
  finalFocus?: ComponentProps<typeof Drawer>["finalFocus"]; onClose: () => void;
}) {
  return <Drawer open title={topic.title} kicker="Guia da tarefa" subtitle={topic.subtitle}
    headingIcon={topic.icon} onClose={onClose} finalFocus={finalFocus} popupClassName="hca-guide-topic-sheet"
    footer={<>
      <ActionButton onClick={onClose}><Icon name="back" />{fromTask ? "Voltar à tarefa" : "Voltar aos guias"}</ActionButton>
      {href && topic.destination ? <Link className={primaryClass} href={href} aria-label={"Abrir tarefa · " + topic.destination.label}><Icon name="arrow" />Abrir tarefa</Link> : null}
    </>}>
    {fromTask ? <Notice>Ao fechar a orientação, você volta ao mesmo ponto da tarefa.</Notice> : null}
    <ol className="hca-guide-timeline">
      {topic.facts.map(([title, text]) => <li key={title}>
        <span><Icon name="undo" width={14} height={14} /></span>
        <div><h3>{title}</h3><p>{text}</p></div>
      </li>)}
    </ol>
    <Notice>Ciência, recebimentos e autorizações são registrados nas tarefas correspondentes.</Notice>
  </Drawer>;
}

export function TaskHelp({ topic, disabled }: { topic: "receiving" | "request" | "consumption"; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <>
    <ActionButton ref={triggerRef} variant="quiet" type="button" disabled={disabled} onClick={() => setOpen(true)}>
      <Icon name="help" />Ajuda nesta tarefa
    </ActionButton>
    {open ? <GuideTopicPanel topic={guideTopics[topic]} fromTask finalFocus={triggerRef} onClose={() => setOpen(false)} /> : null}
  </>;
}
