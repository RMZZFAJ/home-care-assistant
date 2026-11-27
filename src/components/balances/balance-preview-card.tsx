"use client";

import { useRef, useState, type ReactNode } from "react";
import { ActionButton, DefinitionGrid, Pill, type PillTone } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { formatZonedDate } from "@/lib/schedules/time";

export function BalancePreviewCard({ title, patientName, responsible, shiftType, startsAt, endsAt, dueAt, timezone, state, tone, note, primary, children }: {
  title: string;
  patientName: string;
  responsible: string;
  shiftType?: string;
  startsAt?: string;
  endsAt?: string;
  dueAt?: string;
  timezone?: string;
  state: string;
  tone: PillTone;
  note?: string;
  primary?: ReactNode;
  children?: ReactNode;
}) {
  const [details, setDetails] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const format = (value: string) => formatZonedDate(value, timezone);
  const period = startsAt && endsAt ? format(startsAt) + " → " + format(endsAt) : undefined;
  const deadline = dueAt ? format(dueAt) : undefined;
  const open = (target: HTMLButtonElement) => {
    openerRef.current = target;
    setDetails(true);
  };
  const close = () => setDetails(false);

  return (
    <article className="hca-balance-preview">
      <div className="hca-balance-preview-top">
        <span className="hca-balance-preview-icon"><Icon name="checklist" width={22} height={22} /></span>
        <Pill tone={tone}>{state}</Pill>
      </div>
      <h3>
        <button type="button" className="hca-balance-preview-title" onClick={event => open(event.currentTarget)}>{title}</button>
      </h3>
      <p>{responsible}{shiftType ? " · " + shiftType : ""}</p>
      {period || deadline ? <p className="hca-balance-preview-period">
        <Icon name="clock" width={15} height={15} />
        <span>{period ?? "Prazo até " + deadline}{period && deadline && dueAt !== endsAt ? <><br />Prazo até {deadline}</> : null}</span>
      </p> : null}
      <div className="hca-balance-preview-actions">
        {primary ?? <ActionButton onClick={event => open(event.currentTarget)}>Ver detalhes</ActionButton>}
        {children}
      </div>
      {details ? <Drawer open title={title} kicker="Balanço de estoque" headingIcon="checklist"
        subtitle={"Estoque da equipe · " + patientName} keyboardScrollable popupClassName="hca-schedule-balance-sheet"
        onClose={close} closeLabel="Fechar detalhes do balanço" finalFocus={() => openerRef.current ?? false}
        footer={<ActionButton onClick={close}>Fechar</ActionButton>}>
        <div className="hca-form-stack">
          <div><Pill tone={tone}>{state}</Pill></div>
          <DefinitionGrid className="hca-schedule-balance-facts" items={[
            { label: "Responsável", value: responsible },
            ...(shiftType ? [{ label: "Tipo de plantão", value: shiftType }] : []),
            ...(period ? [{ label: "Plantão", value: period }] : []),
            ...(deadline ? [{ label: "Prazo atual", value: deadline }] : []),
          ]} />
          {note ? <p>{note}</p> : null}
        </div>
      </Drawer> : null}
    </article>
  );
}
