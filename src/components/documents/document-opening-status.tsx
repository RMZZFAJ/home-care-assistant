"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionButton, ActionLink } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { PageLoadingActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { ApiError } from "@/lib/client/api";
import { useOperationSupport } from "./use-operation-support";

export type OpeningFailure = { source: "catalogue" | "reference"; cause: unknown };

export function DocumentOpeningPending() {
  return <PageLoadingActivity title="Preparando a ficha"
    detail="Estamos consultando o catálogo e os dados necessários para abrir o formulário." />;
}

export function DocumentOpeningFailure({ failure, attempts, onRetry, back, operation }: {
  failure: OpeningFailure;
  attempts: number;
  onRetry: () => void;
  back: string | (() => void);
  operation: string;
}) {
  const router = useRouter();
  const accessDenied = failure.cause instanceof ApiError && [401, 403].includes(failure.cause.status);
  const catalogue = failure.source === "catalogue";
  const title = accessDenied ? "Não foi possível acessar os dados da ficha"
    : catalogue ? "Catálogo indisponível" : "Dados da ficha indisponíveis";
  const subtitle = accessDenied ? "Confira se sua sessão e seu vínculo permitem consultar estes dados."
    : catalogue ? "Os materiais não puderam ser carregados. Tente abrir o formulário novamente."
      : "Não foi possível consultar os dados necessários. Tente abrir o formulário novamente.";
  const { copy, details } = useOperationSupport({
    cause: failure.cause, operation, result: title, attempts, attemptLabel: "Tentativas de consulta",
    fallbackCode: catalogue ? "CATALOGO_ABERTURA" : "DADOS_ABERTURA",
  });
  const leave = typeof back === "string" ? () => router.push(back) : back;
  return <>
    <section className="hca-opening-placeholder" aria-label="Formulário indisponível">
      <Icon name="note" width={25} height={25} />
      <h2>Nova ficha</h2>
      <p>O formulário abre depois que os dados necessários estiverem disponíveis.</p>
    </section>
    <Dialog open failure="rejected" title={title} subtitle={subtitle} onClose={leave} popupClassName="hca-opening-error" footer={<>
      <ActionButton onClick={leave}>Voltar</ActionButton>
      {attempts < 2
        ? <ActionButton variant="primary" onClick={onRetry}><Icon name="refresh" />Tentar novamente</ActionButton>
        : <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar detalhes</ActionButton>}
    </>}>
      {attempts >= 2 ? <p className="hca-issuance-retry-limit">Tente abrir a ficha mais tarde. Copie os detalhes e avise o responsável pelo sistema.</p> : null}
      {details}
    </Dialog>
  </>;
}

export function DocumentCatalogueEmpty({ patientId, patientName, mayManage, hasInactive, onPlanExtra }: {
  patientId: string;
  patientName: string;
  mayManage: boolean;
  hasInactive: boolean;
  onPlanExtra?: () => void;
}) {
  const registrationPurpose = onPlanExtra ? "para usar o catálogo nesta compra." : "para liberar o preenchimento das fichas.";
  const description = hasInactive
    ? mayManage ? `Reative um material ou cadastre um novo ${registrationPurpose}`
      : "Peça ao administrador do paciente para revisar os materiais inativos."
    : mayManage ? `Cadastre o primeiro material ${registrationPurpose}`
      : "Peça ao administrador do paciente para cadastrar os materiais da residência.";
  return <section className="hca-opening-catalogue">
    <nav aria-label="Localização"><Link href="/fichas">Fichas</Link><Icon name="arrow" width={12} height={12} /><span aria-current="page">Catálogo de materiais</span></nav>
    <p className="hca-opening-patient"><Icon name="home" width={13} height={13} />{patientName}</p>
    <h1>Catálogo de materiais</h1>
    <div className="hca-opening-empty">
      <span className="hca-opening-empty-icon"><Icon name="box" width={26} height={26} /></span>
      <h2>{hasInactive ? "Nenhum material ativo" : "Nenhum material cadastrado"}</h2>
      <p>{description}</p>
      {mayManage ? <ActionLink variant="primary" href={"/admin?" + new URLSearchParams({
        section: "catalog", careRecipientId: patientId,
      })}><Icon name="plus" />{hasInactive ? "Gerenciar materiais" : "Cadastrar material"}</ActionLink> : null}
      {onPlanExtra ? <>
        <p>Você pode planejar a compra e identificar o item extra depois.</p>
        <ActionButton onClick={onPlanExtra}>Planejar com item extra</ActionButton>
      </> : null}
    </div>
  </section>;
}
