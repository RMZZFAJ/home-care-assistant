"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { parseProfilesPage } from "@/lib/validation/catalogue-list";
import { ActionButton, CheckboxField, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Dialog } from "@/components/ui/primitives";
import { PreparationDraftButtons, PreparationFeedback } from "@/components/forms/preparation-controls";
import { useScopedPreparation } from "@/components/forms/use-scoped-preparation";
import { api } from "@/lib/client/api";
import { useScopedRead } from "@/lib/use-scoped-read";
import { roleLabel } from "@/lib/role-labels";
import {
  administrativeAttempt, verifyAdministrativeReceipt, type AdministrativeAttempt, type AdministrativeInput,
  type AdministrativeOutcome, type AdministrativeReference, type AdministrativeScope, type MembershipPreparationFields,
} from "@/lib/validation/administrative-preparation";
import { Notice } from "@/components/workspace";
import { MembershipImpact } from "./membership-impact";
import { text, type Row } from "./admin-fields";

const purposeNames = { alertRule: "regra de alerta", notificationRecipient: "destinatário", membership: "vínculo", membershipStatus: "estado do vínculo" };
export function administrativePreparationUrl(scope: AdministrativeScope, extra: Record<string, string> = {}) {
  return "/api/admin/preparations?" + new URLSearchParams({
    patientId: scope.patientId, mode: scope.mode, purpose: scope.purpose,
    ...(scope.targetId ? { targetId: scope.targetId } : {}), ...extra,
  });
}
export function administrativeOutcomeText(outcome: AdministrativeOutcome) {
  if (outcome.kind === "proposal") return "Proposta global registrada. Um administrador local distinto deve aprovar em Permissões, comunicação e regras.";
  return { alertRule: "Alteração salva e auditada.", notificationRecipient: "Destinatário de notificações salvo.",
    membership: "Vínculo salvo e auditado.", membershipStatus: "Estado do vínculo atualizado." }[outcome.action];
}

function defaultFields(scope: AdministrativeScope, reference: AdministrativeReference): AdministrativeInput {
  const current = reference.current ?? {};
  switch (scope.purpose) {
    case "alertRule": return { productId: "", location: "CARE_TEAM", lowThreshold: "0", criticalThreshold: "0", isEnabled: false };
    case "notificationRecipient": return {
      recipientUserId: "", recipientGroup: "supervision", channel: "internal", destination: "", isEnabled: true, includeTeamAlerts: false,
    };
    case "membership": return {
      userId: scope.targetId ?? "", role: (current.role ?? "professional") as MembershipPreparationFields["role"],
      canManageStock: Boolean(current.canManageStock), canCountStock: Boolean(current.canCountStock),
    };
    case "membershipStatus": return { status: current.status === "revoked" ? "active" : "revoked" };
  }
}
const fieldLabels: Record<string, string> = {
  productId: "Item do catálogo", location: "Custódia", lowThreshold: "Limite baixo", criticalThreshold: "Limite crítico",
  isEnabled: "Habilitado", recipientUserId: "Conta destinatária", recipientGroup: "Grupo", channel: "Canal",
  destination: "Destino externo", includeTeamAlerts: "Família recebe alertas da equipe",
  userId: "Conta vinculada", role: "Função neste paciente", canManageStock: "Gerenciar estoque", canCountStock: "Contar estoque", status: "Estado",
};

export function AdministrativePreparationEditor({ scope, userId, products = [], people = [], opener, onClose, onConfirmed }: {
  scope: AdministrativeScope; userId: string; products?: Row[]; people?: Row[]; opener?: HTMLElement;
  onClose?: () => void;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
}) {
  const editor = useScopedPreparation<AdministrativeInput, AdministrativeReference, AdministrativeAttempt, AdministrativeOutcome>({
    scope, userId,
    readUrl: administrativePreparationUrl(scope), commandUrl: "/api/admin/preparations",
    storageKey: "hca:administrative-preparation:" + JSON.stringify([userId,scope.patientId,scope.mode,scope.purpose,scope.targetId]),
    parseAttempt: value => administrativeAttempt.parse(value), verifyReceipt: verifyAdministrativeReceipt,
    defaultFields: reference => defaultFields(scope, reference), hashFor: reference => reference.hash,
    separateReference: true,
    sendCommit: attempt => api("/api/admin", { action: scope.purpose, administrativePreparation: attempt }),
    onCommit: outcome => { onClose?.(); onConfirmed(outcome); },
  });
  const fields = editor.fields;
  const [accountSearch, setAccountSearch] = useState("");
  const [accountQuery, setAccountQuery] = useState({ query: "", page: 1 });
  const globalAccountPicker = scope.mode === "global" && scope.purpose === "membership" && !scope.targetId;
  const decodeAccounts = useCallback((value: unknown) => parseProfilesPage(value, accountQuery.page, accountQuery.query), [accountQuery.page, accountQuery.query]);
  const accounts = useScopedRead(globalAccountPicker
    ? "/api/admin?" + new URLSearchParams({ section: "profiles", profilePage: String(accountQuery.page), query: accountQuery.query }) : null, "", decodeAccounts);
  const accountOptions = globalAccountPicker ? accounts.data?.data ?? [] : people;
  const selection = fields && ("productId" in fields ? fields.productId : "recipientUserId" in fields ? fields.recipientUserId : "userId" in fields ? fields.userId : scope.targetId ?? "");
  const option = fields && ("location" in fields ? fields.location : "channel" in fields ? fields.channel : "");
  const current = useScopedRead<{ reference: AdministrativeReference }>(editor.snapshot
    ? administrativePreparationUrl(scope, { selection: selection ?? "", option: option ?? "" }) : null,
    JSON.stringify([editor.referenceAttempt, editor.snapshot ? "loaded" : "loading", editor.draft?.id, editor.draft?.revision]));
  const reference = current.data?.reference;
  const hash = editor.reviewedHash ?? reference?.hash ?? null;
  const changed = !!reference && !!hash && hash !== reference.hash;
  const disabled = editor.locked || editor.busy;
  function choose(next: AdministrativeInput) {
    editor.setFields(next);
    editor.setReviewedHash(null);
  }
  function name(id: string) {
    return text(people.find(row => (row.user_id ?? row.id) === id) ?? {}, "full_name") ||
      text(products.find(row => row.id === id) ?? {}, "name") || id || "Em branco";
  }
  function fieldValue(key: string, value: unknown) {
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (["productId","recipientUserId","userId"].includes(key)) return name(String(value));
    if (key === "role") return roleLabel(String(value));
    return String(value ?? "Em branco") || "Em branco";
  }
  function readback(values: Record<string, unknown>) {
    return <dl className="hca-form-stack wrap-anywhere">
      {Object.entries(values).map(([key,value]) => <div key={key}><dt className="font-semibold">{fieldLabels[key] ?? key}</dt><dd>{fieldValue(key,value)}</dd></div>)}
    </dl>;
  }
  const body = <>
    <PreparationFeedback editor={editor} onClose={onClose} outcomeText={administrativeOutcomeText} compareFields={readback}
      retryLabel={scope.mode === "global" ? "Recuperar mesma alteração administrativa" : "Recuperar mesma alteração"} />
    {editor.pending ? <Link href="/perfil" className="hca-control hca-control--secondary">Abrir recuperação no meu perfil</Link> : null}
    {current.error ? <Notice error>{current.error} <ActionButton type="button" onClick={current.refresh}>Consultar referência novamente</ActionButton></Notice> : null}
    {changed && reference ? <section className="hca-attention" aria-label="Comparação administrativa">
      <h3>A referência administrativa mudou</h3>
      {reference.subject ? <p>{reference.subject.name}{reference.subject.unit ? ` · ${reference.subject.unit} · ${reference.subject.decimals} casa(s)` : ""}</p> : null}
      {reference.current ? readback(reference.current) : <p>Não há configuração atual nesta seleção.</p>}
      <ActionButton type="button" disabled={disabled} onClick={() => editor.setReviewedHash(reference.hash)}>Adotar referência atual e manter meus campos</ActionButton>
    </section> : null}
    {editor.snapshot && fields && editor.draft?.state !== "consumed" ? <form className="hca-form" onSubmit={event => {
      event.preventDefault();
      if (!changed && reference?.eligible && !current.loading && !current.error) editor.start("commit", hash);
    }}>
      {editor.draft?.state === "active" ? <p role="status">Preenchimento privado recuperado.</p> : null}
      {scope.mode === "global" ? <p>A confirmação registra uma proposta para aprovação local.</p> : null}
      <fieldset className="hca-form" disabled={disabled}>
        {"productId" in fields ? <>
          <FormField label="Item do catálogo"><SelectField required name="productId" value={fields.productId}
            onChange={event => choose({ ...fields, productId: event.target.value })}>
            <option value="">Selecione</option>
            {fields.productId && !products.some(row => row.id === fields.productId) ? <option disabled value={fields.productId}>Item indisponível</option> : null}
            {products.filter(row => row.is_active !== false || row.id === fields.productId).map(row =>
              <option key={text(row,"id")} value={text(row,"id")}>{text(row,"name")}</option>)}
          </SelectField></FormField>
          <FormField label="Custódia"><SelectField name="location" value={fields.location} onChange={event => choose({ ...fields, location: event.target.value as typeof fields.location })}>
            <option value="CARE_TEAM">Equipe de cuidado</option><option value="FAMILY">Família</option>
          </SelectField></FormField>
          <FormField label="Limite baixo"><TextInput name="lowThreshold" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,6})?" maxLength={64}
            value={fields.lowThreshold} onChange={event => editor.setFields({ ...fields, lowThreshold: event.target.value })} /></FormField>
          <FormField label="Limite crítico"><TextInput name="criticalThreshold" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,6})?" maxLength={64}
            value={fields.criticalThreshold} onChange={event => editor.setFields({ ...fields, criticalThreshold: event.target.value })} /></FormField>
          <CheckboxField name="isEnabled" label="Regra habilitada" checked={fields.isEnabled} onChange={event => editor.setFields({ ...fields, isEnabled: event.target.checked })} />
        </> : "recipientUserId" in fields ? <>
          <FormField label="Conta destinatária"><SelectField required name="recipientUserId" value={fields.recipientUserId}
            onChange={event => choose({ ...fields, recipientUserId: event.target.value })}>
            <option value="">Selecione</option>
            {people.filter(row => row.status === "active").map(row => <option key={text(row,"user_id")} value={text(row,"user_id")}>{text(row,"full_name")}</option>)}
          </SelectField></FormField>
          <FormField label="Grupo"><SelectField name="recipientGroup" value={fields.recipientGroup} onChange={event => editor.setFields({ ...fields, recipientGroup: event.target.value as typeof fields.recipientGroup })}>
            <option value="supervision">Supervisão</option><option value="care_team">Equipe de cuidado</option><option value="family">Família</option><option value="other">Outro</option>
          </SelectField></FormField>
          <FormField label="Canal"><SelectField name="channel" value={fields.channel} onChange={event => choose({ ...fields, channel: event.target.value as typeof fields.channel })}>
            <option value="internal">Interno</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option>
          </SelectField></FormField>
          <FormField label="Destino externo (vazio para interno)"><TextInput name="destination" maxLength={254} value={fields.destination}
            onChange={event => editor.setFields({ ...fields, destination: event.target.value })} /></FormField>
          <CheckboxField name="isEnabled" label="Destinatário habilitado" checked={fields.isEnabled} onChange={event => editor.setFields({ ...fields, isEnabled: event.target.checked })} />
          <CheckboxField name="includeTeamAlerts" label="Família: receber também alertas da equipe" checked={fields.includeTeamAlerts}
            onChange={event => editor.setFields({ ...fields, includeTeamAlerts: event.target.checked })} />
        </> : "userId" in fields ? <>
          {scope.targetId ? <div><p className="font-semibold">Conta vinculada</p><p>{reference?.subject?.name ?? name(scope.targetId)}</p>
            <p className="hca-field-hint">A edição mantém esta pessoa. Para outra conta, use o fluxo de vínculo ou convite.</p></div>
            : <>
            {globalAccountPicker ? <div className="hca-form-stack">
              <FormField label="Buscar conta pelo nome"><TextInput type="search" maxLength={160} value={accountSearch} onChange={event => setAccountSearch(event.target.value)} /></FormField>
              <div className="hca-toolbar">
                <ActionButton type="button" onClick={() => {
                  setAccountQuery({ query: accountSearch.trim(), page: 1 });
                  accounts.refresh();
                }}>Buscar contas</ActionButton>
                <ActionButton type="button" disabled={accounts.loading || accountQuery.page === 1} onClick={() => setAccountQuery(value => ({ ...value, page: value.page - 1 }))}>Contas anteriores</ActionButton>
                <ActionButton type="button" disabled={accounts.loading || !accounts.data || accountQuery.page * accounts.data.pageSize >= accounts.data.total}
                  onClick={() => setAccountQuery(value => ({ ...value, page: value.page + 1 }))}>Próximas contas</ActionButton>
              </div>
              {accounts.error ? <Notice error>{accounts.error} <ActionButton type="button" onClick={accounts.refresh}>Consultar contas novamente</ActionButton></Notice>
                : <p role="status">{accounts.loading ? "Consultando contas…" : `${accounts.data?.total ?? 0} contas encontradas · página ${accountQuery.page}`}</p>}
            </div> : null}
            <FormField label="Conta vinculada"><SelectField name="userId" required value={fields.userId} onChange={event => choose({ ...fields, userId: event.target.value })}>
              <option value="">Selecione uma conta</option>
              {fields.userId && !accountOptions.some(row => (row.user_id ?? row.id) === fields.userId)
                ? <option value={fields.userId}>{reference?.subject?.name ?? name(fields.userId)}</option> : null}
              {accountOptions.map(row => <option key={text(row,"user_id") || text(row,"id")} value={text(row,"user_id") || text(row,"id")}>{text(row,"full_name")}</option>)}
            </SelectField></FormField></>}
          <FormField label="Função neste paciente"><SelectField name="role" value={fields.role} onChange={event => {
            const role=event.target.value as typeof fields.role;
            editor.setFields({ ...fields, role, canManageStock: scope.targetId ? fields.canManageStock : role==="admin" });
          }}>
            {(["professional","family","supervisor","reader","admin"] as const).map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}
          </SelectField></FormField>
          <p className="hca-field-hint">Permissões específicas ficam na matriz. Uma conta nova deve ser convidada pelo e-mail e aceitar o convite.</p>
        </> : <>
          <p>Confirmar a alteração do vínculo de <strong>{reference?.subject?.name ?? name(scope.targetId ?? "")}</strong> neste paciente?</p>
          <p className="hca-field-hint">A mudança será auditada e as permissões serão reavaliadas nas próximas operações.</p>
          <p>Ação preparada · {fields.status === "revoked" ? "Revogar vínculo" : "Reativar vínculo"}</p>
        </>}
      </fieldset>
      <div className="hca-toolbar">
        {scope.purpose==="membershipStatus" && onClose ? <ActionButton type="button" disabled={disabled} onClick={onClose}>Voltar</ActionButton> : null}
        <ActionButton type="submit" variant="primary" disabled={disabled || changed || current.loading || !!current.error || !reference?.eligible}>
          {scope.purpose==="alertRule" ? "Salvar regra" : scope.purpose==="notificationRecipient" ? "Salvar destinatário" : scope.purpose==="membership" ? "Salvar vínculo"
            : "status" in fields && fields.status==="revoked" ? "Revogar agora" : "Confirmar alteração"}
        </ActionButton>
        <PreparationDraftButtons editor={editor} hash={hash} />
      </div>
      {scope.purpose==="membershipStatus" && "status" in fields && fields.status==="revoked" && scope.targetId
        ? <MembershipImpact patientId={scope.patientId} userId={scope.targetId} /> : null}
    </form> : null}
  </>;
  if (scope.purpose==="membership") return <RecordDrawer title={scope.targetId ? "Editar vínculo" : "Vincular conta existente"}
    onClose={() => onClose?.()} restoreFocusTo={opener} busy={editor.busy} preventClose={!!editor.pending} hasUnsavedChanges={editor.dirty}>{body}</RecordDrawer>;
  if (scope.purpose==="membershipStatus") return <Dialog open title={fields && "status" in fields && fields.status==="active" ? "Reativar vínculo" : "Revogar vínculo"}
    closeDisabled={editor.busy || !!editor.pending} onClose={() => onClose?.()}>{body}</Dialog>;
  return <section aria-label={"Preenchimento de " + purposeNames[scope.purpose]}>{body}</section>;
}
