"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  may,
  Notice,
  type PatientContext,
  type WorkspaceContext,
} from "@/components/workspace";
import { LogoutButton } from "@/components/auth/logout-button";
import { Icon, type IconName } from "@/components/ui/primitives";
import { NotificationBell } from "@/components/notifications/notification-bell";

type NavigationItem = { href: string; label: string; capability?: string };
function NavigationGroup({
  icon,
  label,
  items,
  pathname,
  onNavigate,
}: {
  icon: IconName;
  label: string;
  items: NavigationItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  if (!items.length) return null;
  return (
    <details className="navigation-group" open>
      <summary>
        <Icon name={icon} />
        {label}
        <Icon name="chevron" />
      </summary>
      <div>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
function WorkspaceNavigation({
  context,
  close,
}: {
  context: WorkspaceContext | null;
  close: () => void;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const pathname = path + (params.toString() ? "?" + params.toString() : "");
  const permitted = (items: NavigationItem[]) =>
    items.filter(
      (item) => !item.capability || (context && can(context, item.capability)),
    );
  return (
    <nav aria-label="Navegação principal" className="workspace-navigation">
      <Link
        href="/"
        className="navigation-home"
        aria-current={pathname === "/" ? "page" : undefined}
        onClick={close}
      >
        <Icon name="home" />
        Visão geral
      </Link>
      <NavigationGroup
        label="Fichas"
        icon="forms"
        pathname={pathname}
        onNavigate={close}
        items={permitted([
          {
            href: "/fichas/req",
            label: "REQ · Requisição",
            capability: "req.create",
          },
          {
            href: "/fichas/com",
            label: "COM · Compra da família",
            capability: "com.create",
          },
          {
            href: "/fichas/ent",
            label: "ENT · Entrega / Entrada",
            capability: "ent.create",
          },
          {
            href: "/fichas/bal",
            label: "BAL · Balanço semanal",
            capability: "bal.count",
          },
        ])}
      />
      <Link
        href="/historico"
        className="navigation-home"
        onClick={close}
        aria-current={pathname.startsWith("/historico") ? "page" : undefined}
      >
        <Icon name="history" />
        Histórico
      </Link>
      <NavigationGroup
        label="Estoque"
        icon="stock"
        pathname={pathname}
        onNavigate={close}
        items={permitted([
          {
            href: "/estoque?custody=FAMILY",
            label: "Gestão da família",
            capability: "stock.family.read",
          },
          {
            href: "/estoque?custody=CARE_TEAM",
            label: "Estoque da equipe",
            capability: "stock.team.read",
          },
          {
            href: "/estoque?custody=TRANSIT",
            label: "Materiais em trânsito",
            capability: "ent.read",
          },
          {
            href: "/consumo",
            label: "Faltas e consumo",
            capability: "consumption.report",
          },
        ])}
      />
      {context && may(context, "manage") ? (
        <NavigationGroup
          label="Administração do paciente"
          icon="settings"
          pathname={pathname}
          onNavigate={close}
          items={[
            { href: "/configuracoes", label: "Funções, permissões e regras" },
            { href: "/admin?section=memberships", label: "Pessoas e acessos" },
            { href: "/admin?section=catalog", label: "Catálogo" },
            { href: "/unidades", label: "Unidades e apresentações" },
            { href: "/admin?section=alerts", label: "Alertas de estoque" },
            {
              href: "/admin?section=notificationRecipients",
              label: "Notificações e destinatários",
            },
            {
              href: "/admin?section=notifications",
              label: "Acompanhamento dos envios",
            },
            { href: "/admin?section=audit", label: "Auditoria" },
          ]}
        />
      ) : null}
      {context?.activeContext?.mode === "global" &&
      context.globalAdministrationAllowed ? (
        <NavigationGroup
          label="Administração global"
          icon="settings"
          pathname={pathname}
          onNavigate={close}
          items={[
            { href: "/admin?section=patient", label: "Pacientes" },
            { href: "/admin?section=profiles", label: "Contas globais" },
            { href: "/unidades", label: "Unidades de medida" },
          ]}
        />
      ) : null}
    </nav>
  );
}
type ContextData = {
  documentContext?: {
    patientId: string;
    displayName: string;
    type: string;
  } | null;
  avatarUrl?: string | null;
  userId: string;
  fullName: string;
  isGlobalAdmin: boolean;
  globalAdministrationAllowed?: boolean;
  activeContext: WorkspaceContext["activeContext"];
  patients: PatientContext[];
};
export function AppWorkspace({
  title,
  children,
  administration = false,
}: {
  title: string;
  children: (context: WorkspaceContext) => ReactNode;
  administration?: boolean;
}) {
  const requestedPatientId = useSearchParams().get("careRecipientId");
  const routePath = usePathname();
  const documentId = /^\/(?:historico|fichas)\/([0-9a-f-]{36})$/.exec(
    routePath,
  )?.[1];
  const [context, setContext] = useState<ContextData | null>(null);
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const load = useCallback(
    (signal?: AbortSignal) =>
      api<{ data: ContextData }>(
        "/api/context" + (documentId ? "?documentId=" + documentId : ""),
        undefined,
        signal,
      ).then(
        (result) => {
          if (signal?.aborted) return;
          setContext((current) => ({
            ...result.data,
            patients: result.data.patients.map((patient) => {
              const existing = current?.patients.find(
                (row) => row.id === patient.id,
              );
              return existing &&
                JSON.stringify(existing) === JSON.stringify(patient)
                ? existing
                : patient;
            }),
          }));
          setPatientId((current) => {
            const remembered =
              result.data.activeContext?.mode === "patient"
                ? result.data.activeContext.care_recipient_id || ""
                : requestedPatientId ||
                  current ||
                  sessionStorage.getItem("hca:patient") ||
                  "";
            return result.data.patients.some(
              (patient) => patient.id === remembered,
            )
              ? remembered
              : (result.data.patients[0]?.id ?? "");
          });
          setLoading(false);
          setError("");
        },
        (reason) => {
          if (!signal?.aborted) {
            if (
              reason instanceof ApiError &&
              [401, 403].includes(reason.status)
            )
              setContext(null);
            setError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível validar seus pacientes.",
            );
            setLoading(false);
          }
        },
      ),
    [requestedPatientId, documentId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (patientId) {
      try {
        sessionStorage.setItem("hca:patient", patientId);
      } catch {
        /* Selection remains in memory. */
      }
    }
  }, [patientId]);
  useEffect(() => {
    const refreshProfile = () => {
      void load();
    };
    window.addEventListener("hca:profile-updated", refreshProfile);
    window.addEventListener("hca:data-changed", refreshProfile);
    return () => {
      window.removeEventListener("hca:profile-updated", refreshProfile);
      window.removeEventListener("hca:data-changed", refreshProfile);
    };
  }, [load]);
  useEffect(() => {
    if (!menuOpen) return;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (mobile) {
      document.body.style.overflow = "hidden";
      drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab" && mobile) {
        const nodes = drawerRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),summary",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
    };
  }, [menuOpen]);
  const patient = context?.patients.find((item) => item.id === patientId);
  const refresh = async () => {
    setLoading(true);
    setError("");
    await load();
  };
  const selectProfile = async (id: string | null) => {
    setSelecting(true);
    setError("");
    try {
      await api("/api/context", { careRecipientId: id });
      if (id) setPatientId(id);
      await load();
      setProfileOpen(false);
      profileMenuRef.current?.removeAttribute("open");
      window.dispatchEvent(new Event("hca:context-changed"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível selecionar o perfil.",
      );
    } finally {
      setSelecting(false);
    }
  };
  const value = context ? { ...context, patient, refresh } : null;
  const linkedPatient =
    context?.documentContext?.patientId ?? requestedPatientId;
  const documentMismatch =
    linkedPatient &&
    (context?.activeContext?.mode !== "patient" ||
      context.activeContext.care_recipient_id !== linkedPatient) &&
    !administration;
  const canAdminister =
    value && (value.globalAdministrationAllowed || may(value, "manage"));
  const closeDrawer = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };
  return (
    <div className={"app-shell " + (menuOpen ? "navigation-open" : "")}>
      <a href="#workspace-content" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="app-header print:hidden">
        <button
          ref={menuButtonRef}
          className="ui-icon-button"
          type="button"
          aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"}
          aria-expanded={menuOpen}
          aria-controls="workspace-drawer"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <Link
          href="/"
          className="app-brand"
          aria-label="Home Care Assistant — início"
        >
          <span>HC</span>
          <strong>
            Home Care<span>Assistant</span>
          </strong>
        </Link>
        <div className="patient-picker">
          {context && context.patients.length ? (
            <label>
              <span className="sr-only">Pessoa assistida</span>
              <select
                aria-label="Pessoa assistida"
                value={patientId}
                onChange={(event) => {
                  if (context.activeContext?.mode === "patient")
                    void selectProfile(event.target.value);
                  else setPatientId(event.target.value);
                  const url = new URL(window.location.href);
                  url.searchParams.set("careRecipientId", event.target.value);
                  window.history.replaceState(null, "", url);
                }}
              >
                <option value="" disabled>
                  Selecione um paciente
                </option>
                {context.patients
                  .filter(
                    (item) =>
                      context.activeContext?.mode !== "patient" ||
                      item.hasMembership,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                      {item.is_active === false ? " (inativo)" : ""}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <span className="text-sm text-(--muted)">Home Care Assistant</span>
          )}
        </div>
        {value ? <NotificationBell patientId={patient?.id} /> : null}
        <details className="profile-menu" ref={profileMenuRef}>
          <summary aria-label="Menu do usuário">
            <span className="avatar">
              {context?.avatarUrl ? (
                <Image
                  src={context.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full rounded-full object-cover"
                  unoptimized
                />
              ) : (
                context?.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("") || <Icon name="user" />
              )}
            </span>
            <span className="profile-name">{context?.fullName}</span>
            <Icon name="chevron" width="14" />
          </summary>
          <div className="header-popover">
            <p className="font-semibold">{context?.fullName}</p>
            <p className="mb-3 text-xs text-(--muted)">
              {value?.activeContext?.mode === "global"
                ? "Administração global"
                : patient?.role}
            </p>
            <Link href="/perfil">Meu perfil e segurança</Link>
            <button
              type="button"
              className="ui-button ui-button-secondary"
              onClick={() => {
                profileMenuRef.current?.removeAttribute("open");
                setProfileOpen(true);
              }}
            >
              Mudar perfil
            </button>
            <Link href="/notificacoes">Preferências e notificações</Link>
            {canAdminister ? (
              <Link href="/configuracoes">Configurações do paciente</Link>
            ) : null}
            <LogoutButton />
          </div>
        </details>
      </header>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="navigation-backdrop"
            aria-label="Fechar navegação"
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <aside
            id="workspace-drawer"
            ref={drawerRef}
            className="app-sidebar print:hidden"
            aria-label="Menu do aplicativo"
          >
            <div className="sidebar-heading">
              <span>Seu espaço de cuidado</span>
              <button
                type="button"
                className="ui-icon-button"
                aria-label="Fechar menu"
                onClick={closeDrawer}
              >
                <Icon name="close" />
              </button>
            </div>
            <WorkspaceNavigation
              context={value}
              close={() => {
                if (window.matchMedia("(max-width: 1023px)").matches)
                  setMenuOpen(false);
              }}
            />
          </aside>
        </>
      ) : null}
      <main id="workspace-content" className="workspace-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {patient?.display_name ?? "Home Care Assistant"}
            </p>
            <h1>{title}</h1>
          </div>
          {patient ? (
            <span className="context-tag">
              {value?.activeContext?.mode === "global"
                ? "Administrador global"
                : {
                    admin: "Administrador",
                    family: "Família",
                    supervisor: "Supervisão",
                    professional: "Equipe",
                    reader: "Consulta",
                  }[patient.role]}
            </span>
          ) : null}
        </div>
        {loading ? (
          <Notice>Validando sessão e pacientes autorizados…</Notice>
        ) : null}
        {error ? (
          <Notice error>
            <p>{error}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className={buttonClass}
                type="button"
                onClick={() => void load()}
              >
                Tentar novamente
              </button>
              <Link className={buttonClass} href="/login">
                Entrar novamente
              </Link>
            </div>
          </Notice>
        ) : null}
        {value?.activeContext?.mode === "global" &&
        !value.globalAdministrationAllowed ? (
          <Notice>
            Confirme seu autenticador para administrar.{" "}
            <Link
              className="font-semibold underline"
              href="/perfil?mfa=required"
            >
              Verificar autenticação em duas etapas
            </Link>
          </Notice>
        ) : null}
        {value && (profileOpen || !value.activeContext || documentMismatch) ? (
          <section className="ui-card mb-4" aria-label="Mudar perfil">
            <h2 className="text-lg font-semibold">Escolha como deseja atuar</h2>
            {context?.documentContext ? (
              <p className="my-3 text-sm font-semibold">
                Este documento pertence a {context.documentContext.displayName}.
                Selecione seu vínculo para continuar no documento recebido.
              </p>
            ) : null}
            {!context?.documentContext && requestedPatientId ? (
              <p className="my-3 text-sm">
                Selecione explicitamente o vínculo com o paciente indicado neste
                aviso. O link preserva a tarefa e não concede permissões.
              </p>
            ) : null}
            <p className="mb-4 text-sm text-(--muted)">
              O perfil escolhido vale para esta sessão. A administração global
              propõe alterações; fichas e estoque usam seu vínculo no paciente.
            </p>
            <div className="flex flex-wrap gap-3">
              {value.isGlobalAdmin ? (
                <button
                  className={buttonClass}
                  type="button"
                  disabled={selecting}
                  onClick={() => void selectProfile(null)}
                >
                  Administração global
                </button>
              ) : null}
              {value.patients
                .filter((item) => item.hasMembership)
                .map((item) => (
                  <button
                    key={item.id}
                    className={buttonClass}
                    type="button"
                    disabled={selecting}
                    onClick={() => void selectProfile(item.id)}
                  >
                    {item.display_name} ·{" "}
                    {{
                      admin: "Administrador do paciente",
                      family: "Familiar",
                      supervisor: "Supervisor",
                      professional: "Profissional",
                      reader: "Leitor",
                    }[item.role] ?? item.role}
                  </button>
                ))}
              {profileOpen && value.activeContext ? (
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setProfileOpen(false)}
                >
                  Voltar
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
        {!error && value?.activeContext && !documentMismatch ? (
          !patient && !value.isGlobalAdmin ? (
            <Notice>
              Nenhum paciente autorizado está vinculado à sua conta. Solicite
              acesso a um administrador.
            </Notice>
          ) : administration && !canAdminister ? (
            <Notice error>
              Seu vínculo não permite administrar este paciente.
            </Notice>
          ) : (
            <div
              key={(patient?.id ?? "global") + ":" + value.activeContext.mode}
            >
              {patient?.is_active === false ? (
                <Notice>
                  Paciente inativo. O histórico permanece disponível; novas
                  operações estão suspensas.
                </Notice>
              ) : null}
              {children(value)}
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}
