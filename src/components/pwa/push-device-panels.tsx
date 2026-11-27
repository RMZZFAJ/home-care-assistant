"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { z } from "zod";
import type { pushDevice } from "@/lib/push/subscription";
import { ActionButton, ActionLink, FormField, TextInput } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import "./push-device-panels.css";

export type PushDevice = z.infer<typeof pushDevice>;
export type DeviceAction = "rename" | "pause" | "resume" | "revoke";
export type PushStatus = "loading" | "blocked" | "unconfirmed" | "unavailable" | "unsupported" | "inactive" | "active" | "paused" | "prepared";

const statusContent: Record<PushStatus, { icon: IconName; badge: string; title: string; description: string }> = {
  loading: { icon: "clock", badge: "Consulta em andamento", title: "Conferindo os avisos", description: "Aguarde a consulta da inscrição neste aparelho." },
  blocked: { icon: "lock", badge: "Ajuste no navegador", title: "Permissão bloqueada", description: "O navegador não permite mostrar avisos deste site." },
  unconfirmed: { icon: "clock", badge: "Inscrição a confirmar", title: "Conferindo a ativação", description: "A permissão foi concedida. A inscrição ainda precisa ser confirmada para esta conta e sessão." },
  unavailable: { icon: "bell", badge: "Serviço temporariamente indisponível", title: "Ativação indisponível", description: "Confira o serviço antes de ativar avisos neste aparelho." },
  unsupported: { icon: "monitor", badge: "Recurso não compatível", title: "Este navegador não oferece avisos", description: "Continue acompanhando as atualizações pela central do sistema." },
  inactive: { icon: "bell", badge: "Sua escolha", title: "Fique por perto, mesmo fora da tela", description: "Receba avisos neste aparelho e abra o sistema quando precisar agir." },
  active: { icon: "bell", badge: "Inscrição confirmada", title: "Avisos ativados", description: "Este aparelho está pronto para receber as atualizações da sua conta." },
  paused: { icon: "clock", badge: "Pausado", title: "Uma pausa nos avisos", description: "A inscrição está confirmada. Os avisos ficam pausados até o horário informado." },
  prepared: { icon: "check-circle", badge: "Inscrição confirmada", title: "Inscrição confirmada", description: "Os avisos foram vinculados à sessão atual. O envio externo aguarda a liberação do serviço." },
};

export function pushStatusLabel(status: PushStatus) {
  return status === "inactive" ? "Ainda não ativados" : statusContent[status].title;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "pending" }) {
  return <span className={`hca-status hca-status--${tone}`}>{children}</span>;
}

function StateLead({ icon, label, title, description, tone = "neutral" }: {
  icon: IconName; label?: string; title: string; description: string; tone?: "success" | "pending" | "neutral";
}) {
  return <div className="hca-push-lead" data-tone={tone}>
    <span className="hca-push-glyph"><Icon name={icon} width={25} height={25} /></span>
    <div>{label ? <small>{label}</small> : null}<h3>{title}</h3><p>{description}</p></div>
  </div>;
}

function DetailRow({ icon, label, children, confirmed = false }: { icon: IconName; label: string; children: ReactNode; confirmed?: boolean }) {
  return <div className="hca-push-detail">
    <span className="hca-push-glyph"><Icon name={icon} width={19} height={19} /></span>
    <div><strong>{label}</strong><p>{children}</p></div>
    {confirmed ? <Icon name="check-circle" /> : null}
  </div>;
}

export function PushPanel({ status, activationAvailable, readError, pausedUntil, disabled, needsPreparation, recovery, onClose, finalFocus, onConfirm, onRead, onOpenTest, onDevices }: {
  status: PushStatus; activationAvailable: boolean; readError: string; pausedUntil?: string;
  disabled: boolean; needsPreparation: boolean; recovery?: ReactNode;
  onClose: () => void; finalFocus: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void; onRead: () => void; onOpenTest: () => void; onDevices: () => void;
}) {
  const s = statusContent[status];
  const enrolled = status === "active" || status === "prepared" || status === "paused";
  const canActivate = status === "inactive" || status === "unconfirmed" && activationAvailable;
  return <Drawer open title="Avisos neste aparelho" kicker="Avisos e aplicativo" headingIcon="bell"
    popupClassName="hca-preference-sheet hca-push-sheet" keyboardScrollable onClose={onClose} finalFocus={finalFocus}
    footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      {enrolled ? <ActionButton variant="primary" onClick={onDevices}><Icon name="phone" />Ver dispositivos</ActionButton>
        : status === "unsupported" ? <ActionLink variant="primary" href="/notificacoes">Abrir central</ActionLink>
        : canActivate ? <ActionButton variant="primary" disabled={disabled} onClick={onConfirm}>
          <Icon name="bell" />{status === "unconfirmed" ? "Concluir ativação" : "Ativar neste aparelho"}
        </ActionButton>
        : status === "loading" ? null
        : <ActionButton variant="primary" disabled={disabled} onClick={onRead}><Icon name="refresh" />
          {status === "blocked" ? "Conferir permissão" : status === "unconfirmed" ? "Conferir ativação" : "Consultar serviço"}
        </ActionButton>}
    </>}>
    <StateLead {...s} label={s.badge} tone={status === "active" ? "success" : status === "blocked" ? "pending" : "neutral"} />
    {readError ? <p role="alert">{readError}</p> : null}
    {recovery}
    {status === "blocked" ? <div className="hca-push-steps">
      <strong>Como permitir</strong><ol><li>Abra as informações deste site no navegador.</li><li>Em Notificações, escolha Permitir.</li><li>Volte aqui e confira a permissão.</li></ol>
    </div> : null}
    {enrolled || status === "unconfirmed" ? <div className="hca-push-rows">
      <DetailRow icon="monitor" label="Permissão do navegador" confirmed>Concedida</DetailRow>
      <DetailRow icon={enrolled ? "user" : "clock"} label="Inscrição da sua conta" confirmed={enrolled}>
        {enrolled ? "Confirmada para a sessão atual" : "A confirmar para a sessão atual"}
      </DetailRow>
    </div> : null}
    {(status === "active" || status === "prepared") ? <ActionButton compact onClick={onOpenTest}><Icon name="send" />Enviar um teste pessoal</ActionButton> : null}
    {status === "paused" && pausedUntil ? <p>Retomada prevista para {formatDeviceDate(pausedUntil)}.</p> : null}
    {status === "inactive" ? <div className="hca-push-rows">
      <DetailRow icon="lock" label="Um aviso discreto">Sem dados do paciente na tela bloqueada.</DetailRow>
      <DetailRow icon="phone" label="Você mantém o controle">Pause ou desative quando quiser.</DetailRow>
    </div> : null}
    {status === "unsupported" || status === "unavailable" ? <div className="hca-push-fallback">
      <DetailRow icon="bell" label="A central está disponível">Acesse seus avisos sempre que entrar no sistema.</DetailRow>
      {status === "unsupported" ? <p>No iPhone, confira a disponibilidade pelo aplicativo adicionado à tela inicial.</p> : null}
    </div> : null}
    {status === "unconfirmed" && activationAvailable ? <p>Confirme a ativação para vincular este aparelho à sessão atual.</p> : null}
    {canActivate && needsPreparation ? <p>Confira a preparação em Aplicativo neste aparelho antes de ativar os avisos.</p> : null}
  </Drawer>;
}

export function formatDeviceDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function deviceStatusLabel(device: PushDevice, paused: boolean) {
  if (device.state === "revoked") return "Revogado";
  if (device.state === "expired") return "Expirado";
  if (paused) return "Pausado";
  return device.enabled ? "Ativo" : "Desativado";
}

export function DeviceCard({ device, current, paused, onClick }: {
  device: PushDevice; current: boolean; paused: boolean; onClick: (button: HTMLButtonElement) => void;
}) {
  const status = deviceStatusLabel(device, paused);
  return <button type="button" className="hca-push-device-card" onClick={event => onClick(event.currentTarget)}>
    <span className="hca-push-glyph"><Icon name={current ? "monitor" : "phone"} /></span>
    <span className="hca-push-device-copy">
      <small>{current ? "Este aparelho" : "Outro aparelho"}</small>
      <strong>{device.label}</strong>
      <span>Atualizado em {formatDeviceDate(device.updatedAt)}</span>
      <Badge tone={status === "Ativo" ? "success" : "neutral"}>{status}</Badge>
    </span>
    <Icon name="chevron" />
  </button>;
}

export function DevicePanel({ device, current, paused, readyForRename, busy, canReactivate, recovery, test, onClose, finalFocus, onAction, onReactivate }: {
  device: PushDevice; current: boolean; paused: boolean; readyForRename: boolean; busy: boolean; canReactivate: boolean;
  test?: ReactNode; recovery?: ReactNode; onClose: () => void; finalFocus: RefObject<HTMLButtonElement | null>;
  onAction: (action: DeviceAction, label?: string) => void; onReactivate: () => void;
}) {
  const status = deviceStatusLabel(device, paused);
  return <Drawer open title={device.label} kicker={current ? "Este aparelho" : "Outro aparelho"}
    headingIcon={current ? "monitor" : "phone"} popupClassName="hca-preference-sheet hca-push-sheet"
    keyboardScrollable onClose={onClose} finalFocus={finalFocus}
    footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      {device.state === "active" ? <>
        <ActionButton disabled={busy} onClick={() => onAction(paused ? "resume" : "pause")}>
          <Icon name={paused ? "bell" : "clock"} />{paused ? "Retomar avisos" : "Pausar por 8 horas"}
        </ActionButton>
        <ActionButton variant="danger" className="hca-push-revoke" disabled={busy} onClick={() => onAction("revoke")}>Revogar inscrição</ActionButton>
      </> : current ? <ActionButton variant="primary" disabled={!canReactivate} onClick={onReactivate}>Reativar aparelho</ActionButton> : null}
    </>}>
    <div className="hca-push-device-status">
      <Badge tone={status === "Ativo" ? "success" : "neutral"}>{status === "Ativo" ? "Avisos ativos" : paused ? "Avisos pausados" : status}</Badge>
      <small>Atualizado em {formatDeviceDate(device.updatedAt)}</small>
    </div>
    {recovery}
    {current && readyForRename ? <DeviceName key={device.id + device.label} label={device.label} busy={busy} onSave={name => onAction("rename", name)} /> : null}
    {paused && device.mutedUntil ? <StateLead icon="clock" title="Uma pausa nos avisos"
      description={`A pausa termina em ${formatDeviceDate(device.mutedUntil)}. Você pode retomar antes desse horário.`} /> : null}
    {device.state !== "active" ? <StateLead icon="bell"
      title={device.state === "revoked" ? "Inscrição revogada" : "Inscrição expirada"}
      description={current ? "Confirme a ativação com a sessão atual para voltar a receber avisos." : "Esta inscrição não recebe novos avisos."} /> : null}
    {current && !device.currentSession && device.state === "active" ? <p>Confirme a ativação para vincular este aparelho à sessão atual.</p> : null}
    {test}
  </Drawer>;
}

function DeviceName({ label, busy, onSave }: { label: string; busy: boolean; onSave: (name: string) => void }) {
  const [name, setName] = useState(label);
  return <section className="hca-push-block">
    <h3>Identificação</h3>
    <form onSubmit={event => { event.preventDefault(); if (name.trim() && name.trim() !== label) onSave(name.trim()); }}>
      <FormField label="Nome do aparelho" helpText="Um nome para reconhecer este acesso." required>
        <TextInput value={name} maxLength={80} onChange={event => setName(event.target.value)} disabled={busy} />
      </FormField>
      <ActionButton compact type="submit" disabled={busy || !name.trim() || name.trim() === label}><Icon name="check" />Salvar nome</ActionButton>
    </form>
  </section>;
}
