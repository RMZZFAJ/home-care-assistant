"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  buttonClass,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
} from "./workspace";
import { ContactSettings } from "./auth/contact-settings";
import { MfaSettings } from "./auth/mfa-settings";
import { formatBrazilDate } from "@/lib/receipt";
import { NewPasswordField } from "./auth/new-password-field";
import { newPasswordSchema } from "@/lib/validation/password";
import { useLiveRevision } from "@/lib/use-live-revision";
import { ProfileIdentity } from "./profile/profile-identity";
import { SciencePreferenceSettings } from "./profile/science-preference";
import { parseProfileRead, type ProfileRead } from "@/lib/validation/profile";
import { UserGuide } from "@/components/guides/user-guide";
import { PwaSettings } from "./pwa/pwa-settings";
import { ProfileTabs } from "./profile/profile-tabs";
import { PushSettings } from "./pwa/push-settings";
import { ChannelPreferences } from "./profile/channel-preferences";
import { AdministrativePendingRecovery } from "./admin/administrative-pending-recovery";
type Profile = ProfileRead["data"];
type Membership = ProfileRead["memberships"][number];
type Session = ProfileRead["sessions"][number];
export function ProfileConsole() {
  return (
    <Workspace title="Minha conta" eyebrow="Conta e preferências" account heading={() => <div className="page-heading hca-account-heading"><div>
      <p className="eyebrow">Conta e preferências</p>
      <h1>Minha conta</h1>
      <p>Tudo o que acompanha o seu acesso.</p>
    </div></div>}>
      {context => <><AdministrativePendingRecovery key={context.userId} userId={context.userId} />
        <ProfileContent key={context.userId} patientSelected={context.activeContext?.mode === "patient" && Boolean(context.patient)} />
      </>}
    </Workspace>
  );
}
function ProfileContent({ patientSelected }: { patientSelected: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  const [readAttempt, setReadAttempt] = useState(0), [settledRead, setSettledRead] = useState("");
  const [readFailure, setReadFailure] = useState<{ key: string; message: string; } | null>(null);
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
        if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) { setMemberships([]); setSessions([]); }
        setReadFailure({ key: readKey, message: reason instanceof Error ? reason.message : "Não foi possível consultar o perfil." });
      });
    return () => controller.abort();
  }, [readKey]);
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const parsed = newPasswordSchema.safeParse(form.get("password"));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/profile", { action: "password", currentPassword: form.get("currentPassword"), password: parsed.data });
      window.dispatchEvent(new Event("hca:profile-updated"));
      setMessage("Senha alterada.");
      element.reset();
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
    <section className="hca-profile space-y-5" aria-label="Perfil pessoal">
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {readFailure ? <Notice error>{readFailure.message} <button type="button" className={buttonClass} onClick={() => setReadAttempt(value => value + 1)}>Consultar perfil novamente</button></Notice> : null}
      {reading ? <Notice>{profile ? "Atualizando consulta do perfil…" : "Carregando perfil…"}</Notice> : null}
      <PushSettings renderSections={push => (
        <ProfileTabs>
          {{
            identity: active => profile ? <>
              <ProfileIdentity profile={profile} active={active} onChange={() => {
                window.dispatchEvent(new Event("hca:profile-updated"));
                setAttempt(value => value + 1);
              }} />
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
                        {membership.care_recipients === null
                          ? " · Situação do paciente indisponível"
                          : membership.care_recipients.is_active ? "" : " · Paciente inativo"}
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
            </> : null,
            security: profile ? <>
              {profile.providers.includes("email") ? (
                <SettingsSection title="Alterar senha" summary="Proteja seu acesso com autenticação recente">

                  <form
                    className="mt-4 space-y-4"
                    onSubmit={(event) => void savePassword(event)}
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
                    <button type="submit" className={primaryClass} disabled={busy}>
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
              <div id="contatos-de-acesso"><ContactSettings
                email={profile.email}
                phone={profile.phone}
                providers={profile.providers}
                onChange={() => setAttempt((value) => value + 1)}
              /></div>
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
            </> : null,
            notices: active => <>
              <SettingsSection title="Do seu jeito" summary="Atualizações e ações do vínculo selecionado">
                <Link className={buttonClass} href="/notificacoes">Central de avisos</Link>
              </SettingsSection>
              <ChannelPreferences active={active} email={profile?.email} phone={profile?.phone} />
              <SciencePreferenceSettings active={active} patientSelected={patientSelected} />
              <PwaSettings />{push.consent(active)}
            </>,
            devices: push.devices,
            help: profile ? active => <SettingsSection title="Guias e ajuda" summary="Reabrir orientações e guardar seu progresso">
              <UserGuide active={active} />
            </SettingsSection> : null,
          }}
        </ProfileTabs>
      )} />
    </section>
  );
}
