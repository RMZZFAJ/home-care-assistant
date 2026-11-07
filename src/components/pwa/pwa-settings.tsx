"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { usePwa } from "./pwa-provider";
export function PwaSettings() {
  const pwa = usePwa();
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
          ? "Preparando orientação offline…"
          : pwa.worker === "ready"
            ? "Orientação pública disponível para falta de conexão."
            : pwa.worker === "unavailable"
              ? "A instalação e a orientação offline não estão disponíveis neste navegador. As funções web continuam disponíveis."
              : "Não foi possível preparar a orientação offline. As funções web continuam disponíveis."}
      </p>
      {pwa.waiting ? (
        <div className="ui-notice" role="status">
          <p>
            Atualização pronta. Salve seus rascunhos no sistema e encerre todas
            as abas do Home Care Assistant. A nova versão ficará disponível ao
            reabrir o aplicativo. Esta aba não será recarregada automaticamente.
          </p>
        </div>
      ) : null}
      {pwa.message ? <p role="status">{pwa.message}</p> : null}
      {pwa.error ? <p role="alert">{pwa.error}</p> : null}
      <button
        type="button"
        className="ui-button ui-button-secondary"
        disabled={pwa.offline}
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
