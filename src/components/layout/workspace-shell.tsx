"use client";

import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, Menu, MenuDivider, MenuItem, MenuItemRadio, MenuList, MenuPopover, MenuTrigger, OverlayDrawer, Select, useRestoreFocusTarget, useRestoreFocusSource } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LogoutButton } from "@/components/auth/logout-button";
import { BottomNavigation, WorkspaceNavigation } from "@/components/navigation/workspace-navigation";
import { roleLabels, useWorkspaceState } from "./workspace-context";

const subscribe = (callback: () => void) => {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const desktopSnapshot = () => window.matchMedia("(min-width: 1024px)").matches;
const serverSnapshot = () => false;

function ProfileMenu() {
  const router = useRouter();
  const { data, value, selecting, selectProfile } = useWorkspaceState();
  const [open, setOpen] = useState(false);
  const choose = async (id: string | null) => { if (await selectProfile(id)) setOpen(false); };
  return <Menu open={open} onOpenChange={(_, next) => setOpen(next.open)}>
    <MenuTrigger disableButtonEnhancement><Button appearance="subtle" className="hca-profile-trigger" aria-label="Menu do usuário" disabled={!data}>
      <Avatar name={data?.fullName} image={data?.avatarUrl ? { src: data.avatarUrl, alt: "" } : undefined} size={32} color="brand" />
      <span className="hca-profile-identity"><strong>{data?.fullName}</strong><small>{data?.activeContext?.mode === "global" ? "Administração global" : roleLabels[value?.patient?.role ?? ""]}</small></span>
      <Icon name="chevron" width={14} />
    </Button></MenuTrigger>
    <MenuPopover><MenuList>
      <MenuItem icon={<Icon name="user" />} onClick={() => router.push("/perfil")}>Meu perfil e segurança</MenuItem>
      <Menu>
        <MenuTrigger disableButtonEnhancement><MenuItem icon={<Icon name="team" />}>Mudar perfil</MenuItem></MenuTrigger>
        <MenuPopover><MenuList aria-label="Contextos autorizados" checkedValues={{ context: [data?.activeContext?.mode === "global" ? "global" : data?.activeContext?.care_recipient_id ?? ""] }}>
          {data?.isGlobalAdmin ? <MenuItemRadio name="context" value="global" disabled={selecting} onClick={() => void choose(null)}>Administração global</MenuItemRadio> : null}
          {data?.patients.filter((patient) => patient.hasMembership).map((patient) => <MenuItemRadio key={patient.id} name="context" value={patient.id} disabled={selecting} onClick={() => void choose(patient.id)}>
            {patient.display_name} · {roleLabels[patient.role] ?? patient.role}
          </MenuItemRadio>)}
        </MenuList></MenuPopover>
      </Menu>
      <MenuItem icon={<Icon name="bell" />} onClick={() => router.push("/notificacoes")}>Preferências e notificações</MenuItem>
      <MenuDivider />
      <LogoutButton />
    </MenuList></MenuPopover>
  </Menu>;
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { value, data, selecting, selectPatient } = useWorkspaceState();
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const restoreTarget = useRestoreFocusTarget();
  const restoreSource = useRestoreFocusSource();
  const operational = value?.activeContext?.mode === "patient" && ["professional", "supervisor"].includes(value.patient?.role ?? "");
  const expanded = desktop ? !collapsed : mobileOpen;
  const navigation = <Suspense fallback={null}><WorkspaceNavigation context={value} operational={operational} onNavigate={() => setMobileOpen(false)} /></Suspense>;
  return <div data-context-mode={value?.activeContext?.mode ?? ""} data-context-patient={value?.activeContext?.care_recipient_id ?? ""} className={`app-shell hca-workspace ${operational ? "hca-operations-shell" : "hca-management-shell"} ${desktop && !collapsed ? "hca-navigation-expanded" : ""}`}>
    <a href="#workspace-content" className="skip-link">Ir para o conteúdo</a>
    <header className="app-header print:hidden">
      <Button {...restoreTarget} className="hca-navigation-toggle" appearance="subtle" icon={<Icon name="menu" />} aria-label={expanded ? "Recolher navegação" : "Abrir navegação"} aria-expanded={expanded} aria-controls="workspace-navigation" onClick={(event) => { event.currentTarget.focus(); if (desktop) setCollapsed((current) => !current); else setMobileOpen((current) => !current); }} />
      <Link href="/" prefetch={false} className="app-brand" aria-label="Home Care Assistant — início"><span>HC</span><strong>Home Care Assistant<small>{operational ? "Operação assistencial" : "Gestão do cuidado"}</small></strong></Link>
      <div className="patient-picker">{data?.patients.length ? <Select aria-label="Pessoa assistida" value={value?.patient?.id ?? ""} disabled={selecting} onChange={(event) => void selectPatient(event.target.value)}>
        <option value="" disabled>Selecione um paciente</option>
        {data.patients.filter((patient) => data.activeContext?.mode !== "patient" || patient.hasMembership).map((patient) => <option key={patient.id} value={patient.id}>{patient.display_name}{patient.is_active === false ? " (inativo)" : ""}</option>)}
      </Select> : <span className="text-sm text-(--muted)">Home Care Assistant</span>}</div>
      {value ? <NotificationBell key={value.patient?.id ?? "global"} patientId={value.patient?.id} /> : null}
      <ProfileMenu />
    </header>
    {desktop && !collapsed ? <aside id="workspace-navigation" className="hca-desktop-navigation print:hidden">{navigation}</aside> : null}
    <OverlayDrawer {...restoreSource} className="hca-navigation-drawer" open={!desktop && mobileOpen} onOpenChange={(_, next) => setMobileOpen(next.open)} position="start" size="small" id={!desktop ? "workspace-navigation" : undefined}>
      <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" icon={<Icon name="close" />} aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}>Home Care Assistant</DrawerHeaderTitle></DrawerHeader>
      <DrawerBody>{navigation}</DrawerBody>
    </OverlayDrawer>
    <div className="hca-workspace-body">{children}</div>
    {operational && value ? <BottomNavigation context={value} /> : null}
  </div>;
}
