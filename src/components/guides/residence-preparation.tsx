"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { z } from "zod";
import { api, ApiError, Notice, primaryClass, Workspace, type WorkspaceContext } from "@/components/workspace";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { SearchSelect } from "@/components/ui/search-select";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { readProfileDirectory } from "@/lib/client/profile-directory";
import {
  preparationConfirmed, preparationCreateContent, residenceCreationReceipt, residenceCreationResult, reviewedAdministrator,
  type PreparationContent, type ResidenceCreationPacket, type ResidenceCreationReceipt, type ReviewedAdministrator,
} from "@/lib/validation/residence-preparation";
import "./residence-preparation.css";

const endpoint = "/api/residence-preparations";
const creationSteps = [
  { label: "Conferindo os dados e a administração inicial", icon: "users" },
  { label: "Registrando a residência", icon: "home" },
  { label: "Preparando as tarefas de organização", icon: "check" },
] as const;
const pendingSchema = z.object({
  key: z.uuid(),
  retries: z.number().int().min(0).max(operationRecoveryLimit),
}).strict();
type PendingCreation = z.infer<typeof pendingSchema>;
type Person = Awaited<ReturnType<typeof readProfileDirectory>>[number];
type Fields = Omit<PreparationContent, "responseMinutes" | "ownerId" | "substituteId"> & {
  responseMinutes: string; ownerId?: string; substituteId?: string;
};
type FieldErrors = Partial<Record<keyof Fields, string>>;
type Review = { content: PreparationContent; administrator: ReviewedAdministrator };
type Failure = { cause: unknown; review: boolean };

const initial: Fields = {
  displayName: "", isActive: false, timeZone: "America/Sao_Paulo", administratorEmail: "",
  responseMinutes: "60", showGuide: true, isDevelopment: true,
};

export function ResidencePreparationPage() {
  const params = useSearchParams();
  const administration = params.get("from") === "administration";
  const patient = z.uuid().safeParse(params.get("returnPatient"));
  const returnTo = administration ? "/admin" + (patient.success ? "?careRecipientId=" + patient.data : "") : "/guias";
  return <Workspace title="Nova residência" eyebrow="Administração global">{context =>
    context.activeContext?.mode === "global" && context.globalAdministrationAllowed ?
      <ResidenceRegistration key={context.userId} context={context} returnTo={returnTo} /> :
      <Notice>Somente a administração global inicia uma residência. <Link href={returnTo}>{administration ? "Voltar à administração" : "Voltar aos guias"}</Link></Notice>
  }</Workspace>;
}

function ResidenceRegistration({ context, returnTo }: { context: WorkspaceContext; returnTo: string }) {
  const router = useRouter();
  const storage = "hca:residence-creation:" + context.userId;
  const [fields, setFields] = useState<Fields>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [cancel, setCancel] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, setPending] = useState<PendingCreation | null>(null);
  const [checking, setChecking] = useState(true);
  const [phase, setPhase] = useState<"review" | "create" | "recover" | null>(null);
  const [receipt, setReceipt] = useState<ResidenceCreationReceipt | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [closed, setClosed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reviewTriggerRef = useRef<HTMLButtonElement>(null);
  const receiptHeadingRef = useRef<HTMLHeadingElement>(null);
  const packetRef = useRef<ResidenceCreationPacket | null>(null);
  const runningRef = useRef(false);
  const submitting = phase !== null;
  const unresolved = pending !== null;
  const locked = checking || submitting || unresolved;

  useOperationActivity(phase === "create", { title: "Criando a residência", steps: creationSteps, stage: 1 });
  useOperationActivity(phase === "review" || phase === "recover" || checking, {
    title: phase === "review" ? "Conferindo a administração inicial" : "Consultando o resultado da criação",
  });

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      const ref = readPending(storage);
      if (!ref) return;
      const result = await lookup(ref.key, controller.signal);
      if (controller.signal.aborted) return;
      if (result?.state === "preparing") {
        writePending(storage, null);
        setReceipt(result);
      } else if (result?.state === "closed_without_creation") {
        writePending(storage, null);
        setClosed(true);
      } else {
        setPending(ref);
        setFailure({ cause: new Error("A criação ainda aguarda confirmação."), review: false });
      }
    }
    void restore().catch(reason => {
      if (controller.signal.aborted) return;
      setPending(readPending(storage));
      setFailure({ cause: reason, review: false });
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [storage]);

  function patch(value: Partial<Fields>) {
    setFields(fields => ({ ...fields, ...value }));
    setErrors(errors => Object.fromEntries(Object.entries(errors).filter(([key]) => !(key in value))));
  }

  function rememberNames(people: Person[]) {
    setNames(previous => ({ ...previous, ...Object.fromEntries(people.map(person => [person.id, person.full_name])) }));
  }

  async function prepareReview(event: FormEvent) {
    event.preventDefault();
    if (locked || runningRef.current) return;
    const parsed = preparationCreateContent.safeParse({ ...fields, responseMinutes: Number(fields.responseMinutes) });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message])));
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const content = parsed.data;
    runningRef.current = true;
    setPhase("review");
    setErrors({});
    try {
      const result = await api<{ data: unknown }>(endpoint, { action: "review", administratorEmail: content.administratorEmail });
      setReview({ content, administrator: reviewedAdministrator.parse(result.data) });
    } catch (cause) {
      setFailure({ cause, review: true });
    } finally {
      runningRef.current = false;
      setPhase(null);
    }
  }

  function remember(value: PendingCreation | null) {
    writePending(storage, value);
    setPending(value);
  }

  function adopt(result: ResidenceCreationReceipt) {
    remember(null);
    packetRef.current = null;
    setReceipt(result);
    setShowSuccess(true);
    void context.refresh();
  }

  async function confirm() {
    if (!review || runningRef.current || pending) return;
    const packet: ResidenceCreationPacket = {
      action: "create", content: review.content, reviewedAdministratorId: review.administrator.id,
      idempotencyKey: crypto.randomUUID(),
    };
    packetRef.current = packet;
    runningRef.current = true;
    remember({ key: packet.idempotencyKey, retries: 0 });
    setReview(null);
    setPhase("create");
    try { adopt(await transmit(packet)); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status > 0 && cause.status < 500) {
        remember(null);
        packetRef.current = null;
      }
      setFailure({ cause, review: false });
    } finally {
      runningRef.current = false;
      setPhase(null);
    }
  }

  async function recover() {
    if (!pending || runningRef.current || pending.retries >= operationRecoveryLimit) return;
    runningRef.current = true;
    remember({ ...pending, retries: pending.retries + 1 });
    setFailure(null);
    setPhase("recover");
    try {
      const found = await lookup(pending.key);
      const packet = packetRef.current;
      if (found?.state === "preparing") {
        if (packet && !preparationConfirmed({ data: found }, packet)) throw new Error("O resultado não corresponde à revisão enviada.");
        adopt(found);
        return;
      }
      if (!found && packet) {
        adopt(await transmit(packet));
        return;
      }
      const response = found ?? readResult(
        await api(endpoint, { action: "resolve", idempotencyKey: pending.key }), pending.key,
      );
      if (response?.state === "preparing") adopt(response);
      else if (response?.state === "closed_without_creation") {
        remember(null);
        packetRef.current = null;
        setClosed(true);
      } else throw new Error("A criação ainda aguarda confirmação.");
    } catch (cause) {
      setFailure({ cause, review: false });
    } finally {
      runningRef.current = false;
      setPhase(null);
    }
  }

  function beginAgain() {
    setReceipt(null);
    setFields(initial);
    setErrors({});
    setNames({});
  }

  const nameOf = (id: string) => receipt?.people?.[id] ?? names[id] ?? "Identidade registrada";
  return <>
    {receipt ? <CreatedResidence receipt={receipt} context={context} headingRef={receiptHeadingRef} nameOf={nameOf} onNew={beginAgain} returnTo={returnTo} /> :
      <form className="hca-residence-preparation" ref={formRef} aria-label="Preparação da residência" noValidate onSubmit={event => void prepareReview(event)}>
        <section className="ui-card hca-residence-intro">
          <span><Icon name="home" /></span>
          <div><h2>Comece pelos dados essenciais</h2><p>Identifique a residência e as pessoas responsáveis. A criação só acontece após sua revisão.</p></div>
        </section>
        <fieldset disabled={locked} className="ui-card hca-residence-section" aria-labelledby="residence-identification">
          <h2 id="residence-identification">Identificação da residência</h2>
          <div className="hca-residence-fields">
            <FormField label="Nome da residência" error={errors.displayName} required>
              <TextInput value={fields.displayName} maxLength={160} onChange={event => patch({ displayName: event.target.value })} />
            </FormField>
            <FormField label="Estado inicial" required>
              <SelectField value={String(fields.isActive)} onChange={event => patch({ isActive: event.target.value === "true" })}>
                <option value="false">Inativo</option><option value="true">Ativo</option>
              </SelectField>
            </FormField>
            <ZoneChoice value={fields.timeZone} error={errors.timeZone} onChange={timeZone => patch({ timeZone })} />
          </div>
        </fieldset>
        <fieldset disabled={locked} className="ui-card hca-residence-section" aria-labelledby="residence-people">
          <h2 id="residence-people">Administração e continuidade</h2>
          <div className="hca-residence-fields">
            <FormField label="E-mail da conta administradora inicial" error={errors.administratorEmail} required
              helpText="Use uma conta ativa e já confirmada pela própria pessoa.">
              <TextInput type="email" value={fields.administratorEmail} maxLength={254} onChange={event => patch({ administratorEmail: event.target.value })} />
            </FormField>
            <PersonChoice label="Titular da continuidade" names={names} selected={fields.ownerId ? [fields.ownerId] : []}
              onChange={ids => patch({ ownerId: ids[0] })} rememberNames={rememberNames} disabled={locked} error={errors.ownerId} />
            <PersonChoice label="Substituto da continuidade" names={names} selected={fields.substituteId ? [fields.substituteId] : []}
              onChange={ids => patch({ substituteId: ids[0] })} rememberNames={rememberNames} disabled={locked} error={errors.substituteId} />
            <FormField label="Prazo de resposta, em minutos" helpText="De 15 minutos a 7 dias." error={errors.responseMinutes} required>
              <TextInput type="number" min={15} max={10080} step={1} value={fields.responseMinutes} onChange={event => patch({ responseMinutes: event.target.value })} />
            </FormField>
            <details className="hca-residence-plan">
              <summary>Planejar participantes</summary>
              <p>As pessoas planejadas recebem acesso pelos convites e aceites próprios.</p>
              <PersonChoice label="Equipe planejada" names={names} selected={fields.teamIds ?? []}
                onChange={teamIds => patch({ teamIds })} rememberNames={rememberNames} disabled={locked} multiple />
            </details>
          </div>
        </fieldset>
        <fieldset disabled={locked} className="ui-card hca-residence-section" aria-labelledby="residence-first-access">
          <h2 id="residence-first-access">Primeiro acesso</h2>
          <div className="hca-residence-options">
            <CheckboxField className="hca-setting-switch" role="switch" aria-label="Mostrar guia no primeiro acesso" checked={fields.showGuide}
              onChange={event => patch({ showGuide: event.target.checked })}
              label={<><strong>Mostrar guia no primeiro acesso</strong><small>A apresentação é opcional e pode ser consultada depois.</small></>} />
            <CheckboxField className="hca-setting-switch" role="switch" aria-label="Cadastro de desenvolvimento" checked={fields.isDevelopment}
              onChange={event => patch({ isDevelopment: event.target.checked })}
              label={<><strong>Cadastro de desenvolvimento</strong><small>Destinado exclusivamente a dados fictícios.</small></>} />
          </div>
        </fieldset>
        <div className="hca-residence-actions">
          <ActionButton disabled={checking || submitting} onClick={() => setCancel(true)}><Icon name="back" />Cancelar</ActionButton>
          {unresolved ? <ActionButton variant="primary" disabled={checking || submitting} onClick={() => setFailure({
            cause: new Error("A criação ainda aguarda confirmação."), review: false,
          })}><Icon name="search" />Conferir resultado</ActionButton> :
            <ActionButton ref={reviewTriggerRef} variant="primary" type="submit" disabled={locked}>
              <Icon name="arrow" />Revisar criação
            </ActionButton>}
        </div>
      </form>}
    {review ? <Dialog open title="Confira antes de criar" kicker="Criação da residência" headingIcon="home"
      finalFocus={reviewTriggerRef} onClose={() => setReview(null)} footer={<>
        <ActionButton onClick={() => setReview(null)}>Voltar ao preenchimento</ActionButton>
        <ActionButton variant="primary" onClick={() => void confirm()}><Icon name="check" />Criar residência</ActionButton>
      </>}>
      <DefinitionGrid items={summary(review.content, nameOf, review.administrator.name)} />
      <Notice>O cadastro confirma a administração inicial. Convites, estoque e organização da rotina continuam nos fluxos próprios.</Notice>
    </Dialog> : null}
    {cancel ? <Dialog open title={unresolved ? "Fechar a consulta da criação?" : "Sair deste preenchimento?"}
      onClose={() => setCancel(false)} footer={<>
        <ActionButton onClick={() => setCancel(false)}>Continuar</ActionButton>
        <ActionButton variant="primary" onClick={() => router.push(returnTo)}>Sair</ActionButton>
      </>}>
      <p>{unresolved ? "A solicitação já foi enviada. Confira o resultado da mesma tentativa ao retornar." : "Os dados desta tela serão descartados. Nenhuma residência foi criada."}</p>
    </Dialog> : null}
    {failure ? <DocumentOperationFailureDialog
      title={unresolved ? "Criação ainda sem confirmação" : failure.review ? "Conta administradora a conferir" : "Não foi possível criar a residência"}
      outcome={unresolved ? "uncertain" : "rejected"} cause={failure.cause}
      description={unresolved ? "Consulte o resultado da mesma tentativa antes de criar outra residência." : message(failure.cause)}
      operation="Criar residência" fallbackCode="RESIDENCIA_CRIACAO_NAO_CONFIRMADA" attempts={pending?.retries ?? 0} attemptReference={pending?.key}
      guidance={unresolved ? "A referência identifica o cadastro que você confirmou." : "Confira os dados e faça uma nova revisão."}
      exhaustedMessage={pending?.retries === operationRecoveryLimit ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
      action={pending && pending.retries < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void recover() } : undefined}
      onClose={() => setFailure(null)} closeLabel={unresolved ? "Voltar" : "Voltar ao preenchimento"}
      finalFocus={unresolved ? undefined : reviewTriggerRef} /> : null}
    {closed ? <Dialog open title="Criação encerrada sem cadastro" headingIcon="info" onClose={() => setClosed(false)}
      footer={<ActionButton variant="primary" onClick={() => setClosed(false)}>Voltar ao preenchimento</ActionButton>}>
      <p>O servidor confirmou que nenhuma residência foi criada por esta tentativa.</p>
    </Dialog> : null}
    {receipt && showSuccess ? <Dialog open success title="Residência criada"
      subtitle="O cadastro está confirmado. As tarefas locais continuam com as pessoas autorizadas."
      finalFocus={receiptHeadingRef} onClose={() => setShowSuccess(false)}
      footer={<ActionButton variant="primary" onClick={() => setShowSuccess(false)}>Acompanhar tarefas locais</ActionButton>}>
      <DefinitionGrid items={[
        { label: "Residência", value: receipt.content.displayName },
        { label: "Administração inicial", value: receipt.content.administratorEmail },
        { label: "Estado inicial", value: receipt.content.isActive ? "Ativo" : "Inativo" },
      ]} />
    </Dialog> : null}
  </>;
}

const tasks = [
  { title: "Pessoas e vínculos", icon: "users", text: "Confira os vínculos e os aceites no cadastro local." },
  { title: "Materiais e apresentações", icon: "box", text: "Confira unidades e apresentações no catálogo." },
  { title: "Estoque e custódias", icon: "home", text: "Organize a conferência física da família e da equipe." },
  { title: "Escalas e responsabilidades", icon: "calendar", text: "Organize os plantões e as responsabilidades locais." },
  { title: "Regime de balanços", icon: "note", text: "Configure horários e pessoas responsáveis." },
  { title: "Comunicação e orientação", icon: "bell", text: "Confira os canais e a orientação inicial da residência." },
] as const;

function CreatedResidence({ receipt, context, headingRef, nameOf, onNew, returnTo }: {
  receipt: ResidenceCreationReceipt; context: WorkspaceContext; headingRef: RefObject<HTMLHeadingElement | null>;
  nameOf: (id: string) => string; onNew: () => void; returnTo: string;
}) {
  const [task, setTask] = useState<string | null>(null);
  const local = context.patients.some(patient => patient.id === receipt.patientId && patient.hasMembership);
  return <div className="hca-residence-preparation">
    <section className="ui-card hca-residence-section" aria-label="Cadastro confirmado">
      <h2 ref={headingRef} tabIndex={-1}>Residência criada</h2>
      <div className="hca-toolbar"><Pill tone="success">Criada</Pill><span>Organização local em andamento</span></div>
      <DefinitionGrid items={summary(receipt.content, nameOf, nameOf(receipt.administratorId))} />
    </section>
    <section className="ui-card hca-residence-section" aria-label="Próximos passos">
      <h2>Próximos passos</h2>
      <p>Organize a rotina com a equipe. Materiais, vínculos, estoque e escalas são preparados nos fluxos próprios.</p>
      {tasks.map(({ title, icon, text }) => <button type="button" className="hca-residence-task" key={title} onClick={() => setTask(title)}>
        <span><Icon name={icon} /></span><div><strong>{title}</strong><small>{text}</small></div><Icon name="chevron" />
      </button>)}
    </section>
    <Notice>Para consultar dados da residência, selecione um vínculo local autorizado.</Notice>
    <div className="hca-residence-actions">
      <Link className="hca-control hca-control--secondary" href={returnTo}>{returnTo === "/guias" ? "Voltar aos guias" : "Voltar à administração"}</Link>
      <ActionButton variant="primary" onClick={onNew}><Icon name="plus" />Nova residência</ActionButton>
    </div>
    {task ? <Dialog open title="Continue no vínculo local" headingIcon="lock" onClose={() => setTask(null)}
      footer={<>
        <ActionButton onClick={() => setTask(null)}>Voltar</ActionButton>
        {local ? <Link className={primaryClass} href={"/preparacao-local?careRecipientId=" + receipt.patientId}>Abrir preparação local</Link> : null}
      </>}>
      <p>As tarefas são consultadas com o vínculo ativo e as permissões da residência.</p>
      <DefinitionGrid items={[{ label: "Residência", value: receipt.content.displayName }, { label: "Tarefa", value: task }]} />
    </Dialog> : null}
  </div>;
}

function PersonChoice({ label, names, selected, onChange, rememberNames, disabled, multiple, error }: {
  label: string; names: Record<string, string>; selected: string[]; disabled: boolean; multiple?: boolean; error?: string;
  onChange: (ids: string[]) => void; rememberNames: (people: Person[]) => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Person[]; error: string } | null>(null);
  const search = query?.trim() ?? "";
  const key = JSON.stringify([search, attempt]);
  const current = search && result?.key === key ? result : null;

  useEffect(() => {
    if (!search || disabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void readProfileDirectory(page => api("/api/admin?" + new URLSearchParams({
        section: "profiles", profilePage: String(page), query: search,
      }), undefined, controller.signal), controller.signal, search).then(people => {
        if (!controller.signal.aborted) setResult({ key, data: people.filter(person => person.status === "active"), error: "" });
      }).catch(reason => {
        if (!controller.signal.aborted) setResult({ key, data: [], error: message(reason) });
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, key, disabled]);

  const id = "residence-" + label.toLowerCase().replaceAll(" ", "-");
  const caption = names[selected[0]] ?? "";
  return <FormField label={label} htmlFor={id} error={error} required={!multiple}>
    <SearchSelect id={id} multiple={multiple} disabled={disabled} aria-label={label}
      aria-invalid={Boolean(error)} aria-describedby={error ? id + "-error" : undefined}
      placeholder="Busque pelo nome" maxLength={160} query={query ?? (multiple ? "" : caption)} selectedIds={selected}
      onQueryChange={value => { setQuery(value); if (!multiple) onChange([]); }}
      onSelectionChange={ids => {
        rememberNames(current?.data.filter(person => ids.includes(person.id)) ?? []);
        onChange(ids);
        setQuery(null);
      }}
      options={(current?.data ?? []).map(person => ({ value: person.id, label: person.full_name }))} />
    {search && !current && !disabled ? <p role="status">Consultando pessoas…</p> : null}
    {current?.error ? <Notice error>{current.error} <ActionButton disabled={disabled}
      onClick={() => setAttempt(value => value + 1)}>Consultar pessoas novamente</ActionButton></Notice> : null}
    {multiple && selected.length ? <ul className="hca-residence-planned">
      {selected.map(id => <li key={id}>
        <span>{names[id] ?? "Identidade registrada"}</span>
        <ActionButton variant="quiet" compact disabled={disabled} onClick={() => onChange(selected.filter(value => value !== id))}>Remover</ActionButton>
      </li>)}
    </ul> : null}
  </FormField>;
}

const timeZones = [...Intl.supportedValuesOf("timeZone"), "UTC"];
const suggestedZones = ["America/Sao_Paulo", "America/Manaus", "America/Rio_Branco", "UTC"];
function ZoneChoice({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState<string | null>(null);
  const options = query ? timeZones.filter(zone => zone.toLowerCase().includes(query.toLowerCase())).slice(0, 40) : suggestedZones;
  return <FormField label="Fuso da residência" htmlFor="residence-timezone" error={error} required>
    <SearchSelect id="residence-timezone" aria-label="Fuso da residência" aria-invalid={Boolean(error)}
      aria-describedby={error ? "residence-timezone-error" : undefined}
      query={query ?? value} selectedIds={value ? [value] : []}
      onQueryChange={value => { setQuery(value); onChange(""); }}
      onSelectionChange={ids => { onChange(ids[0] ?? ""); setQuery(null); }}
      options={options.map(zone => ({ value: zone, label: zone }))} />
  </FormField>;
}

function summary(content: PreparationContent, person: (id: string) => string, administrator: string) {
  return [
    { label: "Residência", value: content.displayName },
    { label: "Estado inicial", value: content.isActive ? "Ativo" : "Inativo" },
    { label: "Fuso", value: content.timeZone },
    { label: "Administração inicial", value: administrator },
    { label: "E-mail da conta", value: content.administratorEmail },
    { label: "Titular", value: person(content.ownerId) },
    { label: "Substituto", value: person(content.substituteId) },
    { label: "Prazo", value: content.responseMinutes + " minutos" },
    { label: "Guia inicial", value: content.showGuide ? "Habilitado" : "Desabilitado" },
    { label: "Cadastro", value: content.isDevelopment ? "Desenvolvimento · dados fictícios" : "Operacional" },
    ...(content.teamIds?.length ? [{ label: "Equipe planejada", value: content.teamIds.map(person).join(", ") }] : []),
  ];
}

function readPending(storage: string) {
  try {
    const result = pendingSchema.safeParse(JSON.parse(sessionStorage.getItem(storage) ?? "null"));
    return result.success ? result.data : null;
  } catch { return null; }
}

function writePending(storage: string, value: PendingCreation | null) {
  try {
    if (value) sessionStorage.setItem(storage, JSON.stringify(value));
    else sessionStorage.removeItem(storage);
  } catch { /* The open operation retains its reference in memory. */ }
}

function readResult(value: unknown, key: string) {
  const result = z.object({ data: residenceCreationResult.nullable() }).parse(value).data;
  if (result && result.creationKey !== key) throw new Error("A resposta não corresponde à tentativa original.");
  return result;
}

async function lookup(key: string, signal?: AbortSignal) {
  return readResult(await api(endpoint + "?attempt=" + key, undefined, signal), key);
}

async function transmit(packet: ResidenceCreationPacket) {
  const result = await api<{ data: unknown }>(endpoint, packet);
  if (!preparationConfirmed(result, packet)) throw new Error("A resposta não confirmou a residência revisada.");
  return residenceCreationReceipt.parse(result.data);
}

function message(reason: unknown) {
  return reason instanceof ApiError ? reason.message : "Não foi possível confirmar a operação. Confira os dados e consulte o responsável pelo sistema.";
}
