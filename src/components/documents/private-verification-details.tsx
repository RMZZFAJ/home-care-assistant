"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { WorkspaceSync } from "@/components/workspace-sync";
import { api } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";


const response = z.object({ data: z.object({
  verificationCode: z.string(), issuanceId: z.uuid(), documentId: z.uuid(),
  code: z.string().nullable(), kind: z.string(), patientName: z.string().nullable(),
  recordedBy: z.string().nullable(), generatedBy: z.string(), generatedAt: z.string(),
  documentVersion: z.number(), technicalKey: z.string().nullable(), certificateFingerprint: z.string().nullable(),
}) });

export function PrivateVerificationDetails({ code, loginHref }: { code: string; loginHref: string }) {
  const [actorId, setActorId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"access" | "details" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const openerRef = useRef<HTMLButtonElement>(null);
  const interactionRef = useRef(0);
  const revision = useLiveRevision();

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active) setActorId(data.user?.id ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setActorId(session?.user.id ?? null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const decode = useCallback((raw: unknown) => {
    const parsed = response.parse(raw);
    if (parsed.data.verificationCode !== code)
      throw new Error("A emissão não corresponde à consulta.");
    return parsed.data;
  }, [code]);
  const read = useScopedRead(actorId ? "/api/verification/details?code=" + encodeURIComponent(code) : null, actorId + ":" + revision, decode);
  const refresh = read.refresh;
  useEffect(() => {
    if (!actorId) return;
    const revalidate = () => { if (!document.hidden) refresh(); };
    window.addEventListener("hca:profile-updated", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      window.removeEventListener("hca:profile-updated", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [actorId, refresh]);

  const details = actorId && !read.loading && !read.error ? read.data : null;
  const hasKnownDetails = Boolean(actorId && read.data && !read.error);
  const denied = Boolean(actorId && read.error);
  const close = () => {
    interactionRef.current++;
    setPanel(null);
  };

  async function select() {
    const interaction = ++interactionRef.current;
    setBusy(true);
    setError("");
    try {
      decode(await api("/api/verification/details", { code }));
      refresh();
      window.dispatchEvent(new Event("hca:context-changed"));
      if (interaction === interactionRef.current) setPanel("details");
    } catch {
      if (interaction === interactionRef.current)
        setError("Não foi possível confirmar seu acesso aos detalhes desta emissão.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Detalhes autorizados da emissão">
    {actorId ? <WorkspaceSync key={actorId} userId={actorId} /> : null}
    <button type="button" ref={openerRef} className="hca-verify-private-link"
      onClick={() => { setError(""); setPanel(hasKnownDetails ? "details" : "access"); }}>
      <span><Icon name={hasKnownDetails ? "file" : "lock"} width={20} height={20} /></span>
      <span><strong>{hasKnownDetails ? "Ficha e responsáveis" : "Detalhes da ficha"}</strong>
        <small>{hasKnownDetails ? "Consultar informações autorizadas" : denied ? "Os detalhes exigem acesso à ficha" : "Entre com uma conta autorizada"}</small>
      </span>
      <Icon name="chevron" width={17} height={17} />
    </button>
    <Dialog open={panel === "access"} onClose={close} title={denied || error ? "Acesso indisponível" : "Consultar detalhes da ficha"}
      subtitle="Sua consulta pública permanece disponível." headingIcon="lock" finalFocus={openerRef}
      footer={<>
        <ActionButton onClick={close}>Voltar à consulta</ActionButton>
        {!actorId ? <Link className="ui-button ui-button-primary" href={loginHref}>Entrar e continuar esta verificação</Link>
          : details ? <ActionButton variant="primary" onClick={() => setPanel("details")}>Consultar detalhes</ActionButton>
            : <ActionButton variant="primary" disabled={busy || read.loading} onClick={() => void select()}>
              {busy ? "Conferindo contexto…" : "Usar o contexto autorizado desta emissão"}
            </ActionButton>}
      </>}>
      <div className="hca-form-stack">
        <p>{denied || error ? "Não foi possível confirmar que a sua conta tem permissão para ler esta ficha."
          : "O sistema verifica o vínculo e a permissão da sua conta antes de mostrar paciente, responsáveis e ficha de origem."}</p>
        {read.loading ? <p role="status">Conferindo leitura autorizada…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </Dialog>
    <Drawer open={panel === "details"} onClose={close} title="Ficha e responsáveis" headingIcon="file"
      subtitle="Detalhes disponíveis para sua conta" finalFocus={openerRef} keyboardScrollable
      footer={<><ActionButton onClick={close}>Voltar à consulta</ActionButton>
        {details ? <Link className="ui-button ui-button-primary" href={"/documentos/" + details.documentId}>Consultar ficha autorizada</Link> : null}
      </>}>
      {details ? <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Ficha", value: details.code ?? details.kind },
          { label: "Paciente", value: details.patientName ?? "Nome não preservado" },
          { label: "Quem registrou a ficha", value: details.recordedBy ?? "Autoria não preservada" },
          { label: "Quem gerou este exemplar", value: details.generatedBy },
          { label: "Geração do exemplar", value: formatBrazilDate(details.generatedAt) },
          { label: "Revisão da ficha", value: details.documentVersion },
          { label: "Chave da assinatura técnica", value: details.technicalKey ?? "Não disponível" },
        ]} />
        <details><summary>Sobre a assinatura técnica</summary>
          <p>A chave identifica a emissão pelo sistema. A autoria da ficha e a geração do exemplar têm registros próprios.</p>
        </details>
      </div> : read.loading ? <p role="status">Conferindo leitura autorizada…</p>
        : <div className="hca-form-stack"><strong>Acesso indisponível</strong><p>A consulta pública continua disponível. Verifique o vínculo da sua conta para acessar a ficha.</p></div>}
    </Drawer>
  </section>;
}
