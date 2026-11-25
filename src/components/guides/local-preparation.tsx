"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Workspace, Notice, primaryClass, type WorkspaceContext } from "@/components/workspace";
import { ActionButton, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { useScopedRead } from "@/lib/use-scoped-read";
import { can } from "@/lib/client/capabilities";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import {
  localPreparationArea, mayPrepareLocally, parseLocalPreparation, type LocalPreparation, type LocalPreparationArea,
} from "@/lib/validation/local-preparation";
import "./guides.css";
import "./local-preparation.css";

type Area = {
  id: LocalPreparationArea;
  title: string;
  icon: IconName;
  summary?: string;
  attention?: boolean;
  explanation: string;
  facts?: { label: string; value: string | number }[];
  destinations?: { path: string; label: string }[];
};

const restricted = "Acesso restrito a esta informação";

export function LocalPreparationPage() {
  return <Workspace title="Preparação da residência" eyebrow="Organização">{context => mayPrepareLocally(context)
    ? <PreparationTasks key={context.userId + ":" + context.patient!.id + ":" + context.patient!.role} context={context} />
    : <Notice>Abra um vínculo local autorizado para acompanhar a preparação. Criar o cadastro global não concede esse vínculo. <Link href="/perfil">Consultar meus vínculos</Link></Notice>
  }</Workspace>;
}

function PreparationTasks({ context }: { context: WorkspaceContext }) {
  const patient = context.patient!;
  const router = useRouter();
  const search = useSearchParams();
  const revision = useLiveRevision();
  const decode = useCallback((value: unknown) => parseLocalPreparation((value as { data?: unknown })?.data, patient.id), [patient.id]);
  const read = useScopedRead("/api/guides/preparation?careRecipientId=" + patient.id, String(revision), decode);
  const [selected, setSelected] = useState<LocalPreparationArea | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [dismissed, setDismissed] = useState<unknown>(null);
  const triggersRef = useRef<Partial<Record<LocalPreparationArea, HTMLButtonElement | null>>>({});
  const refreshRef = useRef<HTMLButtonElement>(null);
  const resumed = localPreparationArea.safeParse(search.get("area")).data;
  const areas = read.data ? describeAreas(read.data) : [];
  const active = areas.find(area => area.id === (selected ?? resumed));
  const failed = !read.loading && Boolean(read.error) && read.errorCause !== dismissed;
  const historical = read.loading || Boolean(read.error);
  const scope = (path: string, area?: LocalPreparationArea) => {
    const query = new URLSearchParams({ careRecipientId: patient.id });
    if (area) query.set("fromPreparation", area);
    return path + (path.includes("?") ? "&" : "?") + query.toString();
  };

  function closeArea() {
    setSelected(null);
    if (resumed) router.replace(scope("/preparacao-local"), { scroll: false });
  }

  useOperationActivity(read.loading, { title: "Consultando a preparação", detail: "Conferindo os registros disponíveis para este vínculo." });
  return <div className="hca-local-preparation hca-guide-page hca-docked-page">
    <div className="hca-preparation-content hca-docked-content">
      <section className="ui-card hca-guide-card hca-preparation-intro">
        <div className="hca-preparation-lead">
          <span className="hca-guide-row-icon"><Icon name="home" /></span>
          <div><h2>Organize o começo da rotina</h2><p>Acompanhe cada área da residência e abra a tarefa que precisa de atenção.</p></div>
        </div>
        {read.data ? <DefinitionGrid items={[
          { label: "Paciente", value: read.data.patient.name },
          { label: historical ? "Última consulta confirmada" : "Consulta", value: formatBrazilDate(read.data.observedAt) },
        ]} /> : null}
        <p className="hca-preparation-hint"><Icon name="info" width={16} height={16} /><span>Os dados abaixo orientam a preparação. A conferência física continua com as pessoas responsáveis.</span></p>
      </section>
      {read.data ? <>
        <section className="ui-card hca-guide-card hca-preparation-areas" aria-label="Áreas da preparação">
          <h2>Áreas da preparação</h2>
          {areas.map(area => <button key={area.id} type="button" className="hca-guide-row"
            ref={node => { triggersRef.current[area.id] = node; }} onClick={() => setSelected(area.id)}>
            <span className="hca-guide-row-icon"><Icon name={area.icon} /></span>
            <span className="hca-guide-row-label"><strong>{area.title}</strong><small>{area.summary ?? "Disponível para a administração do paciente"}</small></span>
            <Pill tone={area.attention ? "warning" : "neutral"}>{area.attention ? "Preparar" : area.facts ? "Consultar" : "Restrito"}</Pill>
            <Icon name="chevron" width={16} />
          </button>)}
        </section>
        <section className="ui-card hca-guide-card" aria-label="Conferência física e continuidade">
          <h2>Conferência física e continuidade</h2>
          <DefinitionGrid className="hca-preparation-registration" items={[
            { label: "Situação do cadastro", value: read.data.patient.active ? "Ativo" : "Inativo" },
            ...(read.data.patient.referenceTimeZone ? [{ label: "Fuso indicado na preparação", value: read.data.patient.referenceTimeZone }] : []),
          ]} />
          <p>Combine com os responsáveis como guardar referências físicas, comunicar interrupções e retomar cada fato sem duplicação. A pessoa que regulariza o fato registra a própria autoria.</p>
          <p>Esta consulta mostra metadados registrados. Ela não confirma estoque físico, presença, ciência, recebimento ou início do atendimento.</p>
          <Link className="hca-control hca-control--secondary" href={scope("/guias")}>Reabrir orientação do meu papel</Link>
        </section>
      </> : null}
    </div>
    <div className="hca-guide-actions">
      <Link className="hca-control hca-control--secondary" href={scope(can(context, "contingency.read") ? "/contingencias" : "/guias")}>
        <Icon name="help" />Orientação de contingência
      </Link>
      <ActionButton ref={refreshRef} aria-disabled={read.loading} onClick={() => { if (!read.loading) { setAttempts(0); read.refresh(); } }}>
        <Icon name="refresh" />Atualizar situação
      </ActionButton>
    </div>
    {active && !failed && <Drawer open title={active.title} headingIcon={active.facts ? active.icon : "lock"} kicker="Preparação da residência"
      finalFocus={() => triggersRef.current[active.id] ?? refreshRef.current ?? false} onClose={closeArea} popupClassName="hca-guide-topic-sheet"
      footer={<>
        <ActionButton onClick={closeArea}><Icon name="back" />Voltar à preparação</ActionButton>
        {active.destinations?.map((destination, index) => <Link key={destination.path}
          className={index === 0 ? primaryClass : "hca-control hca-control--secondary"} href={scope(destination.path, active.id)}>
          {destination.label}<Icon name="arrow" />
        </Link>)}
      </>}>
      <p>{active.facts ? active.explanation : "Sua função não permite consultar esta parte da preparação."}</p>
      {active.facts ? <>
        <DefinitionGrid items={active.facts} />
        <Notice>Ao voltar, você retoma esta preparação no mesmo ponto.</Notice>
      </> : <Notice>Consulta restrita. A administração do paciente pode conferir a situação.</Notice>}
    </Drawer>}
    {failed && <DocumentOperationFailureDialog title="Não foi possível consultar a preparação" outcome="rejected"
      operation="Consultar preparação" fallbackCode="PREPARACAO_LOCAL_INDISPONIVEL" description={read.error} cause={read.errorCause}
      guidance={read.data ? "A tela conserva a última consulta confirmada e sua data." : "Confira seu vínculo e consulte a preparação novamente."}
      attempts={attempts} onClose={() => setDismissed(read.errorCause)} closeLabel="Voltar à preparação" finalFocus={refreshRef}
      action={attempts < operationRecoveryLimit ? { label: "Consultar novamente", onClick: () => { setAttempts(count => count + 1); read.refresh(); } } : undefined}
      exhaustedMessage={attempts >= operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined} />}
  </div>;
}

function describeAreas(data: LocalPreparation): Area[] {
  const { people, catalogue, stock, schedules, balance, communication } = data;
  return [
    {
      id: "people", title: "Pessoas e vínculos", icon: "users", summary: people ?
        pluralCount(people.activeMemberships, "vínculo ativo", "vínculos ativos") + " · " + pluralCount(people.pendingInvitations, "convite pendente", "convites pendentes") : undefined,
      explanation: "As pessoas planejadas só recebem acesso pelos vínculos e aceites próprios.",
      facts: people ? [
        { label: "Vínculos ativos", value: people.activeMemberships },
        { label: "Convites válidos", value: people.pendingInvitations },
        { label: "Convites expirados", value: people.expiredInvitations },
      ] : undefined,
      destinations: people ? [
        { path: "/admin?section=memberships", label: "Conferir pessoas e vínculos" },
        { path: "/admin?section=invitations", label: "Preparar convites locais" },
      ] : undefined,
    },
    {
      id: "catalogue", title: "Materiais e apresentações", icon: "box", attention: catalogue?.activeProducts === 0,
      summary: catalogue ? catalogue.activeProducts ? pluralCount(catalogue.activeProducts, "material ativo", "materiais ativos") : "Nenhum material ativo" : undefined,
      explanation: "Confira a unidade, a apresentação e a precisão de cada material. A adoção de um modelo depende de escolha explícita.",
      facts: catalogue ? [
        { label: "Materiais ativos", value: catalogue.activeProducts },
        { label: "Materiais inativos", value: catalogue.inactiveProducts },
        { label: "Unidades e apresentações", value: "Conferir no catálogo" },
      ] : undefined,
      destinations: catalogue ? [{ path: "/admin?section=catalog", label: "Preparar materiais do paciente" }] : undefined,
    },
    {
      id: "stock", title: "Estoque e custódias", icon: "home",
      summary: stock ? stock.familyMovements || stock.teamMovements ? "Há movimentações registradas" : stock.familyMovements === null && stock.teamMovements === null ? "Custódias com acesso restrito" : "Sem movimentos nas custódias consultadas" : undefined,
      explanation: "Confira os materiais físicos da família e da equipe. Registre a origem, a quantidade e o motivo pelo fluxo da custódia.",
      facts: stock ? [
        { label: "Movimentos com custódia familiar", value: stock.familyMovements ?? restricted },
        { label: "Movimentos com custódia da equipe", value: stock.teamMovements ?? restricted },
        { label: "Contagem física", value: "Conferência própria" },
      ] : undefined,
      destinations: stock ? [
        ...(stock.familyMovements !== null || stock.canManageFamily ? [{ path: "/estoque?custody=FAMILY", label: stock.canManageFamily ? "Preparar estoque familiar" : "Conferir estoque familiar" }] : []),
        ...(stock.teamMovements !== null ? [{ path: "/estoque?custody=CARE_TEAM", label: "Conferir estoque da equipe" }] : []),
      ] : undefined,
    },
    {
      id: "schedules", title: "Escalas e responsabilidades", icon: "calendar",
      summary: schedules ? schedules.upcomingShifts + " plantões publicados vigentes ou futuros" : undefined,
      explanation: "A escala organiza a rotina. A presença da pessoa continua sendo um registro próprio.",
      facts: schedules ? [
        { label: "Registros de escala preservados", value: schedules.totalShifts },
        { label: "Plantões publicados vigentes ou futuros", value: schedules.upcomingShifts },
      ] : undefined,
      destinations: schedules ? [{ path: "/escalas", label: schedules.canManageTeam ? "Preparar escala da equipe" : "Conferir escala autorizada" }] : undefined,
    },
    {
      id: "balance", title: "Regime de balanços", icon: "check",
      summary: balance ? balance.enabled ? "Balanço habilitado" : "Balanço desabilitado" : undefined,
      explanation: "Prepare horários e responsáveis. A contagem e sua aplicação ao estoque continuam separadas.",
      facts: balance ? [
        { label: "Regime de balanço", value: balance.enabled ? "Habilitado" : "Desabilitado" },
        { label: "Fuso do regime", value: balance.timeZone ?? "Não configurado" },
        { label: "Contagem inicial", value: "Conferência própria" },
      ] : undefined,
      destinations: balance ? [{ path: "/balancos", label: balance.canConfigure ? "Preparar regime de balanços" : "Conferir balanços autorizados" }] : undefined,
    },
    {
      id: "communication", title: "Comunicação e orientação", icon: "bell",
      summary: communication ? communication.guideEnabled ? "Guia inicial habilitado" : "Guia inicial desabilitado" : undefined,
      explanation: "Confira canais, aparelhos e orientação de contingência com as pessoas responsáveis.",
      facts: communication ? [
        { label: "Apresentação do guia no primeiro acesso", value: communication.guideEnabled ? "Habilitada" : "Desabilitada" },
        { label: "Escolha local do guia", value: communication.guideConfigured ? "Registrada" : "Padrão inicial; pode ser alterado" },
      ] : undefined,
      destinations: communication ? [{ path: "/configuracoes", label: "Conferir regras e comunicação" }] : undefined,
    },
  ];
}

function pluralCount(value: number, singular: string, plural: string) {
  return value + " " + (value === 1 ? singular : plural);
}
