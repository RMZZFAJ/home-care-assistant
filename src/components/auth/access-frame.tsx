import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/primitives";
import "./access-frame.css";

type AccessStep = "login" | "recovery" | "invitation";

/** Public journeys share the model's frame without exposing private navigation. */
export function AccessFrame({ active, title, children, returnTo }: {
  active: AccessStep; title: string; children: ReactNode; returnTo?: string | null;
}) {
  return <div className="hca-public-access">
    <header className="hca-access-header">
      <Link href="/" tabIndex={0} className="app-brand" aria-label="Home Care Assistant — início"><span><Icon name="home" /></span><strong>Home Care Assistant<small>Insumos, família e equipe</small></strong></Link>
      <span className="hca-access-header-label">Acesso pessoal</span>
    </header>
    <main id="workspace-content" tabIndex={-1} className="hca-access-main">
      <section className="ui-card hca-access-card" aria-label={title}>
        <header className="hca-auth-intro"><span className="hca-auth-symbol"><Icon name={active === "invitation" ? "users" : active === "recovery" ? "refresh" : "lock"} /></span><h1 tabIndex={-1}>{title}</h1><p>{active === "invitation" ? "Confira o vínculo e entre com a conta convidada antes de decidir." : active === "recovery" ? "Recupere seu acesso pessoal com segurança." : "Acesse sua conta para acompanhar o cuidado."}</p></header>
        {children}
        {active === "login" ? <p className="hca-auth-footer">Recebeu um convite? <Link href="/convites/aceitar">Abrir convite</Link></p> : <p className="hca-auth-footer"><Link href={"/login" + (returnTo ? "?next=" + encodeURIComponent(returnTo) : "")}>Voltar ao login</Link></p>}
      </section>
    </main>
  </div>;
}
