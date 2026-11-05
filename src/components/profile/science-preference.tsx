"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, buttonClass, inputClass, Notice, primaryClass } from "@/components/workspace";
import { SettingsSection } from "@/components/forms/settings-section";
import { Dialog } from "@/components/ui/primitives";
import { formatBrazilDate } from "@/lib/receipt";
import { scienceConsent, scienceConsentCopyVersion, scienceModeLabels, type ScienceMode, type SciencePreference } from "@/lib/requisition-science";
import { useLiveRevision } from "@/lib/use-live-revision";

type Intent = { mode: ScienceMode; consent: boolean; expectedVersion: number; idempotencyKey: string };
export function SciencePreferenceSettings() {
  const revision = useLiveRevision();
  const [preference, setPreference] = useState<SciencePreference | null>(null);
  const [mode, setMode] = useState<ScienceMode>("manual");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [stale, setStale] = useState(false);
  const editingRef = useRef(false);
  const baselineVersionRef = useRef<number | null>(null);
  const frozenRef = useRef<Intent | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: SciencePreference }>("/api/profile/science", undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (editingRef.current) { if (baselineVersionRef.current !== null && result.data.version !== baselineVersionRef.current) setStale(true); return; }
      baselineVersionRef.current = result.data.version;
      setPreference(result.data); setMode(result.data.mode); setConsent(false); setError("");
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [attempt, revision]);
  function prepare(event: FormEvent) {
    event.preventDefault();
    if (!preference || busy || uncertain || stale || mode !== "manual" && !consent) return;
    editingRef.current = true; setError(""); setMessage(""); setReview(true);
  }
  async function persist() {
    if (!preference || busy || stale && !frozenRef.current) return;
    const intent = frozenRef.current ?? { mode, consent: mode === "manual" ? false : consent, expectedVersion: preference.version, idempotencyKey: crypto.randomUUID() };
    frozenRef.current = intent; editingRef.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ data: SciencePreference & { savedVersion: number; recovered: boolean } }>("/api/profile/science", intent);
      baselineVersionRef.current = result.data.version;
      setPreference(result.data); setMode(result.data.mode); setConsent(false); setStale(false); setUncertain(false); setReview(false); editingRef.current = false; frozenRef.current = null;
      setMessage(result.data.savedVersion === result.data.version ? "Preferência salva. A ciência tácita vale somente para emissões posteriores elegíveis; registros anteriores foram preservados." : "Esta tentativa já havia sido salva. Há uma preferência mais recente, apresentada abaixo; ela foi preservada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a preferência.");
      const rejected = cause instanceof ApiError && cause.status >= 400 && cause.status < 500;
      setUncertain(!rejected);
      if (rejected) { frozenRef.current = null; if (cause.status === 409) setStale(true); }
    } finally { setBusy(false); }
  }
  function reload() {
    if (busy || uncertain) return;
    editingRef.current = false; frozenRef.current = null; baselineVersionRef.current = null; setPreference(null); setStale(false); setError(""); setReview(false); setAttempt(value => value + 1);
  }
  const copy = mode === "manual" ? "Você confirma sua ciência pessoal no documento, quando estiver habilitado no paciente." : scienceConsent[mode];
  return <SettingsSection title="Ciência das requisições" summary={preference ? scienceModeLabels[preference.mode] : "Preferência pessoal e prospectiva"}>
    {message ? <Notice>{message}</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {!preference ? <div className="space-y-3"><Notice>Consultando sua preferência…</Notice>{error ? <button type="button" className={buttonClass} onClick={reload}>Tentar novamente</button> : null}</div> : <form className="space-y-4" onSubmit={prepare}>
      <p className="text-sm">Uma pessoa habilitada pode satisfazer a obrigação familiar, mantendo sua autoria individual. Preferências não concedem permissão. A confirmação manual permanece disponível; expedição familiar autorizada sempre registra ciência do expedidor.</p>
      <p className="text-xs text-(--muted)">Preferência atual: {scienceModeLabels[preference.mode]} · versão {preference.version}{preference.effectiveAt ? " · vigente desde " + formatBrazilDate(preference.effectiveAt) : " · padrão sem adesão automática"}.</p>
      {stale ? <Notice error>Esta preferência mudou em outra sessão. Sua edição foi conservada. Recarregue o estado antes de fazer outra alteração.</Notice> : null}
      <fieldset disabled={busy || uncertain} className="space-y-3"><legend className="font-semibold">Como registrar minha ciência</legend>
        <label className="block text-sm font-semibold">Modalidade pessoal<select className={inputClass} value={mode} onChange={event => { editingRef.current = true; setMode(event.target.value as ScienceMode); setConsent(false); setMessage(""); }}>{Object.entries(scienceModeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <p className="text-sm">{copy}</p>
        {mode !== "manual" ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={consent} onChange={event => { editingRef.current = true; setConsent(event.target.checked); }} />Confirmo expressamente esta preferência pessoal.</label> : null}
        <p className="text-xs text-(--muted)">Mudanças não reescrevem ciências anteriores. A ciência tácita depende de adesão anterior à emissão oficial e da regra aplicável à REQ. Recebimento, contagem e consumo conservam confirmação própria.</p>
      </fieldset>
      {uncertain ? <div className="space-y-2"><Notice>Resposta não confirmada. Recupere esta mesma tentativa antes de editar.</Notice><button type="button" className={primaryClass} disabled={busy} onClick={() => void persist()}>Recuperar esta preferência</button></div> : <button className={primaryClass} disabled={busy || stale || preference.consentCopyVersion !== scienceConsentCopyVersion}>Revisar preferência</button>}
      {stale && !uncertain ? <button type="button" className={buttonClass} disabled={busy} onClick={reload}>Recarregar preferência e descartar esta edição</button> : null}
    </form>}
    <Dialog open={review} title="Revisar preferência de ciência" onClose={() => { if (!busy) setReview(false); }}><div className="space-y-4"><p className="font-semibold">{scienceModeLabels[mode]}</p><p>{copy}</p><p className="text-sm">A alteração será pessoal e prospectiva. As ciências anteriores permanecem no histórico.</p>{error ? <Notice error>{error}</Notice> : null}<div className="ui-form-actions"><button type="button" className={buttonClass} disabled={busy} onClick={() => setReview(false)}>Voltar</button><button type="button" className={primaryClass} disabled={busy || stale && !uncertain} onClick={() => void persist()}>{busy ? "Salvando…" : uncertain ? "Recuperar esta preferência" : "Confirmar preferência"}</button></div></div></Dialog>
  </SettingsSection>;
}
