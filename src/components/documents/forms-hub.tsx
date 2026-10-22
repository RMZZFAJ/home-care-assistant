"use client";

import Link from "next/link";
import { can, Workspace, Notice, primaryClass, buttonClass } from "@/components/workspace";
import { Icon } from "@/components/ui/primitives";
import { documentLabels, type DocumentType } from "@/types/documents";

const descriptions: Record<DocumentType, string> = { REQ: "Informe necessidades, estoque observado e urgência. Acompanhe o atendimento por item.", COM: "Organize a aquisição da família, aprove itens e valide a entrada no estoque.", ENT: "Transfira materiais entre família e equipe com confirmação do destinatário.", BAL: "Conte o estoque da equipe e reconcilie diferenças conforme as regras do paciente." };
export function FormsHub() { return <Workspace title="Central de fichas">{(context) => context.patient ? <div className="grid gap-4 md:grid-cols-2">{(Object.keys(documentLabels) as DocumentType[]).filter((type) => can(context, type.toLowerCase() + ".read")).map((type) => <section key={type} className="ui-card flex flex-col gap-4"><div className="flex items-center justify-between"><span className="document-type">{type}</span><Icon name="forms" /></div><div><h2 className="text-lg font-semibold">{documentLabels[type]}</h2><p className="mt-2 text-sm leading-6 text-(--muted)">{descriptions[type]}</p></div><div className="mt-auto flex flex-wrap gap-2 pt-2">{can(context, type === "BAL" ? "bal.count" : type.toLowerCase() + ".create") ? <Link className={primaryClass} href={"/fichas/" + type.toLowerCase()}>Nova ficha <Icon name="plus" width="16" /></Link> : null}<Link className={buttonClass} href={"/historico?type=" + type}>Consultar histórico</Link></div></section>)}</div> : <Notice>Selecione ou cadastre um paciente para começar.</Notice>}</Workspace>; }
