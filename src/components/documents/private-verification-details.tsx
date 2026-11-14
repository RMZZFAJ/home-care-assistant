"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { api } from "@/lib/client/api";
import { formatBrazilDate } from "@/lib/receipt";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLiveRevision } from "@/lib/use-live-revision";
const response = z.object({ data: z.object({ verificationCode: z.string(), issuanceId: z.uuid(), documentId: z.uuid(), code: z.string().nullable(), kind: z.string(), patientName: z.string().nullable(), recordedBy: z.string().nullable(), generatedBy: z.string(), generatedAt: z.string(), documentVersion: z.number(), technicalKey: z.string().nullable(), certificateFingerprint: z.string().nullable() }) });
export function PrivateVerificationDetails({ code }: { code: string ;}) {
  const [actorId, setActorId] = useState<string | null>(null), revision = useLiveRevision();
  useEffect(() => { const client = createSupabaseBrowserClient(); if (!client) return; let active = true; void client.auth.getUser().then(({ data }) => { if (active) setActorId(data.user?.id ?? null); }); const { data } = client.auth.onAuthStateChange((_event, session) => { if (active) setActorId(session?.user.id ?? null); }); return () => { active = false; data.subscription.unsubscribe(); }; }, []);
  const decode = useCallback((raw: unknown) => { const parsed = response.parse(raw); if (parsed.data.verificationCode !== code) throw new Error("A emissão não corresponde à consulta."); return parsed.data; }, [code]);
  const read = useScopedRead(actorId ? "/api/verification/details?code=" + encodeURIComponent(code) : null, actorId + ":" + revision, decode);
  const refresh = read.refresh;
  useEffect(() => {
    if (!actorId) return;
    const revalidate = () => { if (!document.hidden) refresh(); };
    window.addEventListener("hca:profile-updated", revalidate);
    window.addEventListener("focus", revalidate);
    return () => { window.removeEventListener("hca:profile-updated", revalidate); window.removeEventListener("focus", revalidate); };
  }, [actorId, refresh]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const details = actorId && !read.loading && !read.error ? read.data : null;
  async function select() { setBusy(true); setError(""); try { decode(await api("/api/verification/details", { code })); read.refresh(); window.dispatchEvent(new Event("hca:context-changed")); } catch { setError("Não foi possível confirmar leitura autorizada desta emissão. O resultado público continua disponível."); } finally { setBusy(false); } }
  return <section className="doc-card hca-form-stack hca-private-verification" aria-label="Detalhes autorizados da emissão"><h2>Mais detalhes com acesso autorizado</h2>{details ? <><DefinitionGrid items={[{ label: "Ficha", value: details.code ?? details.kind }, { label: "Paciente", value: details.patientName ?? "Nome não preservado" }, { label: "Quem registrou a ficha", value: details.recordedBy ?? "Autoria não preservada" }, { label: "Quem gerou este exemplar", value: details.generatedBy }, { label: "Geração do exemplar", value: formatBrazilDate(details.generatedAt) }, { label: "Revisão da ficha", value: details.documentVersion }, { label: "Chave da assinatura técnica", value: details.technicalKey ?? "Não disponível" }]} /><p>A autoria da ficha, a geração deste exemplar e a assinatura técnica são registros distintos. Gerar o PDF não é uma assinatura pessoal.</p><Link className="ui-button" href={"/documentos/" + details.documentId}>Consultar ficha autorizada</Link></> : <><p>Entre e confirme o contexto autorizado para consultar autoria e geração do exemplar. Sua conta precisa ter vínculo e permissão de leitura; o resultado público permanece nesta página.</p>{read.loading ? <p role="status">Conferindo leitura autorizada…</p> : null}<div className="hca-toolbar"><Link className="ui-button ui-button-primary" href={"/login?next=" + encodeURIComponent("/verificar?code=" + code)}>Entrar e continuar esta verificação</Link>{actorId ? <ActionButton disabled={busy} onClick={() => void select()}>{busy ? "Conferindo contexto…" : "Usar o contexto autorizado desta emissão"}</ActionButton> : null}</div>{error ? <Notice error>{error}</Notice> : null}</>}</section>;
}
