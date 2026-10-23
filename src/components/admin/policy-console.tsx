"use client";
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
import { ReminderSettings } from "./reminder-settings";
import { roles } from "./admin-fields";
import { useLiveRevision } from "@/lib/use-live-revision";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("rules");
  const savingRef = useRef(false);
  const currentVersionRef = useRef<number | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const editingVersionRef = useRef<number | null>(null);
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
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [patientId, attempt, liveRevision]);
  async function configure(
    kind: string,
    change: Record<string, unknown>,
    requestId?: string,
    decision?: string,
  ) {
    if (!data || savingRef.current) return false;
    savingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        data: { status: string };
        invitationUrl?: string;
      }>("/api/patient-settings", {
        careRecipientId: patientId,
        kind,
        change,
        idempotencyKey: crypto.randomUUID(),
        expectedVersion:
          kind === "settings"
            ? (editingVersionRef.current ?? data.data.version)
            : (currentVersionRef.current ?? data.data.version),
        ...(requestId ? { requestId, decision } : {}),
      });
      setInvitationUrl(result.invitationUrl ?? "");
      setMessage(
        result.data.status === "awaiting_acceptance"
          ? "Aprovação registrada. O vínculo será criado somente após o aceite do destinatário."
          : result.data.status === "pending"
            ? "Proposta global registrada. Um administrador local distinto deve aprovar."
            : "Configuração aplicada no paciente.",
      );
      const authoritative = await api<PolicyData>(
        "/api/patient-settings?careRecipientId=" + patientId,
      );
      currentVersionRef.current = authoritative.data.version;
      setData(authoritative);
      editingVersionRef.current = null;
      await context.refresh();
      return result.data.status === "applied";
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 409
          ? "A configuração mudou em outra sessão. Dados recarregados; revise e reaplique sua alteração."
          : reason instanceof Error
            ? reason.message
            : "Não foi possível salvar.",
      );
      try {
        const authoritative = await api<PolicyData>(
          "/api/patient-settings?careRecipientId=" + patientId,
        );
        currentVersionRef.current = authoritative.data.version;
        setData(authoritative);
      } catch {
        setAttempt((value) => value + 1);
      }
      return false;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
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
    for (const key of ["balReview", "balRequirement", "scienceRequirement"])
      change[key] = form.get(key);
    for (const key of [
      "whatsappSimpleAcceptance",
      "scienceRequired",
      "scienceByDispatch",
      "scienceAutomatic",
      "scienceWhatsApp",
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
    if (String(form.get("patientShortName") ?? "").trim())
      change.patientShortName = String(form.get("patientShortName")).trim();
    void configure("settings", change);
  }
  if (!data)
    return (
      <Notice error={Boolean(error)}>
        {error || "Carregando configurações…"}
      </Notice>
    );
  const settings = { ...defaults, ...data.data.settings };
  const selected = (key: string, value: string) =>
    (settings[key] as string[]).includes(value);
  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        {context.activeContext?.mode === "global"
          ? "Atuação global: mudanças neste paciente geram propostas para aprovação local."
          : "Atuação local: alterações autorizadas são aplicadas imediatamente."}{" "}
        · Política v{data.data.version}
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
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
      <label className="block max-w-md text-sm font-semibold">
        Configurar
        <select
          className={inputClass}
          value={tab}
          onChange={(event) => setTab(event.target.value)}
        >
          <option value="rules">Regras de operação e ciência</option>
          <option value="permissions">Matriz de permissões</option>
          <option value="notifications">Matriz de notificações</option>
          <option value="people">Pessoas e propostas</option>
        </select>
      </label>
      {tab === "rules" ? (
        <section className="ui-card">
          <h2 className="font-semibold">Política do paciente</h2>
          <p className="my-3 text-xs text-(--muted)">
            Alterações se aplicam às novas requisições. Documentos existentes
            preservam a política de emissão.
          </p>
          <form
            key={patientId + ":" + attempt}
            onSubmit={saveSettings}
            onChange={() => {
              editingVersionRef.current ??= data.data.version;
            }}
            className="space-y-4"
          >
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Dia do BAL
                <select
                  name="balDay"
                  className={inputClass}
                  defaultValue={String(settings.balDay ?? "")}
                >
                  <option value="">Não configurado</option>
                  {[
                    "Domingo",
                    "Segunda",
                    "Terça",
                    "Quarta",
                    "Quinta",
                    "Sexta",
                    "Sábado",
                  ].map((day, i) => (
                    <option key={day} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Revisão do BAL
                <select
                  name="balReview"
                  className={inputClass}
                  defaultValue={String(settings.balReview)}
                >
                  <option value="optional">Opcional</option>
                  <option value="required">Obrigatória</option>
                </select>
              </label>
              <fieldset>
                <legend className="text-sm font-semibold">
                  Grupos revisores BAL
                </legend>
                {["family", "supervisor"].map((role) => (
                  <label
                    className="mr-4 inline-flex min-h-11 items-center gap-2 text-sm"
                    key={role}
                  >
                    <input
                      type="checkbox"
                      name="balApprovers"
                      value={role}
                      defaultChecked={selected("balApprovers", role)}
                    />
                    {roles[role as keyof typeof roles]}
                  </label>
                ))}
              </fieldset>
              <label className="text-sm font-semibold">
                Critério de aprovação BAL
                <select
                  name="balRequirement"
                  className={inputClass}
                  defaultValue={String(settings.balRequirement)}
                >
                  <option value="any">Qualquer grupo</option>
                  <option value="all">Todos · pessoas distintas</option>
                </select>
              </label>
              {[
                [
                  "whatsappSimpleAcceptance",
                  "Aceite ENT simplificado pelo WhatsApp verificado",
                ],
                ["scienceRequired", "Exigir ciência familiar da REQ"],
                [
                  "scienceByDispatch",
                  "Registrar ciência do entregador autorizado na expedição",
                ],
                [
                  "scienceAutomatic",
                  "Permitir ciência automática com consentimento pessoal",
                ],
                [
                  "scienceWhatsApp",
                  "Permitir ciência simplificada pelo WhatsApp com consentimento pessoal",
                ],
              ].map(([key, label]) => (
                <label
                  className="flex min-h-11 items-center gap-3 text-sm"
                  key={key}
                >
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={settings[key] === true}
                  />
                  {label}
                </label>
              ))}
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-semibold">
                  Funções responsáveis pela ciência
                </legend>
                {["admin", "family", "supervisor", "professional"].map(
                  (role) => (
                    <label
                      className="mr-4 inline-flex min-h-11 items-center gap-2 text-sm"
                      key={role}
                    >
                      <input
                        name="scienceRoles"
                        type="checkbox"
                        value={role}
                        defaultChecked={selected("scienceRoles", role)}
                      />
                      {roles[role as keyof typeof roles]}
                    </label>
                  ),
                )}
              </fieldset>
              <label className="text-sm font-semibold">
                Exigência de ciência
                <select
                  className={inputClass}
                  name="scienceRequirement"
                  defaultValue={String(settings.scienceRequirement)}
                >
                  <option value="any">Uma pessoa autorizada</option>
                  <option value="all">Todas as pessoas responsáveis</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Nome curto nas mensagens
                <input
                  name="patientShortName"
                  className={inputClass}
                  maxLength={60}
                  defaultValue={String(settings.patientShortName)}
                />
              </label>
              {[
                ["archiveDays", "Arquivar após conclusão (dias)", 1, 365],
                ["reminderHours", "Primeiro lembrete (horas)", 1, 720],
                ["reminderRepeatHours", "Repetir lembrete (horas)", 1, 720],
                [
                  "shareWaitSeconds",
                  "Acompanhamento inicial (segundos)",
                  0,
                  10,
                ],
              ].map(([key, label, min, max]) => (
                <label className="text-sm font-semibold" key={String(key)}>
                  {label}
                  <input
                    name={String(key)}
                    className={inputClass}
                    type="number"
                    required
                    min={Number(min)}
                    max={Number(max)}
                    defaultValue={Number(settings[String(key)])}
                  />
                </label>
              ))}
              <ReminderSettings
                settings={settings}
                directory={data.directory}
              />
            </fieldset>
            <button className={primaryClass} disabled={busy}>
              Registrar política
            </button>
          </form>
        </section>
      ) : null}
      {tab === "permissions" ? (
        <PermissionMatrix
          definitions={data.definitions}
          overrides={data.overrides}
          directory={data.directory}
          busy={busy}
          configure={configure}
        />
      ) : null}
      {tab === "notifications" ? (
        <NotificationMatrix
          patientId={patientId}
          version={data.data.version}
          busy={busy}
          configure={configure}
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
              <button className={primaryClass} disabled={busy}>
                Registrar alteração
              </button>
            </form>
          </section>
          <section className="ui-card">
            <h2 className="font-semibold">
              Propostas globais aguardando aprovação local
            </h2>
            {data.changes
              .filter((change) =>
                ["pending", "awaiting_acceptance"].includes(change.status),
              )
              .map((change) => (
                <article
                  className="mt-3 rounded-lg border border-(--line) p-3"
                  key={change.id}
                >
                  <p className="font-semibold">{change.kind}</p>
                  <pre className="my-3 whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(change.proposed, null, 2)}
                  </pre>
                  {change.status === "awaiting_acceptance" ? (
                    <p className="text-sm">
                      Aguardando aceite do destinatário. Ainda não concede
                      vínculo.
                    </p>
                  ) : change.proposed_by !== context.userId &&
                    context.activeContext?.mode === "patient" &&
                    context.patient?.role === "admin" ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        className={primaryClass}
                        disabled={busy}
                        onClick={() =>
                          void configure(
                            change.kind,
                            change.proposed,
                            change.id,
                            "approve",
                          )
                        }
                      >
                        Aprovar proposta
                      </button>
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() =>
                          void configure(
                            change.kind,
                            change.proposed,
                            change.id,
                            "reject",
                          )
                        }
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs">
                      Aguardando administrador local distinto do proponente.
                    </p>
                  )}
                </article>
              ))}
            {!data.changes.some((change) => change.status === "pending") ? (
              <p className="mt-3 text-sm text-(--muted)">
                Nenhuma proposta pendente.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
