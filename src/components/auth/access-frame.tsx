import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/primitives";
import "./access-frame.css";

type AccessStep = "login" | "recovery" | "invitation";
const steps: { id: AccessStep; title: string; icon: IconName }[] = [
  { id: "login", title: "Entrar", icon: "lock" },
  { id: "recovery", title: "Recuperar", icon: "refresh" },
  { id: "invitation", title: "Aceitar convite", icon: "users" },
];

/** Public journeys share the model's frame without exposing private navigation. */
export function AccessFrame({ active, title, children, returnTo }: {
  active: AccessStep; title: string; children: ReactNode; returnTo?: string | null;
}) {
  function destination(step: AccessStep) {
    if (step === "invitation") return "/convites/aceitar";
    const query = new URLSearchParams();
    if (step === "recovery") query.set("access", "recover");
    if (returnTo) query.set("next", returnTo);
    return "/login" + (query.size ? "?" + query : "");
  }
  return <div className="hca-public-access">
    <header className="hca-access-header">
      <Link href="/" tabIndex={0} className="app-brand" aria-label="Home Care Assistant — início"><span><Icon name="home" /></span><strong>Home Care Assistant<small>Insumos, família e equipe</small></strong></Link>
    </header>
    <main id="workspace-content" tabIndex={-1} className="hca-access-main">
      <div className="page-heading"><div><h1>Acesso pessoal</h1><p>Entre com sua conta para acompanhar materiais e tarefas da residência.</p></div></div>
      <nav aria-label="Etapas do acesso" className="hca-document-tab-list">
        {steps.map(step => <Link key={step.id} href={destination(step.id)} tabIndex={0} prefetch={false} aria-current={active === step.id ? "page" : undefined} className="hca-document-tab hca-access-tab"><Icon name={step.icon} />{step.title}</Link>)}
      </nav>
      <section className="ui-card hca-access-card" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </section>
    </main>
  </div>;
}
