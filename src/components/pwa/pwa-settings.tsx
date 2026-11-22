"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { usePwa } from "./pwa-provider";
export function PwaSettings() {
  const pwa = usePwa();
  const issues: Record<string, string> = {
    registration_failed: "Não foi possível iniciar a preparação. Confira a conexão e o acesso a este endereço do Preview, depois tente preparar novamente.",
    installation_failed: "A instalação da orientação offline falhou. Tente preparar novamente; reinstalar o aplicativo pela tela inicial não resolve essa etapa sozinho.",
    activation_failed: "A orientação offline foi recebida, mas sua ativação falhou. Tente preparar novamente; as funções web continuam disponíveis.",
    access_required: "O acesso aos arquivos públicos foi recusado. Abra e autentique este mesmo endereço do Preview no navegador e tente preparar novamente.",
    network_or_access: "Não foi possível buscar os arquivos públicos. Confira a conexão e o acesso a este endereço do Preview, depois tente preparar novamente.",
    public_asset_invalid: "Uma resposta não corresponde aos arquivos públicos desta versão. Ela não foi guardada na orientação offline. Confira o acesso e tente preparar novamente.",
    storage_unavailable: "O navegador não conseguiu guardar a orientação pública. Confira o espaço disponível e tente preparar novamente.",
    contract_unconfirmed: "A orientação offline ativou, mas não confirmou sua versão. Tente preparar novamente antes de ativar avisos.",
    update_failed: "Não foi possível preparar a atualização. A versão já ativa continua disponível; consulte novamente após conferir o acesso e a conexão.",
  };
  const phases = {
    registering: "Iniciando orientação offline…",
    installing: "Instalando orientação offline…",
    activating: "Ativando orientação offline…",
    verifying: "Conferindo a versão da orientação offline…",
    pending: "O navegador ainda não concluiu a preparação. Você pode consultar novamente ou tentar preparar a orientação offline outra vez.",
    ready: "Orientação pública disponível para falta de conexão.",
    failed: "Não foi possível preparar a orientação offline. As funções web continuam disponíveis.",
  };
  return (
    <SettingsSection
      title="Aplicativo neste aparelho"
      summary="Instalação, conexão e atualização"
    >
      <p>
        {pwa.installed
          ? "Aplicativo instalado neste aparelho."
          : "Você pode continuar usando todas as funções pelo navegador."}
      </p>
      {pwa.canInstall && !pwa.installed ? (
        <button
          type="button"
          className="ui-button ui-button-primary"
          disabled={pwa.installing || pwa.offline}
          onClick={() => void pwa.install()}
        >
          {pwa.installing ? "Abrindo instalação…" : "Instalar aplicativo"}
        </button>
      ) : !pwa.installed ? (
        <p>
          No menu do navegador, procure Instalar aplicativo ou Adicionar à tela
          inicial. A disponibilidade depende do navegador e do aparelho.
        </p>
      ) : null}
      <p>
        Fichas, PDFs, avisos e dados de pacientes exigem conexão e acesso
        autorizado. Não há envio automático de operações offline.
      </p>
      <p role="status">
        {pwa.worker === "checking"
          ? phases[pwa.workerPhase]
          : pwa.worker === "ready"
            ? "Orientação pública disponível para falta de conexão."
            : pwa.worker === "unavailable"
              ? "A instalação e a orientação offline não estão disponíveis neste navegador. As funções web continuam disponíveis."
              : "Não foi possível preparar a orientação offline. As funções web continuam disponíveis."}
      </p>
      {pwa.workerIssue && issues[pwa.workerIssue] ? <p role="alert">{issues[pwa.workerIssue]}</p> : null}
      {pwa.worker === "ready" && !pwa.pushTestReady ? <p role="status">A orientação offline deste aparelho é anterior ao teste de avisos. Consulte as atualizações antes de testar.</p> : null}
      {pwa.worker === "error" || pwa.workerPhase === "pending" ? <button type="button" className="ui-button ui-button-secondary" disabled={pwa.offline} onClick={() => void pwa.retryWorker()}>Tentar preparar orientação offline novamente</button> : null}
      <p>Instalar na tela inicial e preparar avisos são etapas diferentes. A instalação, sozinha, não confirma que os avisos estão prontos.</p>
      {pwa.previewInstallUrl ? <div className="ui-notice" role="status"><p>Para receber atualizações deste Preview, instale pelo endereço estável. Salve seus rascunhos antes de mudar de endereço; o acesso poderá ser solicitado novamente.</p><a href={pwa.previewInstallUrl} target="_blank" rel="noopener noreferrer" className="break-all">Abrir endereço estável do Preview</a><p>Uma instalação feita por outro endereço continua ligada àquele endereço.</p></div> : null}
      {pwa.waiting ? (
        <div className="ui-notice" role="status">
          <p>
            Atualização pronta neste aparelho. Salve seus preenchimentos antes
            de atualizar. Somente a aba que confirmar será recarregada.
          </p>
          <button type="button" className="ui-button ui-button-primary" disabled={pwa.updating || pwa.offline} onClick={pwa.requestUpdate}>Atualizar este aparelho</button>
        </div>
      ) : null}
      {pwa.message ? <p role="status">{pwa.message}</p> : null}
      {pwa.error ? <p role="alert">{pwa.error}</p> : null}
      <button
        type="button"
        className="ui-button ui-button-secondary"
        disabled={pwa.offline || (pwa.worker === "checking" && pwa.workerPhase !== "pending")}
        onClick={() => void pwa.checkUpdates()}
      >
        Consultar atualizações
      </button>
      {pwa.revision ? (
        <details>
          <summary>Versão para suporte</summary>
          <p className="break-all">{pwa.revision}</p>
        </details>
      ) : null}
    </SettingsSection>
  );
}
