"use client";

import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/client/api";
import { roleLabel } from "@/lib/role-labels";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import {
  administrativeInvitationIntent, administrativeInvitationList, administrativeInvitationResult,
  type AdministrativeInvitation, type AdministrativeInvitationIntent, type AdministrativeInvitationResult,
} from "@/lib/validation/administrative-invitation";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, Pill, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { Field, RoleSelect } from "./admin-fields";

const pendingSchema = z.strictObject({ key: z.uuid(), retries: z.number().int().min(0).max(operationRecoveryLimit) });
type Pending = z.infer<typeof pendingSchema>;
type Failure = { reason: unknown; uncertain: boolean; key: string };
type LinkReceipt = { id: string; expiresAt: string; url: string };
type DetailAction = "reissue" | "revoke";

function storedReference(storage: string) {
  try { return pendingSchema.parse(JSON.parse(sessionStorage.getItem(storage) ?? "null")); }
  catch { return null; }
}

function keepReference(storage: string, pending: Pending | null) {
  try {
    if (pending) sessionStorage.setItem(storage, JSON.stringify(pending));
    else sessionStorage.removeItem(storage);
  } catch { /* The mounted screen can still reconcile its attempt. */ }
}

function status(invitation: AdministrativeInvitation) {
  if (invitation.status === "pending" && Date.parse(invitation.expires_at) <= Date.now()) return "Expirado";
  return { pending: "Aguardando aceite", accepted: "Aceito", declined: "Recusado", revoked: "Revogado" }[invitation.status];
}

function InvitationLink({ url, label }: { url: string; label: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Link copiado."); }
    catch { setMessage("Selecione o campo Link para copiar manualmente."); }
  }
  return <div className="hca-invitation-content">
    <FormField label="Link"><TextInput readOnly value={url} onFocus={event => event.currentTarget.select()} /></FormField>
    <ActionButton onClick={() => void copy()}><Icon name="copy" />{label}</ActionButton>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}

export function InvitationManagement({ patientId, userId }: { patientId: string; userId: string }) {
  const storage = `hca:invitation-admin:${userId}:${patientId}`;
  const [list, setList] = useState<AdministrativeInvitation[] | null>(null);
  const [readError, setReadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<{ invitation: AdministrativeInvitation; action: DetailAction } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdministrativeInvitationResult | null>(null);
  const [link, setLink] = useState<LinkReceipt | null>(null);
  const [fieldError, setFieldError] = useState("");
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const runningRef = useRef(false);
  const restoredRef = useRef(false);
  const formId = useId();
  const live = useLiveRevision();
  const chosen = list?.find(row => row.id === selectedId);
  const linkAvailable = link && chosen && link.id === chosen.id && link.expiresAt === chosen.expires_at && status(chosen) === "Aguardando aceite" ? link.url : null;
  useOperationActivity(busy, { title: "Confirmando a operação do convite" });

  useEffect(() => {
    const controller = new AbortController();
    void api<unknown>(`/api/admin/invitations?careRecipientId=${patientId}`, undefined, controller.signal).then(raw => {
      if (controller.signal.aborted) return;
      const { data } = administrativeInvitationList.parse(raw);
      if (data.some(row => row.care_recipient_id !== patientId)) throw new Error("A consulta mudou de residência.");
      setList(data); setReadError("");
      if (!restoredRef.current) { restoredRef.current = true; setPending(storedReference(storage)); }
    }).catch(reason => {
      if (controller.signal.aborted) return;
      setList(null); setLink(null); setResult(null); setCreating(false); setSelectedId(null); setReview(null);
      setReadError(reason instanceof Error ? reason.message : "Não foi possível consultar os convites.");
    });
    return () => controller.abort();
  }, [live, patientId, revision, storage]);

  function refresh() { setRevision(value => value + 1); }

  async function submit(intent: AdministrativeInvitationIntent | null) {
    if (runningRef.current) return;
    const saved = storedReference(storage) ?? pending;
    if (intent ? saved : !saved || saved.retries >= operationRecoveryLimit) return;
    const attempt = saved ? { ...saved, retries: saved.retries + 1 } : { key: crypto.randomUUID(), retries: 0 };
    keepReference(storage, attempt);
    runningRef.current = true;
    setPending(attempt); setBusy(true); setFailure(null);
    setCreating(false); setReview(null); setSelectedId(null);
    try {
      const outcome = administrativeInvitationResult.parse(await api<unknown>("/api/admin/invitations", { careRecipientId: patientId, key: attempt.key, intent }));
      if (outcome.state === "recorded" && outcome.invitation.care_recipient_id !== patientId) throw new Error("A confirmação pertence a outra residência.");
      keepReference(storage, null);
      setPending(null); setResult(outcome);
      if (outcome.state === "recorded") {
        const { invitation, invitationUrl } = outcome;
        setLink(current => invitationUrl ? { id: invitation.id, expiresAt: invitation.expires_at, url: invitationUrl }
          : current?.id === invitation.id ? null : current);
        window.dispatchEvent(new Event("hca:data-changed"));
      } else {
        refresh();
      }
    } catch (reason) {
      const uncertain = intent === null || !(reason instanceof ApiError) || reason.status === 0 || reason.status === 408 || reason.status >= 500;
      if (!uncertain) { keepReference(storage, null); setPending(null); refresh(); }
      setFailure({ reason, uncertain, key: attempt.key });
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }

  const locked = busy || Boolean(pending);
  const title = result?.state === "closed" ? "Tentativa encerrada" : result?.action === "revoke" ? "Convite revogado" :
    result?.action === "reissue" ? result.invitationUrl ? "Novo link disponível" : "Reemissão registrada" : "Convite criado";
  const explanation = result?.state === "closed" ? "A consulta confirmou que esta tentativa não alterou os convites." :
    result?.invitationUrl ? "Encaminhe o link à pessoa convidada. O vínculo será criado após o aceite." :
      result?.action === "revoke" ? "A revogação foi registrada." : "A operação foi registrada. Consulte a situação atual do convite.";
  return <div>
    {pending ? <FeedbackBanner tone="warning">Há uma operação de convite aguardando confirmação. <ActionButton disabled={busy} onClick={() => setFailure({ reason: null, uncertain: true, key: pending.key })}>Conferir resultado</ActionButton></FeedbackBanner> : null}
    <section className="hca-people-card" aria-labelledby="residence-invitations">
      <header><h2 id="residence-invitations">Convites da residência</h2>
        <ActionButton disabled={!list || locked} onClick={event => { openerRef.current = event.currentTarget; setFieldError(""); setCreating(true); }}><Icon name="plus" />Novo convite</ActionButton>
      </header>
      <div className="hca-people-body">
        {readError ? <FeedbackBanner tone="error">{readError} <ActionButton onClick={refresh}>Atualizar convites</ActionButton></FeedbackBanner> : null}
        {!list && !readError ? <LoadingIndicator label="Consultando convites" /> : null}
        {list?.length === 0 ? <p className="text-sm text-(--muted)">Nenhum convite nesta residência.</p> : null}
        {list?.length ? <ul aria-label="Convites da residência">{list.map(row => <li key={row.id}>
          <button type="button" className="hca-guide-row" disabled={locked} onClick={event => { openerRef.current = event.currentTarget; setSelectedId(row.id); }}>
            <span className="hca-avatar" aria-hidden="true"><Icon name="send" /></span>
            <span className="hca-guide-row-label"><strong>{row.email}</strong><small>{roleLabel(row.role)}</small>
              <Pill tone={row.status === "accepted" ? "success" : status(row) === "Aguardando aceite" ? "warning" : "neutral"}>{status(row)}</Pill>
            </span><Icon name="chevron" width={15} height={15} />
          </button>
        </li>)}</ul> : null}
      </div>
    </section>
    <p className="hca-people-hint"><Icon name="shield" />O acesso só passa a valer após o aceite. Criar o convite disponibiliza um link para você encaminhar.</p>

    {creating && !pending ? <Dialog open title="Novo convite" kicker="Organização da residência" headingIcon="users" finalFocus={openerRef}
      onClose={() => setCreating(false)} footer={<><ActionButton onClick={() => setCreating(false)}>Voltar</ActionButton><ActionButton variant="primary" type="submit" form={formId}><Icon name="plus" />Criar convite</ActionButton></>}>
      <form id={formId} className="hca-invitation-form" onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const draft = administrativeInvitationIntent.safeParse({ action: "create", email: String(fields.get("email") ?? "").trim(), role: fields.get("role") });
        if (!draft.success) { setFieldError("Confira o e-mail e a função do destinatário."); return; }
        void submit(draft.data);
      }}>
        <Field label="E-mail do destinatário" name="email" type="email" required />
        <RoleSelect value="family" />
        {fieldError ? <FeedbackBanner tone="error">{fieldError}</FeedbackBanner> : null}
        <p className="hca-people-hint"><Icon name="link" />O sistema gera um link para encaminhamento manual.</p>
      </form>
    </Dialog> : null}

    {chosen && !review ? <Drawer open title="Convite da residência" subtitle={chosen.email} headingIcon="users" finalFocus={openerRef} onClose={() => setSelectedId(null)}
      footer={<>
        <ActionButton onClick={() => setSelectedId(null)}>Voltar</ActionButton>
        {chosen.status !== "accepted" ? <ActionButton disabled={locked} onClick={() => setReview({ invitation: chosen, action: "reissue" })}>Reemitir link</ActionButton> : null}
        {chosen.status === "pending" ? <ActionButton disabled={locked} variant="danger" onClick={() => setReview({ invitation: chosen, action: "revoke" })}>Revogar</ActionButton> : null}
      </>}>
      <div className="hca-invitation-content">
        <DefinitionGrid items={[{ label: "E-mail", value: chosen.email }, { label: "Função", value: roleLabel(chosen.role) }, { label: "Situação", value: status(chosen) }, { label: "Validade", value: formatBrazilDate(chosen.expires_at) }]} />
        <p className="hca-people-hint"><Icon name="info" />O aceite da pessoa confirma o vínculo com a residência.</p>
        {linkAvailable ? <InvitationLink url={linkAvailable} label="Copiar link" /> : chosen.status === "pending" ? <p className="hca-people-hint"><Icon name="link" />Para obter outro link, reemita este convite.</p> : null}
      </div>
    </Drawer> : null}

    {review ? <Dialog open title={review.action === "reissue" ? "Reemitir convite?" : "Revogar convite?"} headingIcon={review.action === "reissue" ? "refresh" : "alert"}
      onClose={() => setReview(null)} finalFocus={openerRef} footer={<>
        <ActionButton onClick={() => setReview(null)}>Voltar</ActionButton>
        <ActionButton variant={review.action === "reissue" ? "primary" : "danger"} disabled={locked} onClick={() => void submit({ action: review.action, id: review.invitation.id, expiresAt: review.invitation.expires_at, status: review.invitation.status })}>{review.action === "reissue" ? "Reemitir convite" : "Revogar convite"}</ActionButton>
      </>}>
      <p>{review.action === "reissue" ? "O link anterior deixará de funcionar. Encaminhe o novo link ao destinatário autorizado." : "O link deixará de permitir o aceite. A revogação encerra o convite pendente."}</p>
    </Dialog> : null}

    {result ? <Dialog open title={title} success={result.state === "recorded"} headingIcon="info" subtitle={explanation} onClose={() => setResult(null)}
      finalFocus={openerRef} popupClassName="hca-invitation-result" footer={<ActionButton variant="primary" onClick={() => setResult(null)}>Concluir</ActionButton>}>
      {result.state === "recorded" ? <div className="hca-invitation-content">
        <DefinitionGrid items={[{ label: "Destinatário", value: result.invitation.email }, { label: "Função", value: roleLabel(result.invitation.role) }, { label: "Situação atual", value: status(result.invitation) }]} />
        {result.invitationUrl ? <InvitationLink url={result.invitationUrl} label={result.action === "create" ? "Copiar link do convite" : "Copiar novo link"} /> :
          result.action !== "revoke" && result.invitation.status === "pending" ? <p>Para encaminhar um link, reemita o convite em seus detalhes.</p> : null}
      </div> : null}
    </Dialog> : null}

    {failure ? <DocumentOperationFailureDialog title={failure.uncertain ? "Não foi possível confirmar o convite" : "Não foi possível alterar o convite"}
      outcome={failure.uncertain ? "uncertain" : "rejected"} cause={failure.reason}
      description={failure.uncertain ? "Consulte a mesma tentativa para saber o que foi registrado." : failure.reason instanceof Error ? failure.reason.message : "Confira a situação atual do convite."}
      operation="Administrar convite" fallbackCode="CONVITE_ADMIN_NAO_CONFIRMADO" attempts={pending?.retries ?? 0} attemptReference={failure.key}
      guidance="A referência identifica a tentativa que você confirmou."
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      action={failure.uncertain && pending && pending.retries < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void submit(null) } : undefined}
      closeLabel="Voltar" onClose={() => setFailure(null)} finalFocus={openerRef} /> : null}
  </div>;
}
