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
import { Icon, type IconName } from "@/components/ui/primitives";
import "./administration.css";

import { useRouter, useSearchParams } from "next/navigation";
import { roles } from "./admin-fields";
import { useLiveRevision } from "@/lib/use-live-revision";
import { shortNameChange } from "@/lib/validation/governance";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { GovernanceProposals } from "./governance-proposals";
import { governanceCommandConfirmed } from "@/lib/validation/governance";
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
const defaults: Record<string, unknown> = {
  balDay: null,
  balReview: "optional",
  balApprovers: ["family", "supervisor"],
  balRequirement: "any",
  whatsappSimpleAcceptance: false,
  scienceRequired: true,
  scienceRoles: ["admin", "family"],
  scienceRequirement: "any",
  scienceByDispatch: true,
  scienceAutomatic: false,
  archiveDays: 7,
  reminderHours: 2,
  reminderRepeatHours: 24,
  shareWaitSeconds: 10,
  patientShortName: "",
};
export function PolicyConsole() {
  return (
    <Workspace title="Permissões, comunicação e regras" administration>
      {(context) =>
        context.patient &&
        (can(context, "access.manage") ||
          context.activeContext?.mode === "global") ? (
          <Policies key={context.patient.id} context={context} />
        ) : (
          <Notice>Selecione um paciente que você administra.</Notice>
        )
      }
    </Workspace>
  );
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
  const busy = command.busy || invitationBusy || reviewing || confirming;
  const locked = busy || command.uncertain || conflict;
  const params = useSearchParams();
  const router = useRouter();
  const tab = ["rules", "permissions", "notifications", "people"].includes(params.get("area") ?? "") ? params.get("area")! : "rules";
  const setTab = (area: string) => { const query = new URLSearchParams(params.toString()); query.set("area", area); router.replace("/configuracoes?" + query, { scroll: false }); };
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
          if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) setData(null);
          setError(reason.message);
        }
      });
    return () => controller.abort();
  }, [patientId, readAttempt, liveRevision]);
  async function confirmed(result: ConfigurationResult) {
    setConfirming(true);
    setInvitationUrl(result.invitationUrl ?? "");
    setInvitationRecovery(result.invitationRecovery ?? null);
    setMessage(result.data.status === "awaiting_acceptance"
      ? "Aprovação registrada. O vínculo será criado somente após o aceite do destinatário."
      : result.data.status === "pending"
        ? "Proposta global registrada. Referência: " + result.data.id + ". Um administrador local distinto deve aprovar."
        : "Configuração aplicada no paciente.");
    setEditingVersion(null);
    try {
      const authoritative = await api<PolicyData>("/api/patient-settings?careRecipientId=" + patientId);
      if (authoritative.data.version >= (currentVersionRef.current ?? 0)) { currentVersionRef.current = authoritative.data.version; setData(authoritative); }
      await context.refresh();
    } catch (reason) { setError("A ação foi confirmada, mas a consulta posterior falhou. " + (reason instanceof Error ? reason.message : "Atualize esta seção.")); }
    finally { setConfirming(false); setAttempt(value => value + 1); }
    return true;
  }
  async function reviewCurrent() {
    if (busy) return;
    setReviewing(true); setError("");
    try {
      const authoritative = await api<PolicyData>("/api/patient-settings?careRecipientId=" + patientId);
      if (authoritative.data.version >= (currentVersionRef.current ?? 0)) { currentVersionRef.current = authoritative.data.version; setData(authoritative); }
      setEditingVersion(null); setAttempt(value => value + 1); setConflict(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível consultar a configuração vigente. Sua edição continua preservada."); }
    finally { setReviewing(false); }
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
        expectedVersion:
          kind === "settings"
            ? (editingVersion ?? data.data.version)
            : (currentVersionRef.current ?? data.data.version),
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
  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return Promise.resolve(false);
    }
    return configure("settings", change);
  }
  if (!data)
    return (
      <Notice error={Boolean(error)}>
        {error || "Carregando configurações…"}
        {error ? <ActionButton onClick={() => { setError(""); setReadAttempt(value => value + 1); }}>Consultar configuração novamente</ActionButton> : null}
      </Notice>
    );
  const settings = { ...defaults, ...data.data.settings };
  const recovery = command.uncertain ? <Notice error>O resultado da alteração ainda não foi confirmado. O conteúdo e a chave da tentativa estão preservados. <ActionButton disabled={busy} onClick={async () => { setError(""); try { await confirmed(await command.recover()); } catch (reason) { failed(reason); } }}>Recuperar mesma alteração</ActionButton></Notice>
    : conflict ? <Notice error>Revise a configuração vigente antes de preparar outra intenção. <ActionButton disabled={busy} onClick={() => void reviewCurrent()}>Revisar configuração vigente</ActionButton></Notice> : null;
  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        {context.activeContext?.mode === "global"
          ? "Atuação global: mudanças neste paciente geram propostas para aprovação local."
          : "Atuação local: alterações autorizadas são aplicadas imediatamente."}{" "}
        · Política v{data.data.version}
      </p>
      {error ? <Notice error>{error}{!command.uncertain && !conflict ? <ActionButton onClick={() => { setError(""); setReadAttempt(value => value + 1); }}>Consultar configuração novamente</ActionButton> : null}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {recovery}
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
      <nav aria-label="Áreas da configuração" className="hca-configuration-tabs hca-document-tab-list">{([
        ["rules", "Regras", "settings"], ["permissions", "Permissões", "shield"],
        ["notifications", "Notificações", "bell"], ["people", "Pessoas e propostas", "users"],
      ] satisfies [string, string, IconName][]).map(([area, label, icon]) => {
        const query = new URLSearchParams(params.toString()); query.set("area", area);
        return <a key={area} className="hca-configuration-tab hca-document-tab" href={"/configuracoes?" + query} aria-current={tab === area ? "page" : undefined} onClick={(event) => {
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); setTab(area); }
        }}><Icon name={icon} />{label}</a>;
      })}</nav>
      <div hidden={tab !== "rules"}>
        <PolicyRules key={patientId} revision={attempt} settings={settings} directory={data.directory} busy={busy} locked={locked} recovery={recovery} error={error} message={message} versionKey={patientId + ":" + (editingVersion ?? data.data.version) + ":" + attempt} onStartEditing={() => { setMessage(""); setEditingVersion(data.data.version); }} save={saveSettings} />
      </div>
      {tab === "permissions" ? (
        <PermissionMatrix
          definitions={data.definitions}
          overrides={data.overrides}
          directory={data.directory}
          busy={locked}
          configure={configure}
        />
      ) : null}
      {tab === "notifications" ? (
        <NotificationMatrix
          patientId={patientId}
          version={data.data.version}
          busy={locked}
          recovery={recovery}
          configure={configure}
          configurationError={error}
        />
      ) : null}
      {tab === "people" ? (
        <>
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
          <GovernanceProposals context={context} directory={data.directory} version={data.data.version} revision={attempt + liveRevision} busy={locked} configure={configure} reissue={reissueInvitation} />
        </>
      ) : null}
    </div>
  );
}
