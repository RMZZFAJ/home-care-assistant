"use client";

import type { ComponentProps, ReactNode } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import "./profile-security.css";

export function SecurityRow({ title, subtitle, icon, badge, ...props }: ComponentProps<typeof ActionButton> & {
  title: string; subtitle: string; icon: IconName; badge?: ReactNode;
}) {
  return <ActionButton className="hca-account-setting hca-security-setting" {...props}>
    <span className="hca-security-glyph"><Icon name={icon} width={18} height={18} /></span>
    <span><strong>{title}</strong><small>{subtitle}</small>{badge}</span>
    <Icon name="chevron" width={16} height={16} />
  </ActionButton>;
}

export function SecurityLead({ title, subtitle, icon = "shield", active = false }: {
  title: string; subtitle: string; icon?: IconName; active?: boolean;
}) {
  return <div className="hca-security-lead">
    <span className="hca-security-glyph"><Icon name={icon} width={24} height={24} /></span>
    <div><h2>{title}</h2><p>{subtitle}</p>
      {active ? <span className="hca-status hca-status--success">Verificação em duas etapas</span> : null}
    </div>
  </div>;
}

export function SecurityHint({ children, icon = "lock" }: { children: ReactNode; icon?: IconName }) {
  return <p className="hca-security-hint"><Icon name={icon} width={17} height={17} /><span>{children}</span></p>;
}

export function SecurityResult({ title, subtitle, onClose, finalFocus }: Pick<ComponentProps<typeof Dialog>, "title" | "subtitle" | "onClose" | "finalFocus">) {
  return <Dialog open success title={title} subtitle={subtitle} onClose={onClose} finalFocus={finalFocus}
    popupClassName="hca-operation-result-dialog" footer={<ActionButton variant="primary" onClick={onClose}>Concluir</ActionButton>}>{null}</Dialog>;
}
