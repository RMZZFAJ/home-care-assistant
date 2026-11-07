"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  buttonClass,
  errorMessage,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
} from "./workspace";
import { ContactSettings } from "./auth/contact-settings";
import { MfaSettings } from "./auth/mfa-settings";
import Image from "next/image";
import { formatBrazilDate } from "@/lib/receipt";
import { NewPasswordField } from "./auth/new-password-field";
import { newPasswordSchema } from "@/lib/validation/password";
import { useLiveRevision } from "@/lib/use-live-revision";
import { SciencePreferenceSettings } from "./profile/science-preference";
import { parseProfileRead, type ProfileRead } from "@/lib/validation/profile";
import { UserGuide } from "@/components/guides/user-guide";
import { PwaSettings } from "./pwa/pwa-settings";
import { requireRuntimeCommandsAvailable } from "@/lib/client/api";
type Profile = ProfileRead["data"];
type Membership = ProfileRead["memberships"][number];
type Session = ProfileRead["sessions"][number];
export function ProfileConsole() {
  return (
    <Workspace title="Meu perfil e segurança">
      {() => <ProfileContent />}
    </Workspace>
  );
}
function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  const [readAttempt, setReadAttempt] = useState(0), [settledRead, setSettledRead] = useState("");
  const [readFailure, setReadFailure] = useState<{ key: string; message: string } | null>(null);
  const readKey = JSON.stringify([attempt, liveRevision, readAttempt]);
  const reading = settledRead !== readKey && readFailure?.key !== readKey;
  useEffect(() => {
    const controller = new AbortController();
    api<unknown>(
      "/api/profile",
      undefined,
      controller.signal,
    )
      .then(parseProfileRead).then((result) => {
        if (controller.signal.aborted) return;
        setProfile(result.data);
        setMemberships(result.memberships);
        setSessions(result.sessions);
        setSettledRead(readKey);
        setReadFailure(null);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) { setProfile(null); setMemberships([]); setSessions([]); }
        setReadFailure({ key: readKey, message: reason instanceof Error ? reason.message : "Não foi possível consultar o perfil." });
      });
    return () => controller.abort();
  }, [readKey]);
  async function save(
    event: FormEvent<HTMLFormElement>,
    action: "update" | "password" | "avatar",
  ) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    if (action === "password") {
      const parsed = newPasswordSchema.safeParse(form.get("password"));
      if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "avatar") {
        requireRuntimeCommandsAvailable();
        const response = await fetch("/api/profile", {
          method: "POST",
          body: form,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            errorMessage(body, "Não foi possível salvar a foto."),
          );
      } else
        await api(
          "/api/profile",
          action === "password"
            ? {
                action,
                currentPassword: form.get("currentPassword"),
                password: form.get("password"),
              }
            : {
                action,
                name: form.get("name"),
                registration: form.get("registration"),
                state: form.get("state") || null,
                category: form.get("category"),
                preferences: {
                  internal: form.has("internal"),
                  whatsapp: form.has("whatsapp"),
                  email: form.has("email"),
                  scienceExpress: profile?.notification_preferences.scienceExpress ?? true,
                  scienceWhatsApp: profile?.notification_preferences.scienceWhatsApp ?? false,
                  scienceAutomatic: profile?.notification_preferences.scienceAutomatic ?? false,
                },
              },
        );
      window.dispatchEvent(new Event("hca:profile-updated"));
      setMessage(
        action === "password" ? "Senha alterada." : "Perfil atualizado.",
      );
      if (action !== "update") element.reset();
      setAttempt((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-label="Perfil pessoal">
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {readFailure ? <Notice error>{readFailure.message} <button type="button" className={buttonClass} onClick={() => setReadAttempt(value => value + 1)}>Consultar perfil novamente</button></Notice> : null}
      {reading ? <Notice>{profile ? "Atualizando consulta do perfil…" : "Carregando perfil…"}</Notice> : null}
      <PwaSettings />
      {profile ? (
        <>
          <SettingsSection title="Identidade pessoal" summary="Nome, identificação profissional e preferências">
            
            <p className="mt-2 text-sm text-(--muted)">{profile.email}</p>
            <form
              key={attempt}
              className="mt-4 space-y-4"
              onSubmit={(event) => void save(event, "update")}
            >
              <fieldset
                disabled={busy}
                className="grid min-w-0 gap-4 sm:grid-cols-2"
              >
                <label className="text-sm font-semibold">
                  Nome
                  <input
                    className={inputClass}
                    name="name"
                    defaultValue={profile.full_name}
                    minLength={2}
                    maxLength={160}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Categoria profissional
                  <input
                    className={inputClass}
                    name="category"
                    defaultValue={profile.professional_category ?? ""}
                    maxLength={80}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Registro profissional
                  <input
                    className={inputClass}
                    name="registration"
                    defaultValue={profile.professional_registration ?? ""}
                    maxLength={30}
                  />
                </label>
                <label className="text-sm font-semibold">
                  UF
                  <select
                    className={inputClass}
                    name="state"
                    defaultValue={profile.professional_state ?? ""}
                  >
                    <option value="">Não informado</option>
                    {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
                      .split(" ")
                      .map((state) => (
                        <option key={state}>{state}</option>
                      ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-semibold">
                    Preferências de notificações
                  </p>
                  {[
                    ["internal", "No aplicativo"],
                    ["whatsapp", "WhatsApp"],
                    ["email", "E-mail"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="mr-5 inline-flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={
                          profile.notification_preferences[key] ?? true
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <p className="text-xs text-(--muted)">
                    Canais externos dependem de configuração e validação do
                    contato. Preferências não concedem permissões.
                  </p>
                </div>
              </fieldset>
              <button className={primaryClass} disabled={busy}>
                Salvar perfil
              </button>
            </form>
          </SettingsSection>
          <SciencePreferenceSettings />
          <SettingsSection title="Foto de perfil" summary="Imagem utilizada na identificação da sua conta">
            
            {profile.avatar ? (
              <Image
                className="mt-4 rounded-full object-cover"
                src={profile.avatar}
                width={88}
                height={88}
                unoptimized
                alt="Sua foto de perfil"
              />
            ) : null}
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => void save(event, "avatar")}
            >
              <label className="text-sm">
                Nova foto
                <input
                  className={inputClass}
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </label>
              <button className={buttonClass} disabled={busy}>
                Salvar foto
              </button>
            </form>
          </SettingsSection>
          {profile.providers.includes("email") ? (
            <SettingsSection title="Alterar senha" summary="Proteja seu acesso com autenticação recente">
              
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => void save(event, "password")}
              >
                <label className="block text-sm font-semibold">
                  Senha atual
                  <input
                    className={inputClass}
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </label>
                <NewPasswordField className={inputClass} disabled={busy} />
                <button className={primaryClass} disabled={busy}>
                  Alterar senha
                </button>
              </form>
            </SettingsSection>
          ) : (
            <Notice>
              Sua autenticação é gerenciada pelo provedor da conta.
            </Notice>
          )}
          <MfaSettings />
          <ContactSettings
            email={profile.email}
            phone={profile.phone}
            providers={profile.providers}
            onChange={() => setAttempt((value) => value + 1)}
          />
          <SettingsSection title="Seus vínculos com pacientes" summary="Funções e situação dos seus acessos">
            
            <ul className="mt-4 space-y-3">
              {memberships.map((membership) => (
                <li
                  key={membership.care_recipient_id}
                  className="rounded-lg border border-(--line) p-3 text-sm"
                >
                  <strong>
                    {membership.care_recipients?.display_name ??
                      "Paciente com acesso indisponível"}
                  </strong>
                  <p className="mt-1">
                    {{
                      admin: "Administrador do paciente",
                      family: "Familiar",
                      supervisor: "Supervisor",
                      professional: "Profissional da equipe",
                      reader: "Leitor",
                    }[membership.role] ?? membership.role}{" "}
                    ·{" "}
                    {membership.status === "active"
                      ? "Vínculo ativo"
                      : "Vínculo revogado"}
                    {membership.care_recipients?.is_active
                      ? ""
                      : " · Paciente inativo"}
                  </p>
                </li>
              ))}
            </ul>
            {!memberships.length ? (
              <p className="mt-3 text-sm text-(--muted)">
                Nenhum vínculo local disponível para consulta. A administração
                global possui escopo independente.
              </p>
            ) : null}
          </SettingsSection>
          <SettingsSection title="Sessões autenticadas" summary="Dispositivos e acessos vinculados à sua conta">
            
            <ul className="mt-4 space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded border border-(--line) p-3 text-sm"
                >
                  <strong>
                    {session.current ? "Esta sessão" : "Outra sessão"}
                  </strong>
                  <p className="mt-1 wrap-break-word text-xs text-(--muted)">
                    {session.userAgent || "Dispositivo não identificado"}
                  </p>
                  <p className="mt-1 text-xs">
                    Iniciada em {formatBrazilDate(session.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
            <button
              className={buttonClass + " mt-4"}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/profile", { action: "signoutOthers" });
                  setMessage(
                    "Outras sessões encerradas. Tokens já emitidos expiram conforme a configuração de Auth.",
                  );
                  setAttempt((value) => value + 1);
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Não foi possível confirmar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Encerrar outras sessões
            </button>
          </SettingsSection>
          <SettingsSection title="Guias e ajuda" summary="Reabrir orientações e guardar seu progresso"><UserGuide/></SettingsSection>
        </>
      ) : null}
    </section>
  );
}
