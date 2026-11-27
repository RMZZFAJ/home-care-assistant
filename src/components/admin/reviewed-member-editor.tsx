"use client";

import Link from "next/link";
import { useCallback, useId, useState, type RefObject } from "react";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Drawer, Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { roleLabel, roleLabels } from "@/lib/role-labels";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseProfilesPage } from "@/lib/validation/catalogue-list";
import { reviewedMembershipReference, type ReviewedMembershipCommand, type ReviewedMembershipScope } from "@/lib/validation/reviewed-membership";
import type { MembershipPreparationFields } from "@/lib/validation/administrative-preparation";
import { MembershipImpact } from "./membership-impact";
import { text, type Row } from "./admin-fields";

type Intent = NonNullable<ReviewedMembershipCommand["intent"]>;
type EditorProps = {
  scope: ReviewedMembershipScope;
  focus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: (scope: ReviewedMembershipScope, intent: Intent) => void;
};

const decodeReference = (value: unknown) => reviewedMembershipReference.parse(value);
function useMemberReference(scope: ReviewedMembershipScope, selection = "") {
  return useScopedRead(scope.targetId || selection ? "/api/admin/memberships?" + new URLSearchParams({
    patientId: scope.patientId, mode: scope.mode, purpose: scope.purpose,
    ...(scope.targetId ? { targetId: scope.targetId } : { selection }),
  }) : null, "", decodeReference);
}

function AccountsSearch({ accounts, query, onQuery }: {
  accounts: ReturnType<typeof useScopedRead<ReturnType<typeof parseProfilesPage>>>;
  query: { term: string; page: number };
  onQuery: (next: { term: string; page: number }) => void;
}) {
  const [search, setSearch] = useState(query.term);
  return <div className="hca-member-panel">
    <FormField label="Buscar conta pelo nome"><TextInput type="search" maxLength={160} value={search} onChange={event => setSearch(event.currentTarget.value)} /></FormField>
    <div className="hca-toolbar">
      <ActionButton onClick={() => { onQuery({ term: search.trim(), page: 1 }); accounts.refresh(); }}>Buscar contas</ActionButton>
      {query.page > 1 ? <ActionButton disabled={accounts.loading} onClick={() => onQuery({ ...query, page: query.page - 1 })}>Contas anteriores</ActionButton> : null}
      {accounts.data && query.page * accounts.data.pageSize < accounts.data.total
        ? <ActionButton disabled={accounts.loading} onClick={() => onQuery({ ...query, page: query.page + 1 })}>Próximas contas</ActionButton> : null}
    </div>
    {accounts.error ? <FeedbackBanner tone="error">{accounts.error} <ActionButton onClick={accounts.refresh}>Consultar contas novamente</ActionButton></FeedbackBanner>
      : <p className="hca-field-hint" role="status">{accounts.loading ? "Consultando contas…" : `${accounts.data?.total ?? 0} contas encontradas · página ${query.page}`}</p>}
  </div>;
}

export function ReviewedMemberEditor({ scope, people, focus, onClose, onSubmit }: EditorProps & { people: Row[] }) {
  const formId = useId();
  const [selection, setSelection] = useState("");
  const [pickedRole, setPickedRole] = useState<MembershipPreparationFields["role"] | null>(null);
  const [review, setReview] = useState<{ intent: Intent; name: string; before: string; after: string } | null>(null);
  const [query, setQuery] = useState({ term: "", page: 1 });
  const global = scope.mode === "global";
  const edit = scope.targetId !== null;
  const globalSearch = global && !edit;
  const decodeAccounts = useCallback((value: unknown) => parseProfilesPage(value, query.page, query.term), [query.page, query.term]);
  const accounts = useScopedRead(globalSearch ? "/api/admin?" + new URLSearchParams({
    section: "profiles", profilePage: String(query.page), query: query.term,
  }) : null, "", decodeAccounts);
  const options = (globalSearch ? accounts.error ? [] : accounts.data?.data ?? [] : people).map(person => ({
    id: text(person, "user_id") || text(person, "id"), name: text(person, "full_name"),
  }));
  const read = useMemberReference(scope, selection);
  const reference = read.loading || read.error ? null : read.data;
  const personId = scope.targetId ?? selection;
  const subject = reference?.subject?.id === personId ? reference.subject : null;
  const prior = reference?.current;
  const role = pickedRole ?? prior?.role ?? "professional";
  const inviteLink = "/admin?" + new URLSearchParams({ section: "invitations", careRecipientId: scope.patientId });
  return <>
    <Drawer open title={edit ? "Editar vínculo" : "Vincular pessoa"} subtitle="Acesso apenas nesta residência"
      headingIcon="users" finalFocus={focus} onClose={onClose} dismissOnOutsideClick={false} footer={<>
        <ActionButton onClick={onClose}>Voltar</ActionButton>
        <ActionButton type="submit" form={formId} variant="primary" disabled={!subject || !reference?.eligible}><Icon name="check" />Revisar vínculo</ActionButton>
      </>}>
      <form id={formId} className="hca-member-panel" onSubmit={event => {
        event.preventDefault();
        if (!reference?.eligible || !subject) return;
        const fields = { userId: subject.id, role, canManageStock: prior?.canManageStock ?? role === "admin", canCountStock: prior?.canCountStock ?? false };
        setReview({ intent: { fields, referenceHash: reference.hash }, name: subject.name,
          before: prior ? `${roleLabel(prior.role)} · ${prior.status === "active" ? "Ativo" : "Revogado"}` : "Sem vínculo",
          after: roleLabel(role) });
      }}>
        <section className="hca-member-panel">
          <div><h3>Pessoa e função</h3><p className="hca-field-hint">O vínculo define o perfil padrão nesta residência.</p></div>
          {edit ? subject ? <DefinitionGrid items={[{ label: "Pessoa", value: subject.name }]} /> : null : <>
            {globalSearch ? <AccountsSearch accounts={accounts} query={query} onQuery={setQuery} /> : null}
            <FormField label="Conta a vincular"><SelectField name="userId" required value={selection} onChange={event => {
              setSelection(event.currentTarget.value); setPickedRole(null);
            }}><option value="">Selecione uma conta</option>
              {selection && !options.some(option => option.id === selection)
                ? <option value={selection}>{subject?.name ?? "Conta selecionada"}</option> : null}
              {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </SelectField></FormField>
            {!global ? <p className="hca-field-hint">Para incluir alguém sem vínculo nesta residência, <Link href={inviteLink} className="hca-link">crie um convite</Link>.</p> : null}
          </>}
          {read.loading ? <LoadingIndicator label="Consultando o vínculo" /> : null}
          {read.error ? <FeedbackBanner tone="error">{read.error} <ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></FeedbackBanner> : null}
          {reference && !reference.eligible ? <FeedbackBanner tone="warning">Esta conta está indisponível para a alteração.</FeedbackBanner> : null}
          <FormField label="Função na residência"><SelectField name="role" value={role} disabled={!subject || !reference?.eligible}
            onChange={event => setPickedRole(event.currentTarget.value as MembershipPreparationFields["role"])}>
            {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </SelectField></FormField>
        </section>
        <FeedbackBanner tone="info"><strong>Permissões da pessoa</strong><br />Após confirmar o vínculo, consulte os acessos e exceções individuais na matriz.</FeedbackBanner>
        <p className="hca-people-hint"><Icon name="history" />{global ? "Outro administrador local decide a proposta. Um novo vínculo pode exigir aceite por convite." : "A alteração fica no histórico desta residência."}</p>
      </form>
      {review ? <Dialog open title={global ? "Enviar proposta de vínculo?" : "Confirmar vínculo?"} subtitle={review.name} headingIcon="users"
        onClose={() => setReview(null)} footer={<>
          <ActionButton onClick={() => setReview(null)}>Voltar à edição</ActionButton>
          <ActionButton variant="primary" onClick={() => onSubmit(scope, review.intent)}>{global ? "Propor vínculo" : "Salvar vínculo"}</ActionButton>
        </>}>
        <DefinitionGrid items={[{ label: "Vínculo atual", value: review.before }, { label: "Função após a alteração", value: review.after }]} />
      </Dialog> : null}
    </Drawer>
  </>;
}

export function ReviewedMemberStatus({ scope, name, role, revoked, focus, onClose, onSubmit }: EditorProps & {
  name: string; role: string; revoked: boolean;
}) {
  const [confirmation, setConfirmation] = useState<Intent | null>(null);
  const read = useMemberReference(scope);
  const reference = read.loading || read.error ? null : read.data;
  const consistent = reference?.eligible && reference.current?.status === (revoked ? "revoked" : "active");
  const global = scope.mode === "global";
  const action = revoked ? "Reativar vínculo" : "Revogar vínculo";
  return <Drawer open title={revoked ? action : "Revisar desligamento"} subtitle={`${name} · ${role}`} headingIcon="users"
    finalFocus={focus} onClose={onClose} dismissOnOutsideClick={false} footer={<>
      <ActionButton onClick={onClose}>{revoked ? "Voltar" : "Manter vínculo"}</ActionButton>
      <ActionButton variant={revoked || global ? "primary" : "danger"} disabled={!consistent} onClick={() => {
        if (reference && consistent) setConfirmation({ fields: { status: revoked ? "active" : "revoked" }, referenceHash: reference.hash });
      }}><Icon name={revoked ? "refresh" : "users"} />{global ? "Revisar proposta" : action}</ActionButton>
    </>}>
    <div className="hca-member-panel">
      {!revoked && !global && scope.targetId ? <section aria-label="Pendências desta pessoa" className="hca-member-panel">
        <FeedbackBanner tone="warning"><strong>Pendências desta pessoa</strong><br />Confira os encaminhamentos antes de concluir o desligamento.</FeedbackBanner>
        <MembershipImpact patientId={scope.patientId} userId={scope.targetId} />
      </section> : null}
      <p className="hca-people-hint"><Icon name="info" />{revoked ? "A reativação restabelece o vínculo. A função e as permissões vigentes continuam a definir os acessos."
        : "O vínculo pode ser revogado agora. A autoria e o histórico serão preservados. As pendências continuam nos próprios processos."}</p>
      {global ? <p className="hca-field-hint">Outro administrador local precisa decidir a proposta.</p> : null}
      {read.loading ? <LoadingIndicator label="Consultando o vínculo" /> : null}
      {read.error ? <FeedbackBanner tone="error">{read.error} <ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></FeedbackBanner> : null}
      {reference && !consistent ? <FeedbackBanner tone="warning">O vínculo mudou ou ficou indisponível. Volte à lista e confira a situação atual.</FeedbackBanner> : null}
    </div>
    {confirmation ? <Dialog open title={`${action}?`} subtitle={name} headingIcon={revoked ? "refresh" : "alert"}
      onClose={() => setConfirmation(null)} footer={<>
        <ActionButton onClick={() => setConfirmation(null)}>Voltar à revisão</ActionButton>
        <ActionButton variant={revoked || global ? "primary" : "danger"} onClick={() => onSubmit(scope, confirmation)}>{global ? "Enviar proposta" : revoked ? "Confirmar alteração" : "Revogar agora"}</ActionButton>
      </>}>
      <p>{global ? "O vínculo só será alterado após a decisão local." : revoked ? "Confirme a retomada do acesso nesta residência." : "O acesso local será encerrado. Recebimentos, autoria e registros anteriores ficam no histórico."}</p>
    </Dialog> : null}
  </Drawer>;
}
