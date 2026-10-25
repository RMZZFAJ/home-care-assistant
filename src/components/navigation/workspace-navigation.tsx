"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { can } from "@/lib/client/capabilities";
import type { WorkspaceContext } from "@/types/workspace";
import { Icon, type IconName } from "@/components/ui/primitives";

type Item = { label: string; href: string; icon?: IconName; capability?: string; capabilities?: string[] };
export const operationalDestinations: Item[] = [
  { label: "Início", href: "/", icon: "home" },
  { label: "Histórico", href: "/historico", icon: "history" },
  { label: "Entregas", href: "/entregas", icon: "truck", capability: "ent.read" },
  { label: "Estoque", href: "/estoque?custody=CARE_TEAM", icon: "stock", capability: "stock.team.read" },
  { label: "Mais", href: "/mais", icon: "more" },
];
const groups: { label: string; items: Item[] }[] = [
  { label: "Área de trabalho", items: [
    { label: "Visão geral", href: "/", icon: "home" },
    { label: "Histórico de fichas", href: "/historico", icon: "history" },
    { label: "Notificações", href: "/notificacoes", icon: "bell" },
    { label: "Escalas e plantões", href: "/escalas", icon: "calendar", capabilities: ["schedule.read.own", "schedule.read.team"] },
  ] },
  { label: "Fichas", items: [
    { label: "REQ · Requisição", href: "/fichas/req", icon: "forms", capability: "req.create" },
    { label: "COM · Compra da família", href: "/fichas/com", icon: "stock", capability: "com.create" },
    { label: "ENT · Entrega / Entrada", href: "/fichas/ent", icon: "truck", capability: "ent.create" },
    { label: "BAL · Balanços e plantões", href: "/balancos", icon: "forms", capability: "bal.read" },
    { label: "Entregas e recebimentos", href: "/entregas", icon: "truck", capability: "ent.read" },
  ] },
  { label: "Estoque e ocorrências", items: [
    { label: "Estoque da família", href: "/estoque?custody=FAMILY", icon: "stock", capability: "stock.family.read" },
    { label: "Estoque da equipe", href: "/estoque?custody=CARE_TEAM", icon: "stock", capability: "stock.team.read" },
    { label: "Materiais em trânsito", href: "/estoque?custody=TRANSIT", icon: "truck", capability: "ent.read" },
    { label: "Ocorrências e consumo", href: "/consumo", icon: "forms", capability: "consumption.report" },
  ] },
  { label: "Gestão do paciente", items: [
    { label: "Centro administrativo", href: "/admin", icon: "settings", capability: "access.manage" },
    { label: "Pessoas e vínculos", href: "/admin?section=memberships", icon: "team", capability: "access.manage" },
    { label: "Permissões e regras", href: "/configuracoes", icon: "settings", capability: "access.manage" },
    { label: "Catálogo", href: "/admin?section=catalog", icon: "stock", capability: "catalog.manage" },
    { label: "Unidades e apresentações", href: "/unidades", icon: "stock", capability: "catalog.manage" },
    { label: "Auditoria", href: "/admin?section=audit", icon: "history", capability: "audit.read" },
  ] },
];
export function WorkspaceNavigation({ context, operational = false, onNavigate }: {
  context: WorkspaceContext | null; operational?: boolean; onNavigate: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = (item: Item) => {
    const [base, search] = item.href.split("?");
    if (pathname !== base) return false;
    if (!search) return !params.has("section");
    const query = new URLSearchParams(search);
    return [...query].every(([key, value]) => (params.get(key) ?? (key === "custody" ? context?.patient?.capabilities?.["stock.family.read"] ? "FAMILY" : "CARE_TEAM" : "")) === value);
  };
  const filtered = (items: Item[]) => items.filter((item) => (!item.capability || context && can(context, item.capability)) && (!item.capabilities || context && item.capabilities.some(capability => can(context, capability))));
  const sections = operational ? [{ label: "Seu plantão", items: filtered(operationalDestinations) },
    { label: "Ações rápidas", items: filtered(groups.flatMap((group) => group.items).filter((item) => ["/fichas/req", "/balancos", "/consumo", "/escalas"].includes(item.href))) },
    { label: "Gestão autorizada", items: filtered(groups.find((group) => group.label === "Gestão do paciente")!.items) }] : groups.map((group) => ({ ...group, items: filtered(group.items) }));
  if (context?.activeContext?.mode === "global" && context.globalAdministrationAllowed) sections.push({ label: "Administração global", items: [
    { label: "Pacientes", href: "/admin?section=patient", icon: "team" },
    { label: "Contas globais", href: "/admin?section=profiles", icon: "user" },
    { label: "Unidades globais", href: "/unidades", icon: "stock" },
  ] });
  return <nav aria-label="Navegação principal" className="hca-side-navigation">{sections.filter((group) => group.items.length).map((group) => <details key={group.label} open={group.label === "Área de trabalho" || group.label === "Seu plantão" || group.items.some(selected)}>
    <summary><h2>{group.label}</h2><Icon name="chevron" width={14} /></summary>
    {group.items.map((item) => <Link key={item.href} href={item.href} prefetch={false} onClick={onNavigate} aria-current={selected(item) ? "page" : undefined}>
      {item.icon ? <Icon name={item.icon} /> : null}<span>{item.label}</span>
    </Link>)}
  </details>)}</nav>;
}
export function BottomNavigation({ context }: { context: WorkspaceContext }) {
  const pathname = usePathname();
  return <nav className="hca-bottom-navigation print:hidden" aria-label="Navegação do plantão">{operationalDestinations.filter((item) => !item.capability || can(context, item.capability)).map((item) => <Link key={item.href} href={item.href} prefetch={false} aria-current={pathname === item.href.split("?")[0] ? "page" : undefined}>
    <Icon name={item.icon!} /><span>{item.label}</span>
  </Link>)}</nav>;
}
