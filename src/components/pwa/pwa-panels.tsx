"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog, Drawer } from "@/components/ui/overlays";
import type { observeTabCommands } from "@/lib/client/tab-commands";
import type { PwaState } from "./pwa-provider";
import "./push-device-panels.css";
import "./pwa-panels.css";

export type PwaPanel = "app" | "connection";

const issues: Record<string, string> = {
  registration_failed: "Confira a conexão e o acesso a este endereço, depois tente preparar novamente.",
  installation_failed: "A instalação da orientação offline falhou. Tente preparar novamente.",
  activation_failed: "A orientação offline foi recebida, mas sua ativação falhou. Tente preparar novamente.",
  access_required: "O acesso aos arquivos públicos foi recusado. Abra e autentique este endereço do Preview no navegador e tente preparar novamente.",
  network_or_access: "Não foi possível buscar os arquivos públicos. Confira a conexão e o acesso a este endereço.",
  public_asset_invalid: "Uma resposta não corresponde aos arquivos públicos desta versão. Confira o acesso e tente preparar novamente.",
  storage_unavailable: "O navegador não conseguiu guardar a orientação pública. Confira o espaço disponível e tente preparar novamente.",
  contract_unconfirmed: "A orientação offline ativou, mas a versão ainda não foi confirmada. Confira a preparação antes de ativar avisos.",
  update_failed: "Não foi possível preparar a atualização. A versão já ativa continua disponível.",
};

export function preparationDetail(issue: string) {
  return issues[issue] ?? "Não foi possível preparar a orientação offline. O acesso pelo navegador continua disponível.";
}

const phases: Record<PwaState["workerPhase"], string> = {
  registering: "Iniciando orientação offline…",
  installing: "Instalando orientação offline…",
  activating: "Ativando orientação offline…",
  verifying: "Conferindo a versão da orientação offline…",
  pending: "O navegador ainda não concluiu a preparação. Confira novamente.",
  ready: "Orientação pública disponível para falta de conexão.",
  failed: "O acesso pelo navegador continua disponível.",
};

function Row({ icon, title, text, end }: { icon: IconName; title: string; text: string; end?: ReactNode }) {
  return <div className="hca-push-detail">
    <span className="hca-push-glyph"><Icon name={icon} width={19} height={19} /></span>
    <div><strong>{title}</strong><p>{text}</p></div>
    {end}
  </div>;
}

function Badge({ children, ready = false }: { children: ReactNode; ready?: boolean }) {
  return <span className={`hca-status hca-status--${ready ? "success" : "neutral"}`}>{children}</span>;
}

function Details({ title, children }: { title: string; children: ReactNode }) {
  return <details className="hca-pwa-details"><summary>{title}<Icon name="down" /></summary>{children}</details>;
}

export function PwaPanels({ panel, pwa, finalFocus, blockedBySend, sendCount, sendCheck, checkingSend, onCheckSend, onReturnToSend, onClose, overlay }: {
  panel: PwaPanel; pwa: PwaState; finalFocus: RefObject<HTMLButtonElement | null>;
  blockedBySend: boolean; sendCount: number; sendCheck: Awaited<ReturnType<typeof observeTabCommands>> | null; checkingSend: boolean;
  onCheckSend: () => void; onReturnToSend: (destination: string) => void; onClose: () => void; overlay: ReactNode;
}) {
  const [installGuide, setInstallGuide] = useState<"native" | "manual" | null>(null);
  const back = <ActionButton onClick={onClose}>Voltar</ActionButton>;
  const ready = pwa.worker === "ready";
  const preparing = pwa.worker === "checking" && pwa.workerPhase !== "pending";
  const checkingDisabled = pwa.offline || pwa.checkingUpdates || preparing || pwa.updating || pwa.worker === "unavailable";
  const checkVersion = (label: string) => <ActionButton variant="primary" disabled={checkingDisabled} onClick={() => void pwa.checkUpdates()}>
    <Icon name="refresh" />{pwa.checkingUpdates ? "Verificando…" : label}
  </ActionButton>;

  if (panel === "app") return <Drawer open title="Aplicativo neste aparelho" kicker="Avisos e aplicativo" headingIcon="phone"
      popupClassName="hca-preference-sheet hca-push-sheet hca-pwa-sheet" keyboardScrollable onClose={onClose} finalFocus={finalFocus}
      footer={<>{back}{checkVersion("Verificar atualizações")}</>}>
      <div className="hca-pwa-brand"><span><Icon name="home" width={28} height={28} /></span><div>
        <strong>Home Care Assistant</strong><small>{pwa.installed ? "Na sua tela inicial" : "Sempre perto do cuidado"}</small>
      </div></div>
      <section className="hca-pwa-section">
        <h3>Instalação</h3>
        <Row icon="phone" title={pwa.installed ? "Aplicativo instalado" : "Instalação opcional"}
          text={pwa.installed ? "Abra pela tela inicial deste aparelho." : "Continue no navegador ou adicione à tela inicial."}
          end={<Badge ready={pwa.installed}>{pwa.installed ? "Instalado" : "Disponível"}</Badge>} />
        {pwa.installed ? null : <ActionButton disabled={pwa.installing} onClick={() => setInstallGuide(pwa.canInstall && !pwa.offline ? "native" : "manual")}>
          <Icon name="download" />{pwa.installing ? "Abrindo instalação…" : pwa.canInstall && !pwa.offline ? "Instalar aplicativo" : "Ver como instalar"}
        </ActionButton>}
      </section>
      <section className="hca-pwa-section">
        <h3>Versão e preparação</h3>
        <div role="status"><Row icon={ready ? "check-circle" : "refresh"}
          title={ready ? pwa.checkedAt && !pwa.waiting ? "Você está na versão atual" : "Aplicativo preparado" : preparing ? "Preparação em andamento" : "Preparação não concluída"}
          text={pwa.worker === "unavailable" ? "A orientação offline não está disponível neste navegador." : pwa.workerIssue ? preparationDetail(pwa.workerIssue) : phases[pwa.workerPhase]}
          end={<Badge ready={ready}>{ready ? "Pronto" : preparing ? "Preparando" : "A conferir"}</Badge>} /></div>
        {ready && !pwa.pushTestReady ? <p>Atualize a orientação offline antes de testar os avisos neste aparelho.</p> : null}
        {ready || pwa.worker === "unavailable" ? null : <ActionButton disabled={pwa.offline || preparing} onClick={() => void pwa.retryWorker()}><Icon name="refresh" />Conferir preparação</ActionButton>}
      </section>
      {pwa.previewInstallUrl ? <div className="ui-notice"><p>Para receber atualizações deste Preview, instale pelo endereço estável.</p>
        <a href={pwa.previewInstallUrl} target="_blank" rel="noopener noreferrer">Abrir endereço estável do Preview</a></div> : null}
      <Details title="O que funciona sem conexão?">
        <p>O guia público pode continuar disponível. Fichas, arquivos, avisos privados e ações do paciente exigem conexão e sessão válida.</p>
        <p>Nenhuma gravação fica em fila para envio automático quando a rede voltar.</p>
      </Details>
      {pwa.revision ? <Details title="Versão para suporte"><p className="break-all">{pwa.revision}</p></Details> : null}
    {overlay}
    {installGuide === "native" && !overlay ? <Dialog open title="Instalar neste aparelho" kicker="Home Care Assistant" headingIcon="home"
      onClose={() => setInstallGuide(null)} footer={<>
        <ActionButton onClick={() => setInstallGuide(null)}>Agora não</ActionButton>
        <ActionButton variant="primary" disabled={!pwa.canInstall || pwa.offline} onClick={() => { void pwa.install(); setInstallGuide(null); }}><Icon name="download" />Instalar aplicativo</ActionButton>
      </>}>
      <Row icon="phone" title="Acesso pela tela inicial" text="Abra o sistema como aplicativo." />
      <p>A instalação é opcional. Seus dados e permissões continuam vinculados à conta.</p>
    </Dialog> : null}
    {installGuide === "manual" && !overlay ? <Dialog open title="Instalação pelo navegador" headingIcon="phone"
      onClose={() => setInstallGuide(null)} footer={<ActionButton variant="primary" onClick={() => setInstallGuide(null)}>Entendi</ActionButton>}>
      <ol className="hca-pwa-instructions">
        <li><strong>Abra o menu do navegador</strong><p>Procure Instalar aplicativo ou Adicionar à tela inicial.</p></li>
        <li><strong>Confirme a instalação</strong><p>Se essa opção não existir, continue usando o sistema pelo navegador.</p></li>
      </ol>
    </Dialog> : null}
  </Drawer>;

  const online = !pwa.offline && pwa.runtime === "ready";
  const updateReady = online && pwa.waiting;
  const title = pwa.offline ? "Sem conexão" : pwa.runtime === "checking" ? "Conferindo a conexão" : pwa.runtime === "incompatible" ? "Atualização necessária" : !online ? "Conexão indisponível" : updateReady ? "Uma nova versão está pronta" : pwa.updated ? "Esta aba está atualizada" : "Tudo conectado";
  const copy = pwa.offline ? "Reconecte o aparelho para consultar dados e concluir ações." : pwa.runtime === "checking" ? "Aguarde a conferência da conexão e da versão." : pwa.runtime === "incompatible" ? "Esta aba precisa carregar uma versão compatível." : !online ? "Confira a conexão antes de tentar novamente." : updateReady ? "Atualize esta aba quando estiver pronto para continuar." : "O sistema está disponível para o seu acesso.";
  const unresolved = sendCheck?.state === "uncertain" || sendCheck?.state === "pending" ? sendCheck : null;
  return <Drawer open title="Conexão e atualização" kicker="Neste aparelho" headingIcon="refresh"
    popupClassName="hca-preference-sheet hca-push-sheet hca-pwa-sheet" keyboardScrollable onClose={onClose} finalFocus={finalFocus}
    footer={<>{back}{!online ? <ActionButton variant="primary" disabled={pwa.offline || pwa.runtime === "checking"} onClick={() => void pwa.refresh()}><Icon name="refresh" />Conferir conexão</ActionButton>
      : updateReady ? <ActionButton variant="primary" disabled={blockedBySend || pwa.updating} onClick={pwa.requestUpdate}><Icon name="refresh" />Atualizar esta aba</ActionButton>
      : checkVersion("Verificar atualização")}</>}>
    <div className="hca-push-lead" role="status">
      <span className="hca-push-glyph"><Icon name={pwa.offline ? "monitor" : online && pwa.updated ? "check-circle" : "refresh"} width={25} height={25} /></span>
      <div><h3>{title}</h3><p>{copy}</p></div>
    </div>
    <div className="hca-push-rows">
      <Row icon="monitor" title="Conexão" text={online ? "Conectado" : pwa.offline ? "Sem conexão" : "A conferir"} end={online ? <Icon name="check-circle" /> : null} />
      <Row icon="refresh" title="Atualização" text={updateReady ? "Nova versão disponível" : online && pwa.updated ? "Concluída nesta aba" : online && ready ? "Versão compatível" : "Versão em conferência"} />
    </div>
    {blockedBySend ? <section className="hca-pwa-section">
      <h3>Operação em andamento</h3>
      <div role="status"><Row icon="clock" title={unresolved?.state === "uncertain" ? "Resultado a conferir" : "Confirmando o envio"}
        text={unresolved ? "Volte à operação para consultar o resultado da mesma tentativa." : "Aguarde a resposta por até 30 segundos."} /></div>
      {unresolved ? <ActionButton onClick={() => onReturnToSend(unresolved.destination)}>Voltar à operação</ActionButton> : null}
      {sendCount > 0 && !unresolved ? <ActionButton disabled={checkingSend} onClick={onCheckSend}><Icon name="refresh" />{checkingSend ? "Conferindo o envio…" : "Conferir o envio"}</ActionButton> : null}
    </section> : updateReady ? <p>A atualização recarrega somente esta aba. As outras continuam abertas.</p> : null}
    <Details title="Ao retomar a conexão"><p>As condições de acesso e versão serão conferidas. Nenhuma operação será reenviada automaticamente.</p></Details>
    {overlay}
  </Drawer>;
}
