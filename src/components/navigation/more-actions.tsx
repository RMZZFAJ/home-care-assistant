"use client";
import Link from "next/link";
import { Workspace, can } from "@/components/workspace";
import { Icon, type IconName } from "@/components/ui/primitives";

const actions: { label: string; description: string; href: string; icon: IconName; capability?: string; capabilities?: string[] }[] = [
  { label: "Escalas e plantões", description: "Programação, substituições e propostas", href: "/escalas", icon: "calendar", capabilities: ["schedule.read.own", "schedule.read.team"] },
  { label: "Nova requisição", description: "Solicitar os materiais necessários", href: "/fichas/req", icon: "forms", capability: "req.create" },
  { label: "Nova compra", description: "Organizar aquisição ou doação da família", href: "/fichas/com", icon: "stock", capability: "com.create" },
  { label: "Nova entrega", description: "Expedir materiais entre custódias", href: "/fichas/ent", icon: "truck", capability: "ent.create" },
  { label: "Balanços e plantões", description: "Consultar programação, contagens, revisões e adiamentos", href: "/balancos", icon: "forms", capability: "bal.read" },
  { label: "Ocorrências e consumo", description: "Registrar faltas ou situações extraordinárias", href: "/consumo", icon: "forms", capability: "consumption.report" },
  { label: "Notificações", description: "Avisos e tarefas relacionados ao cuidado", href: "/notificacoes", icon: "bell" },
  { label: "Meu perfil e segurança", description: "Contato, preferências, senha e autenticação", href: "/perfil", icon: "user" },
  { label: "Administração do paciente", description: "Pessoas, catálogo e regras autorizadas", href: "/admin", icon: "settings", capability: "access.manage" },
  { label: "Catálogo e unidades", description: "Apresentações e medidas dos produtos", href: "/unidades", icon: "stock", capability: "catalog.manage" },
];
export function MoreActions() {
  return <Workspace title="Mais opções">{(context) => <nav aria-label="Rotina e funções autorizadas" className="hca-records">{actions.filter((action) => (!action.capability || can(context, action.capability)) && (!action.capabilities || action.capabilities.some(capability => can(context, capability)))).map((action) => <Link className="hca-record" key={action.href} href={action.href} prefetch={false}>
    <span className="hca-task-icon"><Icon name={action.icon} /></span><span className="hca-record-main"><strong>{action.label}</strong><small>{action.description}</small></span><Icon name="arrow" />
  </Link>)}</nav>}</Workspace>;
}
