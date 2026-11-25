"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "../workspace";
import { PermissionMatrix } from "./permission-matrix";
import { NotificationMatrix } from "./notification-matrix";
import { PolicyRules } from "./policy-rules";
import { ScheduleResidenceSettings } from "./schedule-residence-settings";
import { BalanceRegimeSettings, canManageBalanceRegime } from "@/components/balances/balance-regime-settings";
import { PatientSchedule } from "@/components/schedules/schedule-console";
import { canConfigureResidenceHours } from "@/components/schedules/schedule-residence-requirement";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/primitives";
import "./administration.css";

import { useRouter, useSearchParams } from "next/navigation";
import { roles } from "./admin-fields";
import { useLiveRevision } from "@/lib/use-live-revision";
import { shortNameChange } from "@/lib/validation/governance";
import type { ResidenceRuleResult } from "@/lib/validation/reviewed-residence-rule";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { GovernanceProposals } from "./governance-proposals";
import { governanceCommandConfirmed } from "@/lib/validation/governance";
import { residencePolicyDefaults } from "@/lib/governance-presentation";
import { ResidenceRuleSettings } from "./residence-rule-settings";
import { FeedbackBanner } from "@/components/ui/feedback";
import { ResidenceRuleFeedback, useResidenceRuleOperation } from "./residence-rule-operation";

const ruleAreas = ["rules", "notifications", "thresholds"];
type ConfigurationPacket = { careRecipientId: string; kind: string; change: Record<string, unknown>; idempotencyKey: string; expectedVersion: number; requestId?: string; decision?: string };
type ConfigurationResult = { data: { id: string; status: string }; invitationUrl?: string; invitationRecovery?: { invitationId: string; notice: string } };
type PolicyData = {
  data: { version: number; settings: Record<string, unknown> };
  directory: { id: string; name: string; role: string }[];
  definitions: { code: string; critical: boolean; default_roles: string[] }[];
  overrides: {
    capability: string;
    subject_user: string | null;
    subject_role: string | null;
    enabled: boolean;
  }[];
  changes: {
    id: string;
    kind: string;
    proposed: Record<string, unknown>;
    proposed_by: string;
    status: string;
    resolution?: { invitationId?: string };
  }[];
};
export function PolicyConsole() {
  const params = useSearchParams();
  const scheduleArea = params.get("area") === "schedules";
  const permissionArea = params.get("area") === "permissions";
  const peopleArea = params.get("area") === "people";
  const day = params.get("day");
  return (
    <Workspace title={scheduleArea ? "Configurações de plantões" : permissionArea ? "Permissões" : peopleArea ? "Pessoas e propostas" : "Regras e avisos"}
      eyebrow={permissionArea ? "Organização da residência" : undefined} administration>
      {(context) =>
        context.patient && scheduleArea ? (
          <div className="hca-form-stack">
            {can(context, "access.manage") || context.activeContext?.mode === "global" ? (
              <PolicyNavigation tab="schedules" scheduleAccess={can(context, "schedule.types.manage")} />
            ) : null}
            <Link className="ui-button ui-button-secondary" prefetch={false}
              href={"/escalas?" + new URLSearchParams({
                careRecipientId: context.patient.id,
                ...(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? { day } : {}),
              })}>Voltar à agenda</Link>
            {canConfigureResidenceHours(context)
              ? <ScheduleResidenceSettings key={context.patient.id} patientId={context.patient.id} /> : null}
            <PatientSchedule key={`schedule:${context.userId}:${context.patient.id}`} context={context} settings />
            {canManageBalanceRegime(context) && can(context, "bal.read") ? (
              <BalanceRegimeSettings key={`balance-regime:${context.userId}:${context.patient.id}`} context={context} patientId={context.patient.id} />
            ) : null}
          </div>
        ) : context.patient &&
        (can(context, "access.manage") ||
          context.activeContext?.mode === "global") ? (
          <Policies key={`${context.userId}:${context.patient.id}:${context.activeContext?.mode}`} context={context} />
        ) : (
          <Notice>Selecione um paciente que você administra.</Notice>
        )
      }
    </Workspace>
  );
}

function PolicyNavigation({ tab, scheduleAccess }: { tab: string; scheduleAccess: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const rules = ruleAreas.includes(tab);
  const areas: [string, string, IconName][] = rules ? [
    ["rules", "Regras", "settings"], ["notifications", "Avisos", "bell"], ["thresholds", "Estoque", "box"],
  ] : [
    ["rules", "Regras", "settings"], ["permissions", "Permissões", "shield"],
    ["notifications", "Avisos", "bell"], ["people", "Pessoas e propostas", "users"],
  ];
  if (!rules && (scheduleAccess || tab === "schedules")) areas.push(["schedules", "Plantões", "calendar"]);
  return <nav aria-label="Áreas da configuração" className="hca-configuration-tabs hca-document-tab-list">
    {areas.map(([area, label, icon]) => {
      const query = new URLSearchParams(params.toString());
      query.set("area", area);
      const href = "/configuracoes?" + query;
      return <a key={area} className="hca-configuration-tab hca-document-tab" href={href}
        aria-current={tab === area ? "page" : undefined} onClick={event => {
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
            event.preventDefault();
            router.replace(href, { scroll: false });
          }
        }}><Icon name={icon} />{label}</a>;
    })}
  </nav>;
}

function Policies({ context }: { context: WorkspaceContext }) {
  const patientId = context.patient!.id;
  const liveRevision = useLiveRevision();
  const [data, setData] = useState<PolicyData | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [readAttempt, setReadAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const command = useCommandIntent<ConfigurationPacket, ConfigurationResult>(governanceCommandConfirmed);
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState(false);
  const params = useSearchParams();
  const tab = [...ruleAreas, "permissions", "people"].includes(params.get("area") ?? "") ? params.get("area")! : "rules";
  const rulesArea = ruleAreas.includes(tab);
  const mode = context.activeContext?.mode === "global" ? "global" : "patient";
  const policyOperation = useResidenceRuleOperation(context.userId, { patientId, mode, purpose: "settings" });
  const noticeOperation = useResidenceRuleOperation(context.userId, { patientId, mode, purpose: "notification_rule" });
  const busy = command.busy || invitationBusy || reviewing || confirming || policyOperation.busy || noticeOperation.busy;
  const reviewedConflict = policyOperation.versionConflict || noticeOperation.versionConflict;
  const locked = busy || command.uncertain || conflict || policyOperation.blocked || noticeOperation.blocked || reviewedConflict;
  const savingRef = useRef(false);
  const currentVersionRef = useRef<number | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [invitationRecovery, setInvitationRecovery] = useState<{ invitationId: string; notice: string } | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void api<PolicyData>(
      "/api/patient-settings?careRecipientId=" + patientId,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (
          !controller.signal.aborted &&
          result.data.version >= (currentVersionRef.current ?? 0)
        ) {
          currentVersionRef.current = result.data.version;
          setData(result);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          const accessLost = reason instanceof ApiError && [401, 403, 404].includes(reason.status);
          if (accessLost) setData(null);
          setError(previous => accessLost ? reason.message : previous || reason.message);
        }
      });
    return () => controller.abort();
  }, [patientId, readAttempt, liveRevision]);
  async function refreshConfirmed() {
    setConfirming(true);
    try {
      const authoritative = await api<PolicyData>("/api/patient-settings?careRecipientId=" + patientId);
      if (authoritative.data.version >= (currentVersionRef.current ?? 0)) { currentVersionRef.current = authoritative.data.version; setData(authoritative); }
      await context.refresh();
    } catch (reason) { setError("A ação foi confirmada, mas a consulta posterior falhou. " + (reason instanceof Error ? reason.message : "Atualize esta seção.")); }
    finally { setEditingVersion(null); setConfirming(false); setAttempt(value => value + 1); }
  }
  async function confirmed(result: ConfigurationResult) {
    setInvitationUrl(result.invitationUrl ?? "");
    setInvitationRecovery(result.invitationRecovery ?? null);
    setMessage(result.data.status === "awaiting_acceptance"
      ? "Aprovação registrada. O vínculo será criado somente após o aceite do destinatário."
      : result.data.status === "pending"
        ? "Proposta global registrada. Referência: " + result.data.id + ". Um administrador local distinto deve aprovar."
        : "Configuração aplicada no paciente.");
    await refreshConfirmed();
    return true;
  }
  async function reviewCurrent() {
    if (busy) return;
    setReviewing(true); setError("");
    policyOperation.closeFailure(); noticeOperation.closeFailure();
    try {
      const authoritative = await api<PolicyData>("/api/patient-settings?careRecipientId=" + patientId);
      if (authoritative.data.version >= (currentVersionRef.current ?? 0)) { currentVersionRef.current = authoritative.data.version; setData(authoritative); }
      setEditingVersion(null); setAttempt(value => value + 1); setConflict(false);
      policyOperation.clearVersionConflict(); noticeOperation.clearVersionConflict();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível consultar a configuração vigente. Sua edição continua preservada."); }
    finally { setReviewing(false); }
  }
  async function configureVersioned(kind: "settings" | "notification_rule", change: Record<string, unknown>, expectedVersion: number) {
    if (locked || savingRef.current) return;
    const operation = kind === "settings" ? policyOperation : noticeOperation;
    savingRef.current = true;
    setError(""); setMessage("");
    try {
      await operation.submit({ change, expectedVersion });
    } finally {
      savingRef.current = false;
    }
  }
  function failed(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 409) setConflict(true);
    setError(reason instanceof ApiError && reason.status === 409
      ? "A configuração mudou em outra sessão ou a intenção difere da registrada. Seus valores foram preservados. Revise a configuração vigente antes de preparar outra alteração."
      : reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração.");
    return false;
  }
  async function configure(
    kind: string,
    change: Record<string, unknown>,
    requestId?: string,
    decision?: string,
    reviewedVersion?: number,
  ) {
    if (!data || savingRef.current || locked) return false;
    savingRef.current = true;
    setError("");
    try {
      const result = await command.send("/api/patient-settings", {
        careRecipientId: patientId,
        kind,
        change,
        idempotencyKey: crypto.randomUUID(),
        expectedVersion: reviewedVersion ?? (
          kind === "settings"
            ? (editingVersion ?? data.data.version)
            : (currentVersionRef.current ?? data.data.version)),
        ...(requestId ? { requestId, decision } : {}),
      });
      return await confirmed(result);
    } catch (reason) {
      return failed(reason);
    } finally {
      savingRef.current = false;
    }
  }
  async function reissueInvitation(invitationId: string) {
    if (savingRef.current || locked) return;
    savingRef.current = true; setInvitationBusy(true); setError("");
    try {
      const result = await api<{ invitationUrl: string }>("/api/admin", { action: "resendInvitation", careRecipientId: patientId, invitationId });
      setInvitationUrl(result.invitationUrl); setInvitationRecovery(null);
      setMessage("Convite reemitido. O link anterior foi invalidado; entregue este novo link somente ao destinatário aprovado.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível reemitir o convite."); }
    finally { savingRef.current = false; setInvitationBusy(false); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || locked) return;
    const form = new FormData(event.currentTarget);
    const change: Record<string, unknown> = {};
    for (const key of [
      "balDay",
      "archiveDays",
      "reminderHours",
      "reminderRepeatHours",
      "shareWaitSeconds",
    ])
      change[key] = form.get(key) === "" ? null : Number(form.get(key));
    for (const key of ["balReview", "balRequirement"])
      change[key] = form.get(key);
    change.scienceRequirement = "any";
    change.scienceByDispatch = true;
    change.scienceAutomatic = data?.data.settings.scienceAutomatic ?? false;
    change.scienceWhatsApp = data?.data.settings.scienceWhatsApp ?? false;
    for (const key of [
      "whatsappSimpleAcceptance",
      "scienceRequired",
      "scienceDialog",
      "scienceTacit",
    ])
      change[key] = form.has(key);
    change.balApprovers = form.getAll("balApprovers");
    change.scienceRoles = form.getAll("scienceRoles");
    change.balReminderUsers = form.getAll("balReminderUsers");
    change.shiftReminder = {
      enabled: form.has("shiftEnabled"),
      hour: Number(form.get("shiftHour")),
      days: form.getAll("shiftDays"),
      userIds: form.getAll("shiftUsers"),
    };
    try { Object.assign(change, shortNameChange(String(form.get("patientShortNameAction") ?? "keep"), String(form.get("patientShortName") ?? ""))); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : "Confira o nome curto.");
      const input = event.currentTarget.elements.namedItem("patientShortName"); if (input instanceof HTMLElement) input.focus();
      return;
    }
    await configureVersioned("settings", change, editingVersion ?? data.data.version);
  }
  if (!data)
    return (
      <Notice error={Boolean(error)}>
        {error || "Carregando configurações…"}
        {error ? <ActionButton onClick={() => { setError(""); setReadAttempt(value => value + 1); }}>Consultar configuração novamente</ActionButton> : null}
      </Notice>
    );
  const settings = { ...residencePolicyDefaults, ...data.data.settings };
  const recovery = command.uncertain ? <Notice error>O resultado da alteração ainda não foi confirmado. O conteúdo e a chave da tentativa estão preservados. <ActionButton disabled={busy} onClick={async () => { setError(""); try { await confirmed(await command.recover()); } catch (reason) { failed(reason); } }}>Recuperar mesma alteração</ActionButton></Notice>
    : conflict ? <Notice error>Revise a configuração vigente antes de preparar outra intenção. <ActionButton disabled={busy} onClick={() => void reviewCurrent()}>Revisar configuração vigente</ActionButton></Notice> : null;
  const reviewVersioned = () => void reviewCurrent();
  const versionedRecovery = reviewedConflict && !policyOperation.failure && !noticeOperation.failure
    ? <ActionButton disabled={busy} onClick={reviewVersioned}>Revisar configuração vigente</ActionButton> : null;
  const finishVersioned = (state: ResidenceRuleResult["state"]) => {
    if (state === "recorded") void refreshConfirmed();
  };
  return (
    <div className="space-y-5">
      {rulesArea ? <>
        <p className="text-sm text-(--muted)">Ajustes da residência com o efeito de cada escolha.</p>
        {mode === "global" ? <FeedbackBanner heading="Mudanças sujeitas à decisão local">Você registra propostas. Outro administrador da residência decide quando serão aplicadas.</FeedbackBanner> : null}
      </> : tab === "permissions" ? <p className="text-sm text-(--muted)">Perfis da residência e exceções de cada pessoa.</p> : <p className="text-sm text-(--muted)">
        {context.activeContext?.mode === "global"
          ? "Atuação global: mudanças neste paciente geram propostas para aprovação local."
          : "Atuação local: alterações autorizadas são aplicadas imediatamente."}{" "}
        · Política v{data.data.version}
      </p>}
      {error ? <Notice error>{error}{!command.uncertain && !conflict ? <ActionButton onClick={() => { setError(""); setReadAttempt(value => value + 1); }}>Consultar configuração novamente</ActionButton> : null}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {recovery}
      {versionedRecovery}
      {invitationRecovery ? <Notice>{invitationRecovery.notice}{context.activeContext?.mode === "patient" && context.patient?.role === "admin" ? <button className={buttonClass} disabled={busy} onClick={() => void reissueInvitation(invitationRecovery.invitationId)}>Reemitir convite e invalidar link anterior</button> : <p>Um administrador local deve reemitir o convite.</p>}</Notice> : null}
      {invitationUrl ? (
        <Notice>
          Entregue este convite apenas ao destinatário aprovado.
          <input
            aria-label="Convite aprovado"
            className={inputClass}
            readOnly
            value={invitationUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </Notice>
      ) : null}
      <PolicyNavigation tab={tab} scheduleAccess={can(context, "schedule.types.manage")} />
      <div hidden={tab !== "rules"}>
        <PolicyRules key={patientId} revision={attempt} settings={settings} directory={data.directory} busy={busy} locked={locked} recovery={versionedRecovery} error={error} message={message} globalMode={mode === "global"} versionKey={patientId + ":" + (editingVersion ?? data.data.version) + ":" + attempt} onStartEditing={() => { setMessage(""); setError(""); setEditingVersion(data.data.version); }} save={saveSettings} />
      </div>
      {tab === "permissions" ? (
        <PermissionMatrix
          key={`${patientId}:${params.get("person") ?? ""}`}
          initialPersonId={params.get("person") ?? ""}
          patientId={patientId}
          patientName={context.patient!.display_name}
          version={data.data.version}
          revision={liveRevision}
          globalMode={context.activeContext?.mode === "global"}
          definitions={data.definitions}
          overrides={data.overrides}
          directory={data.directory}
          busy={locked}
          configure={(change, version) => configure("capability", change, undefined, undefined, version)}
        />
      ) : null}
      {tab === "notifications" ? (
        <>
        <ResidenceRuleSettings userId={context.userId} scope={{ patientId, mode, purpose: "notificationRecipient" }} />
        <NotificationMatrix
          patientId={patientId}
          version={data.data.version}
          formRevision={attempt}
          busy={busy}
          locked={locked}
          recovery={versionedRecovery}
          globalMode={mode === "global"}
          configure={(change, version) => configureVersioned("notification_rule", change, version)}
          configurationError={error}
        />
        <FeedbackBanner>A configuração não comprova que uma mensagem foi entregue. Destino verificado, consentimento e autorização continuam necessários.</FeedbackBanner>
        </>
      ) : null}
      {tab === "thresholds" ? <ResidenceRuleSettings key="thresholds" userId={context.userId} scope={{ patientId, mode, purpose: "alertRule" }} /> : null}
      {rulesArea ? <Link className="hca-control hca-control--secondary" prefetch={false} href={`/admin?careRecipientId=${patientId}`}><Icon name="back" />Voltar à administração</Link> : null}
      {tab === "people" ? (
        <>
          <GovernanceProposals key={context.userId + ":" + patientId} context={context} directory={data.directory}
            version={data.data.version} revision={attempt + liveRevision} busy={locked}
            refreshConfiguration={() => { setReadAttempt(value => value + 1); void context.refresh(); }} />
          <section className="ui-card">
            <h2 className="font-semibold">Função no paciente</h2>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void configure("membership", {
                  userId: f.get("userId"),
                  role: f.get("role"),
                });
              }}
            >
              <label className="text-sm font-semibold">
                Pessoa
                <select className={inputClass} name="userId">
                  {data.directory.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Função
                <select className={inputClass} name="role">
                  {Object.entries(roles).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={primaryClass} disabled={locked}>
                Registrar alteração
              </button>
            </form>
          </section>
        </>
      ) : null}
      <ResidenceRuleFeedback operation={policyOperation} purpose="settings" onFinish={finishVersioned} onReview={reviewVersioned} />
      <ResidenceRuleFeedback operation={noticeOperation} purpose="notification_rule" onFinish={finishVersioned} onReview={reviewVersioned} />
    </div>
  );
}
