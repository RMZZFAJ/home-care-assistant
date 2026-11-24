"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  buttonClass,
  Notice,
  Workspace,
} from "./workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { ProfileIdentity } from "./profile/profile-identity";
import { ProfileSecurity } from "./profile/profile-security";
import { SciencePreferenceSettings } from "./profile/science-preference";
import { parseProfileRead, type ProfileRead } from "@/lib/validation/profile";
import { UserGuide } from "@/components/guides/user-guide";
import { PwaSettings } from "./pwa/pwa-settings";
import { ProfileTabs, useProfileSection } from "./profile/profile-tabs";
import { PushSettings } from "./pwa/push-settings";
import { ChannelPreferences } from "./profile/channel-preferences";
import { AdministrativePendingRecovery } from "./admin/administrative-pending-recovery";
import { ReviewedOwnMembershipRecovery } from "./admin/reviewed-membership-operation";
import { useOperationActivity } from "./ui/operation-activity";
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
        <ReviewedOwnMembershipRecovery key={`membership:${context.userId}`} userId={context.userId} />
        <ProfileContent key={context.userId} patientSelected={context.activeContext?.mode === "patient" && Boolean(context.patient)} />
      </>}
    </Workspace>
  );
}
function ProfileContent({ patientSelected }: { patientSelected: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attempt, setAttempt] = useState(0);
  const security = useProfileSection() === "security";
  const liveRevision = useLiveRevision();
  const [readAttempt, setReadAttempt] = useState(0), [settledRead, setSettledRead] = useState("");
  const [readFailure, setReadFailure] = useState<{ key: string; message: string; } | null>(null);
  const readKey = JSON.stringify([attempt, liveRevision, readAttempt]);
  const reading = settledRead !== readKey && readFailure?.key !== readKey;
  useOperationActivity(security && reading && (!profile || Boolean(readFailure)), {
    title: "Consultando segurança", detail: "Aguarde a consulta aos métodos de acesso e às sessões.",
  });
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
  function refreshProfile() {
    window.dispatchEvent(new Event("hca:profile-updated"));
    setAttempt(value => value + 1);
  }
  return (
    <section className="hca-profile space-y-5" aria-label="Perfil pessoal">
      {readFailure && !security ? <Notice error>{readFailure.message} <button type="button" className={buttonClass} onClick={() => setReadAttempt(value => value + 1)}>Consultar perfil novamente</button></Notice> : null}
      {reading && !security ? <Notice>{profile ? "Atualizando consulta do perfil…" : "Carregando perfil…"}</Notice> : null}
      <PushSettings renderSections={push => (
        <ProfileTabs>
          {{
            identity: active => profile ? <>
              <ProfileIdentity profile={profile} active={active} onChange={refreshProfile} />
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
            security: active => <ProfileSecurity active={active} profile={profile} sessions={sessions} failed={readFailure?.message}
              version={settledRead} retry={() => setReadAttempt(value => value + 1)} onChange={refreshProfile} />,
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
