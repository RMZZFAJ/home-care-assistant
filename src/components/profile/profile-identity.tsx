"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { ActionButton, DefinitionGrid, FormField, TextInput } from "@/components/ui/controls";
import { ContactSettings } from "@/components/auth/contact-settings";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { DocumentOperationFailureDialog, operationRecoveryLimit, type DocumentOperationFailure } from "@/components/documents/document-operation-failure-dialog";
import { usePwa } from "@/components/pwa/pwa-provider";
import { contactReviewParam } from "@/lib/auth/contact";
import { api, ApiError } from "@/lib/client/api";
import { parseProfileRead, type ProfileRead } from "@/lib/validation/profile";
import { AvatarSettings } from "./avatar-settings";
import { PresentationPreference } from "./presentation-preference";
import "./profile-identity.css";

const states = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
type Fields = { name: string; category: string; registration: string; state: string };
type Outcome = "saved" | "confirmed" | DocumentOperationFailure;

function fieldsFrom(profile: ProfileRead["data"]): Fields {
  return { name: profile.full_name, category: profile.professional_category ?? "", registration: profile.professional_registration ?? "", state: profile.professional_state ?? "" };
}

export function ProfileIdentity({ active, profile, onChange }: { active: boolean; profile: ProfileRead["data"]; onChange: () => void }) {
  const { blocked: runtimeBlocked } = usePwa();
  const { value, error: accessError, selecting } = useWorkspaceState();
  const blocked = runtimeBlocked || Boolean(accessError) || !value || selecting;
  const openContacts = useSearchParams().get(contactReviewParam) === "1";
  const formId = useId(), stateId = useId();
  const editRef = useRef<HTMLButtonElement>(null), nameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Fields | null>(null), [error, setError] = useState("");
  const [activity, setActivity] = useState<"Salvando identificação" | "Conferindo dados da conta" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retries, setRetries] = useState(0);
  const busy = activity !== null;
  useOperationActivity(active && !blocked && busy, { title: activity ?? "", detail: "Aguarde a confirmação dos dados da sua conta." });
  const current = fieldsFrom(profile);

  function closeEdit() {
    if (busy) return;
    setDraft(null);
    setOutcome(null);
    setError("");
  }

  function finish(result: "saved" | "confirmed") {
    setDraft(null);
    setOutcome(result);
    onChange();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy || blocked) return;
    const name = draft.name.trim();
    if (name.length < 2 || name.length > 160) {
      setError("Informe seu nome entre 2 e 160 caracteres.");
      nameRef.current?.focus();
      return;
    }
    const values = { name, category: draft.category.trim(), registration: draft.registration.trim(), state: draft.state };
    setDraft(values);
    setActivity("Salvando identificação");
    setError("");
    setRetries(0);
    try {
      const response = await api<{ saved?: boolean }>("/api/profile", { action: "update", ...values, state: values.state || null });
      if (response?.saved !== true) throw new Error("Resposta de salvamento incompleta.");
      finish("saved");
    } catch (cause) {
      const rejected = cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.status !== 408;
      setOutcome({
        outcome: rejected ? "rejected" : "uncertain",
        description: rejected ? cause.message : "A resposta do salvamento não chegou. Confira os dados atuais da conta antes de enviar novamente.",
        cause,
      });
    } finally { setActivity(null); }
  }

  async function checkResult() {
    if (!draft || busy || blocked || retries >= operationRecoveryLimit) return;
    setActivity("Conferindo dados da conta");
    setRetries(value => value + 1);
    try {
      const saved = fieldsFrom(parseProfileRead(await api("/api/profile")).data);
      if (Object.keys(saved).every(key => saved[key as keyof Fields] === draft[key as keyof Fields])) {
        finish("confirmed");
      } else {
        setOutcome({ outcome: "rejected", description: "Os dados da conta ainda são diferentes dos dados enviados. Volte à identificação para conferir os valores atuais antes de editar novamente." });
        onChange();
      }
    } catch (cause) {
      setOutcome({ outcome: "uncertain", description: "A consulta ainda não confirmou os dados da conta.", cause });
    } finally { setActivity(null); }
  }

  const failure = typeof outcome === "object" ? outcome : null;
  const canCheck = !blocked && !busy && failure?.outcome === "uncertain" && retries < operationRecoveryLimit;
  const field = (key: keyof Fields, value: string) => {
    setDraft(previous => previous && { ...previous, [key]: value });
    if (key === "name") setError("");
  };
  return <>
    <div className="hca-account-identity">
      <AvatarSettings active={active} name={profile.full_name} imageUrl={profile.avatar} onChange={onChange} />
      <div>
        <p className="hca-modal-kicker">Seu perfil</p>
        <h2>{profile.full_name}</h2>
        <p>{profile.professional_category || "Minha conta pessoal"}</p>
        {!blocked ? <small>Conta ativa</small> : null}
      </div>
    </div>
    <section className="hca-account-section" aria-label="Identificação pessoal">
      <header><h2>Identificação</h2><ActionButton ref={editRef} compact onClick={() => {
        setDraft(current); setOutcome(null); setError("");
      }}><Icon name="edit" />Editar</ActionButton></header>
      <DefinitionGrid items={[
        { label: "Nome completo", value: current.name },
        { label: "Categoria profissional", value: current.category || "Não informada" },
        { label: "Registro profissional", value: [current.registration, current.state].filter(Boolean).join(" · ") || "Não informado" },
      ]} />
      <details><summary>Sobre os dados profissionais<Icon name="down" width={15} height={15} /></summary><p>Estes dados são informados por você. A família registra sua própria conferência no contexto de cada paciente.</p></details>
    </section>
    <section className="hca-account-section" aria-label="Acesso e apresentação">
      <header><h2>Acesso e apresentação</h2></header>
      <div className="hca-account-links">
        <ContactSettings profile={profile} active={active} onChange={onChange} openOnEntry={openContacts} />
        <PresentationPreference active={active} />
      </div>
    </section>
    {draft ? <Dialog open={active && !blocked} keepMounted title="Editar identificação" kicker="Minha conta" headingIcon="user" popupClassName="hca-account-editor"
      closeDisabled={busy} dismissOnOutsideClick={false} onClose={closeEdit} finalFocus={editRef}
      footer={<>
        <ActionButton disabled={busy} onClick={closeEdit}>Cancelar</ActionButton>
        <ActionButton type="submit" form={formId} variant="primary" disabled={busy || blocked || failure?.outcome === "uncertain"}><Icon name="check" />{busy ? "Confirmando…" : "Salvar alterações"}</ActionButton>
      </>}>
      <form id={formId} onSubmit={event => void submit(event)} className="hca-account-form">
        <fieldset disabled={busy}>
        <FormField label="Nome completo" required error={error || undefined}>
          <TextInput ref={nameRef} name="name" value={draft.name} maxLength={160} autoComplete="name" onChange={event => field("name", event.currentTarget.value)} />
        </FormField>
        <FormField label="Categoria profissional"><TextInput name="category" value={draft.category} maxLength={80} placeholder="Ex.: técnica de enfermagem" onChange={event => field("category", event.currentTarget.value)} /></FormField>
        <FormField label="Registro profissional" helpText="Preencha apenas quando aplicável à sua categoria."><TextInput name="registration" value={draft.registration} maxLength={30} onChange={event => field("registration", event.currentTarget.value)} /></FormField>
        <FormField label="UF do registro" htmlFor={stateId}><select className="hca-text-input input" id={stateId} name="state" value={draft.state} onChange={event => field("state", event.currentTarget.value)}>
          <option value="">Não se aplica</option>
          {states.map(state => <option key={state}>{state}</option>)}
        </select></FormField>
        </fieldset>
      </form>
      {active && !blocked && failure ? <DocumentOperationFailureDialog {...failure} title="Não foi possível salvar a identificação" operation="Salvar identificação" fallbackCode="PERFIL_IDENTIFICACAO" attempts={retries}
        closeLabel={failure.outcome === "uncertain" ? "Voltar à identificação" : "Rever os campos"}
        onClose={() => { if (failure.outcome === "uncertain" || retries > 0) closeEdit(); else setOutcome(null); }}
        action={canCheck ? { label: "Conferir dados da conta", onClick: () => void checkResult() } : undefined}
        exhaustedMessage={failure.outcome === "uncertain" && retries >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema." : undefined} /> : null}
    </Dialog> : null}
    {active && !blocked && (outcome === "saved" || outcome === "confirmed") ? <Dialog open success title={outcome === "saved" ? "Identificação atualizada" : "Dados confirmados"}
      subtitle={outcome === "saved" ? "Seu nome e os dados profissionais foram salvos na conta." : "Os dados atuais da conta correspondem aos dados enviados."}
      popupClassName="hca-operation-result-dialog" finalFocus={editRef} onClose={() => setOutcome(null)} footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </>;
}
