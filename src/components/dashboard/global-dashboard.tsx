"use client";
import Link from "next/link";
import type { WorkspaceContext } from "@/types/workspace";
import { Icon } from "@/components/ui/primitives";

export function GlobalDashboard({ context }: { context: WorkspaceContext }) {
  return <div className="hca-dashboard"><div className="hca-dashboard-intro"><div><h2>Administração da plataforma</h2><p>Pacientes e identidades globais. Operações do cuidado utilizam seu vínculo local.</p></div></div>
    {context.globalAdministrationAllowed ? <><div className="hca-compact-grid">
      <Link href="/admin?section=patient" className="ui-card hca-admin-destination" prefetch={false}><Icon name="team" /><h2>Pacientes</h2><p>Consultar e administrar cadastros autorizados.</p></Link>
      <Link href="/admin?section=profiles" className="ui-card hca-admin-destination" prefetch={false}><Icon name="user" /><h2>Identidades globais</h2><p>Contas e situação de acesso à plataforma.</p></Link>
      <Link href="/unidades" className="ui-card hca-admin-destination" prefetch={false}><Icon name="stock" /><h2>Unidades globais</h2><p>Medidas utilizadas pelos catálogos.</p></Link>
    </div><section className="hca-records"><div className="hca-dashboard-section-heading"><h2>Pacientes autorizados</h2><span>{context.patients.length} cadastros</span></div>
      {context.patients.map((patient) => <Link key={patient.id} href={"/admin?section=patient&careRecipientId=" + patient.id} className="hca-record" prefetch={false}><span className="hca-record-main"><strong>{patient.display_name}</strong><small>{patient.is_active === false ? "Inativo · histórico preservado" : "Cadastro ativo"}</small></span><Icon name="arrow" /></Link>)}
      {!context.patients.length ? <p className="p-5 text-sm text-(--muted)">Nenhum paciente cadastrado. Use Pacientes para iniciar um cadastro.</p> : null}
    </section></> : <p className="text-sm">Conclua a verificação de segurança para acessar as operações globais.</p>}
  </div>;
}
