"use client";
import { ActionButton, SelectField } from "@/components/ui/controls";

import { Suspense, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { MenuPopup } from "@/components/ui/floating";
import { ProfileAvatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlays";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LogoutButton } from "@/components/auth/logout-button";
import { GuideOnboarding } from "@/components/guides/user-guide";
import { BottomNavigation, WorkspaceNavigation } from "@/components/navigation/workspace-navigation";
import { roleLabel, useWorkspaceState } from "./workspace-context";
import { usePwa } from "@/components/pwa/pwa-provider";

const subscribe = (callback: () => void) => {
  const media = window.matchMedia("(min-width: 851px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const desktopSnapshot = () => window.matchMedia("(min-width: 851px)").matches;
const serverSnapshot = () => false;

function ProfileMenu() {
  const router = useRouter();
  const { data, value, selecting, selectProfile, selectionError } = useWorkspaceState();
  const [open, setOpen] = useState(false);
  const [contexts, setContexts] = useState(false);
  const [restoreAfterSelection, setRestoreAfterSelection] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuLabelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const multipleContexts = (data?.patients.filter(patient => patient.hasMembership).length ?? 0) + (data?.isGlobalAdmin ? 1 : 0) > 1;
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      // The menu may already have focus, and the user can navigate
      // before this frame runs. Initial focus must not undo that navigation.
      if (!contexts && menuRef.current?.contains(document.activeElement)) return;
      const target = contexts ? menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]') : null;
      (target ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]'))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, contexts]);
  useEffect(() => {
    if (!restoreAfterSelection || open || selecting || !data) return;
    const frame = requestAnimationFrame(() => {
      const target = triggerRef.current;
      if (target?.isConnected && !target.disabled) { target.focus({ preventScroll: true }); setRestoreAfterSelection(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [restoreAfterSelection, open, selecting, data]);
  const choose = async (id: string | null) => { if (await selectProfile(id)) { setOpen(false); setContexts(false); } setRestoreAfterSelection(true); };
  return <Menu.Root open={open} onOpenChange={next => { setOpen(next); if (!next) setContexts(false); }}>
    <Menu.Trigger render={<ActionButton ref={triggerRef} variant="quiet" className="hca-profile-trigger" aria-label="Menu do usuário" disabled={!data || selecting} />}>
      <ProfileAvatar name={data?.fullName} imageUrl={data?.avatarUrl} />
      <span className="hca-profile-identity"><strong>{data?.fullName}</strong><small>{data?.activeContext?.mode === "global" ? "Administração global" : roleLabel(value?.patient?.role)}</small></span>
      <Icon name="down" width={14} />
    </Menu.Trigger>
    <MenuPopup ref={menuRef} aria-labelledby={menuLabelId} className={contexts ? "hca-context-menu" : undefined}>
      <span id={menuLabelId} className="sr-only">{contexts ? "Contextos autorizados" : "Ações do usuário"}</span>
      {contexts && selectionError ? <p role="alert">{selectionError}</p> : null}
      {contexts ? <>
        <Menu.Item className="hca-menu-item" closeOnClick={false} onClick={() => setContexts(false)}>← Voltar ao menu</Menu.Item>
        <Menu.RadioGroup value={data?.activeContext?.mode === "global" ? "global" : data?.activeContext?.care_recipient_id ?? ""}>
          {data?.isGlobalAdmin ? <Menu.RadioItem className="hca-menu-item" closeOnClick={false} value="global" disabled={selecting} onClick={() => void choose(null)}>Administração global</Menu.RadioItem> : null}
          {data?.patients.filter(patient => patient.hasMembership).map(patient => <Menu.RadioItem className="hca-menu-item" closeOnClick={false} key={patient.id} value={patient.id} disabled={selecting} onClick={() => void choose(patient.id)}>
            {patient.display_name} · {roleLabel(patient.role)}
          </Menu.RadioItem>)}
        </Menu.RadioGroup>
      </> : <>
        <Menu.Item className="hca-menu-item" onClick={() => { setOpen(false); router.push("/perfil"); }}><Icon name="user" />Meu perfil e segurança</Menu.Item>
        <Menu.Item className="hca-menu-item" closeOnClick={false} disabled={!multipleContexts} onClick={() => setContexts(true)}><Icon name="team" />Mudar paciente ou função</Menu.Item>
        <Menu.Item className="hca-menu-item" onClick={() => { setOpen(false); router.push("/notificacoes"); }}><Icon name="bell" />Central de notificações</Menu.Item>
        <Menu.Separator className="hca-menu-separator" />
        <LogoutButton />
      </>}
    </MenuPopup>
  </Menu.Root>;
}

export function WorkspaceShell({ children, showOnboarding = false }: { children: ReactNode; showOnboarding?: boolean; }) {
  const { blocked, notices } = usePwa();
  const { value, data, selecting, selectPatient } = useWorkspaceState();
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationTriggerRef = useRef<HTMLButtonElement>(null);
  const operational = value?.activeContext?.mode === "patient" && ["professional", "supervisor"].includes(value.patient?.role ?? "");
  const expanded = desktop ? !collapsed : mobileOpen;
  const navigation = <Suspense fallback={null}><WorkspaceNavigation context={value} operational={operational} onNavigate={() => setMobileOpen(false)} /></Suspense>;
  return <div data-context-mode={value?.activeContext?.mode ?? ""} data-context-patient={value?.activeContext?.care_recipient_id ?? ""} className={`app-shell hca-workspace ${operational ? "hca-operations-shell" : "hca-management-shell"} ${desktop && !collapsed ? "hca-navigation-expanded" : ""}`}>
    <a href="#workspace-content" className="skip-link" inert={blocked}>Ir para o conteúdo</a>
    <header className="app-header print:hidden" inert={blocked}>
      <ActionButton ref={navigationTriggerRef} className="hca-navigation-toggle" variant="quiet" aria-label={expanded ? "Recolher navegação" : "Abrir navegação"} aria-expanded={expanded} aria-controls="workspace-navigation" onClick={(event) => { event.currentTarget.focus(); if (desktop) setCollapsed((current) => !current); else setMobileOpen((current) => !current); }} >{<Icon name="menu" />}</ActionButton>
      <Link href="/" prefetch={false} className="app-brand" aria-label="Home Care Assistant — início"><span><Icon name="home" /></span><strong>Home Care Assistant<small>Insumos, família e equipe</small></strong></Link>
      <div className="patient-picker">{data?.patients.length ? <SelectField aria-label="Pessoa assistida" value={value?.patient?.id ?? ""} disabled={selecting || Boolean(value?.patient?.id) && data.patients.filter(patient => data.activeContext?.mode !== "patient" || patient.hasMembership).length < 2} onChange={(event) => void selectPatient(event.target.value)}>
        <option value="" disabled>Selecione um paciente</option>
        {data.patients.filter((patient) => data.activeContext?.mode !== "patient" || patient.hasMembership).map((patient) => <option key={patient.id} value={patient.id}>{patient.display_name}{patient.is_active === false ? " (inativo)" : ""}</option>)}
      </SelectField> : <span className="text-sm text-(--muted)">Home Care Assistant</span>}</div>
      {value ? <NotificationBell key={`${value.activeContext?.mode}:${value.patient?.id ?? "none"}`} patientId={value.activeContext?.mode === "patient" ? value.patient?.id : undefined} disabled={selecting} /> : null}
      <ProfileMenu />
    </header>
    {desktop && !collapsed ? <aside id="workspace-navigation" className="hca-desktop-navigation print:hidden" inert={blocked}>{navigation}</aside> : null}
    <Drawer title="Home Care Assistant" open={!desktop && mobileOpen} onClose={() => setMobileOpen(false)} closeLabel="Fechar menu" side="start" finalFocus={navigationTriggerRef} id={!desktop ? "workspace-navigation" : undefined}>
      <div inert={blocked}>{navigation}</div>
    </Drawer>
    <div className="hca-workspace-body">{notices}<div inert={blocked}>{showOnboarding && value?.activeContext ? <GuideOnboarding key={`${value.activeContext.mode}:${value.activeContext.care_recipient_id ?? ""}`} /> : null}{children}</div></div>
    {operational && value ? <div inert={blocked}><BottomNavigation context={value} /></div> : null}
  </div>;
}
