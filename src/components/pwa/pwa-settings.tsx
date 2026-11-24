"use client";

import { Icon } from "@/components/ui/icon";
import { usePwa } from "./pwa-provider";

export function PwaSettings() {
  const { openPanel, offline, runtime, waiting } = usePwa();
  const connection = offline ? "Sem conexão" : runtime !== "ready" ? "Conexão a conferir" : waiting ? "Nova versão disponível" : "Conexão e versão desta aba";

  return <section aria-label="Aplicativo neste aparelho" className="hca-pwa-entries">
    <button type="button" className="hca-push-entry" onClick={event => openPanel("app", event.currentTarget)}>
      <span className="hca-push-glyph"><Icon name="phone" /></span>
      <span><strong>Aplicativo</strong><small>Instalação e preparação neste aparelho</small></span>
      <Icon name="chevron" />
    </button>
    <button type="button" className="hca-push-entry" onClick={event => openPanel("connection", event.currentTarget)}>
      <span className="hca-push-glyph"><Icon name="refresh" /></span>
      <span><strong>Conexão e atualização</strong><small>{connection}</small></span>
      <Icon name="chevron" />
    </button>
  </section>;
}
