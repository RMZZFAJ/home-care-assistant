"use client";
import Link from "next/link";
import { Menu, MenuItemLink, MenuList, MenuPopover, MenuTrigger, Button } from "@fluentui/react-components";
import { can } from "@/lib/client/capabilities";
import type { WorkspaceContext } from "@/types/workspace";
import { Icon, type IconName } from "@/components/ui/primitives";

const areas: { section: string; title: string; description: string; group: string; capability: string; icon: IconName; globalOnly?: boolean }[] = [
  { section: "patient", title: "Paciente", description: "Identificação, situação e administração do paciente.", group: "Organização", capability: "access.manage", icon: "user" },
  { section: "memberships", title: "Pessoas e vínculos", description: "Funções locais e situação dos vínculos.", group: "Organização", capability: "access.manage", icon: "team" },
  { section: "invitations", title: "Convites", description: "Convites, reemissão e aceite das contas.", group: "Organização", capability: "access.manage", icon: "plus" },
  { section: "catalog", title: "Catálogo", description: "Produtos e apresentações administrados pela família.", group: "Materiais", capability: "catalog.manage", icon: "stock" },
  { section: "alerts", title: "Alertas de estoque", description: "Limites de saldo por custódia e produto.", group: "Materiais", capability: "access.manage", icon: "bell" },
  { section: "notificationRecipients", title: "Destinatários", description: "Destinos pessoais e preferências de comunicação.", group: "Comunicação e controle", capability: "access.manage", icon: "team" },
  { section: "notifications", title: "Fila de notificações", description: "Acompanhar envios, falhas e reprocessamentos.", group: "Comunicação e controle", capability: "access.manage", icon: "bell" },
  { section: "audit", title: "Auditoria", description: "Eventos e responsáveis preservados no histórico.", group: "Comunicação e controle", capability: "audit.read", icon: "history" },
  { section: "import", title: "Importação histórica", description: "Pré-validar e incorporar fontes físicas revisadas.", group: "Comunicação e controle", capability: "access.manage", icon: "upload" },
  { section: "profiles", title: "Contas globais", description: "Identidades e privilégios globais, separados dos vínculos locais.", group: "Administração global", capability: "access.manage", icon: "settings", globalOnly: true },
];
export function administrationAreas(context: WorkspaceContext) {
  const global = context.activeContext?.mode === "global" && context.globalAdministrationAllowed;
  return areas.filter((area) => area.globalOnly ? global : global ? (!context.patient ? area.section === "patient" : !["invitations", "audit", "notifications", "import"].includes(area.section)) : Boolean(context.patient) && can(context, area.capability));
}
export function AdministrationNavigation({ context, section }: { context: WorkspaceContext; section?: string | null }) {
  const allowed = administrationAreas(context);
  const query = context.patient ? "&careRecipientId=" + context.patient.id : "";
  if (section) return <div className="hca-toolbar hca-administration-toolbar"><Link href={context.patient ? "/admin?careRecipientId=" + context.patient.id : "/admin"} prefetch={false}>Administração</Link><span aria-hidden="true">/</span><strong>{allowed.find((area) => area.section === section)?.title ?? "Área indisponível"}</strong><Menu><MenuTrigger disableButtonEnhancement><Button appearance="subtle" icon={<Icon name="more" />}>Outras áreas</Button></MenuTrigger><MenuPopover><MenuList>{allowed.map((area) => <MenuItemLink key={area.section} href={"/admin?section=" + area.section + query} icon={<Icon name={area.icon} />}>{area.title}</MenuItemLink>)}</MenuList></MenuPopover></Menu></div>;
  return <nav aria-label="Áreas administrativas" className="hca-administration-center">{[...new Set(allowed.map((area) => area.group))].map((group) => <section key={group}><div className="hca-section-heading"><h2>{group}</h2></div><div className="hca-compact-grid">{allowed.filter((area) => area.group === group).map((area) => <Link className="ui-card hca-admin-destination" key={area.section} href={"/admin?section=" + area.section + query} prefetch={false}><Icon name={area.icon} /><h3>{area.title}</h3><p>{area.description}</p></Link>)}</div></section>)}</nav>;
}
