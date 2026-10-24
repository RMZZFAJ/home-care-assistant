"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  api,
  buttonClass,
  inputClass,
  Notice,
  panelClass,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import {
  NotificationSettings,
  NotificationQueue,
} from "./notification-settings";
import { formatBrazilDate } from "@/lib/receipt";
import {
  Field,
  RoleSelect,
  text,
  type Row,
} from "./admin-fields";
import { AlertSettings } from "./alert-settings";
import { PatientRegistration } from "./patient-registration";
import { AdministrationNavigation, administrationAreas } from "./administration-navigation";
import { CatalogueManagement } from "./catalogue-management";
import { MembershipManagement } from "./membership-management";
import { GlobalAccounts } from "./global-accounts";

type Section =
  | "patient"
  | "catalog"
  | "memberships"
  | "invitations"
  | "alerts"
  | "audit"
  | "import"
  | "profiles"
  | "notificationRecipients"
  | "notifications";
const labels: Record<Section, string> = {
  patient: "Paciente",
  catalog: "Catálogo",
  memberships: "Vínculos",
  invitations: "Convites",
  alerts: "Alertas",
  audit: "Auditoria",
  import: "Importação histórica",
  profiles: "Contas globais",
  notificationRecipients: "Destinatários",
  notifications: "Notificações",
};
export function AdminConsole() {
  const params = useSearchParams();
  return (
    <Workspace title="Administração" administration administrationCapabilities={["access.manage", "catalog.manage", "audit.read"]}>
      {(context) => (
        <PatientAdmin
          key={(context.patient?.id ?? "global") + params.toString()}
          context={context}
        />
      )}
    </Workspace>
  );
}

function PatientAdmin({ context }: { context: WorkspaceContext }) {
  const globalMode =
    context.activeContext?.mode === "global" &&
    context.globalAdministrationAllowed === true;
  const params = useSearchParams();
  const requestedSection = params.get("section") as Section | null;
  const section =
    requestedSection && Object.hasOwn(labels, requestedSection)
      ? requestedSection
      : "overview";
  const allowed = section === "overview" || administrationAreas(context).some((area) => area.section === section);
  const [rows, setRows] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [directory, setDirectory] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [loading, setLoading] = useState(!["patient", "import", "overview"].includes(section));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [importText, setImportText] = useState("");
  const [importReviewed, setImportReviewed] = useState(false);
  const patientId = context.patient?.id;
  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!allowed || ["patient", "import", "overview"].includes(section)) return Promise.resolve();
      const query = new URLSearchParams({ section });
      if (patientId) query.set("careRecipientId", patientId);
      return Promise.all([
        api<{ data: Row[]; total?: number }>(
          section === "notifications"
            ? `/api/admin/notifications?careRecipientId=${patientId}&page=${page}&pageSize=20`
            : `/api/admin?${query}`,
          undefined,
          signal,
        ),
        section === "catalog"
          ? api<{ data: Row[] }>(
              `/api/admin?section=products&careRecipientId=${patientId}`,
              undefined,
              signal,
            )
          : Promise.resolve({ data: [] as Row[] }),
        ["memberships", "notificationRecipients"].includes(section)
          ? api<{ data: Row[] }>(
              section === "memberships" && globalMode
                ? "/api/admin?section=profiles"
                : `/api/admin?section=memberships&careRecipientId=${patientId}`,
              undefined,
              signal,
            )
          : Promise.resolve({ data: [] as Row[] }),
        section === "alerts"
          ? api<{ data: Row[] }>(
              `/api/catalog?careRecipientId=${patientId}&includeInactive=true`,
              undefined,
              signal,
            )
          : Promise.resolve({ data: [] as Row[] }),
      ]).then(
        ([result, models, people, products]) => {
          if (signal?.aborted) return;
          setRows(result.data ?? []);
          setNotificationTotal(result.total ?? 0);
          setDirectory(people.data);
          setCatalog(products.data);
          if (section === "catalog") setTemplates(models.data);
          setLoading(false);
        },
        (reason) => {
          if (!signal?.aborted) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível carregar a seção.",
            );
            setLoading(false);
          }
        },
      );
    },
    [section, patientId, globalMode, page, allowed],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function execute(
    payload: Row,
    success: string,
    refreshContext = false,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    setInvitationUrl("");
    try {
      const isNotification = ["retry", "process"].includes(
        String(payload.action),
      );
      const scoped = ![
        "profile",
        "recipient",
        "historicalImport",
        "process",
      ].includes(String(payload.action));
      const result = await api<{
        data?: unknown;
        invitationUrl?: string;
        pendingApproval?: boolean;
      }>(isNotification ? "/api/admin/notifications" : "/api/admin", {
        ...(scoped ? { careRecipientId: patientId } : {}),
        ...payload,
      });
      setMessage(
        result.pendingApproval
          ? "Proposta global registrada. Um administrador local distinto deve aprovar em Permissões, comunicação e regras."
          : success,
      );
      setEditing(null);
      if (result.invitationUrl) setInvitationUrl(result.invitationUrl);
      if (payload.action === "historicalImport") setReport(result.data);
      if (refreshContext) await context.refresh();
      await load();
      return result;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível salvar.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  function handle(
    event: FormEvent<HTMLFormElement>,
    makePayload: (data: FormData) => Row,
    success = "Alteração salva e auditada.",
    refresh = false,
  ) {
    event.preventDefault();
    void execute(
      makePayload(new FormData(event.currentTarget)),
      success,
      refresh,
    );
  }
  if (!allowed)
    return <Notice error>Seu vínculo não autoriza esta área administrativa.</Notice>;
  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        {globalMode
          ? "Administração global e por paciente."
          : "Todas as alterações desta área se limitam ao paciente selecionado."}
      </p>
      <AdministrationNavigation context={context} section={section === "overview" ? null : section} />
      {section === "catalog" ? <Link className={buttonClass} href="/unidades">Unidades e apresentações / scanner</Link> : null}
      {section === "memberships" ? <Link className={buttonClass} href="/configuracoes?area=people">Permissões e alterações com dupla aprovação</Link> : null}
      {error && (
        <Notice error>
          {error}
          <button className={`${buttonClass} ml-3`} onClick={() => void load()}>
            Recarregar
          </button>
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
      {invitationUrl && (
        <section className={panelClass}>
          <h2 className="font-bold">Link de convite</h2>
          <p className="mt-2 text-sm">
            Copie e compartilhe este link com a pessoa convidada. Nenhum e-mail
            foi enviado automaticamente.
          </p>
          <label className="mt-3 block text-sm">
            Link
            <input
              readOnly
              value={invitationUrl}
              className={inputClass}
              onFocus={(event) => event.target.select()}
            />
          </label>
        </section>
      )}
      {loading && section !== "overview" && <Notice>Carregando {labels[section].toLowerCase()}…</Notice>}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {section === "patient" && (
          <PatientRegistration
            patient={context.patient}
            globalMode={globalMode}
            creating={Boolean(editing)}
            onToggle={() => setEditing(editing ? null : {})}
            handle={handle}
          />
        )}
        {section === "catalog" ? <CatalogueManagement rows={rows} templates={templates} save={execute} busy={busy} error={error} loading={loading} /> : null}
        {section === "memberships" ? <MembershipManagement rows={rows} directory={directory} save={execute} busy={busy} error={error} /> : null}
        {section === "invitations" && (
          <>
            <section className={panelClass}>
              <h2 className="mb-4 font-bold">Convidar para este paciente</h2>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) =>
                  handle(
                    event,
                    (data) => ({
                      action: "invitation",
                      email: data.get("email"),
                      role: data.get("role"),
                      canManageStock: data.get("role") === "admin",
                      canCountStock: false,
                    }),
                    "Convite criado. Compartilhe o link exibido abaixo.",
                  )
                }
              >
                <Field
                  name="email"
                  label="E-mail do convidado"
                  type="email"
                  required
                />
                <RoleSelect />
                <p className="text-xs leading-5 text-(--muted)">
                  As capacidades efetivas seguem a função e as regras deste
                  paciente.
                </p>
                <button className={primaryClass} type="submit">
                  Criar convite
                </button>
              </form>
            </section>
            <section className={panelClass}>
              <h2 className="font-bold">Convites</h2>
              <ul className="mt-3 space-y-3">
                {rows.map((row) => (
                  <li
                    key={text(row, "id")}
                    className="rounded-lg border border-(--line) p-3"
                  >
                    <p className="font-semibold">{text(row, "email")}</p>
                    <p className="mt-1 text-sm">
                      {text(row, "status")} · expira{" "}
                      {row.expires_at
                        ? formatBrazilDate(text(row, "expires_at"))
                        : "conforme configuração"}
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        className={buttonClass}
                        onClick={() =>
                          void execute(
                            {
                              action: "resendInvitation",
                              invitationId: row.id,
                            },
                            "Novo link de convite gerado.",
                          )
                        }
                      >
                        Reemitir link
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() =>
                          void execute(
                            {
                              action: "revokeInvitation",
                              invitationId: row.id,
                            },
                            "Convite revogado.",
                          )
                        }
                      >
                        Revogar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {!loading && rows.length === 0 && (
                <p className="mt-3 text-sm">Nenhum convite.</p>
              )}
            </section>
          </>
        )}
        {section === "notificationRecipients" && (
          <NotificationSettings
            rows={rows}
            members={directory}
            save={execute}
          />
        )}
        {section === "notifications" && (
          <>
            <NotificationQueue
              rows={rows}
              execute={execute}
              isGlobalAdmin={globalMode}
            />
            {notificationTotal > 20 && (
              <nav
                aria-label="Páginas das notificações"
                className="flex items-center justify-between"
              >
                <button
                  className={buttonClass}
                  disabled={loading || page <= 1}
                  onClick={() => {
                    setLoading(true);
                    setPage((value) => value - 1);
                  }}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {Math.ceil(notificationTotal / 20)}
                </span>
                <button
                  className={buttonClass}
                  disabled={loading || page * 20 >= notificationTotal}
                  onClick={() => {
                    setLoading(true);
                    setPage((value) => value + 1);
                  }}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
        {section === "alerts" && (
          <AlertSettings rows={rows} products={catalog} handle={handle} />
        )}
        {section === "audit" && (
          <section className={panelClass}>
            <h2 className="font-bold">Eventos de auditoria deste contexto</h2>
            <ul className="mt-4 space-y-3">
              {rows.map((row) => (
                <li
                  key={text(row, "id")}
                  className="rounded border border-(--line) p-3 text-sm"
                >
                  <p className="font-semibold">{text(row, "action")}</p>
                  <p>
                    {row.created_at
                      ? formatBrazilDate(text(row, "created_at"))
                      : "Data não informada"}{" "}
                    · {text(row, "entity_type")}
                  </p>
                  <p className="break-all text-xs text-(--muted)">
                    Ator: {text(row, "actor_id") || "Sistema"} · Referência:{" "}
                    {text(row, "entity_id")}
                  </p>
                </li>
              ))}
            </ul>
            {!loading && rows.length === 0 && (
              <p className="mt-3 text-sm">Nenhum evento encontrado.</p>
            )}
          </section>
        )}
        {section === "import" && (
          <section className={panelClass}>
            <h2 className="font-bold">Importar protocolos físicos 1–11</h2>
            <p className="mt-2 text-sm">
              Cole um lote JSON revisado com origem comprovada. Datas,
              solicitantes e estados desconhecidos devem permanecer ausentes. A
              pré-validação não grava registros.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Lote JSON
              <textarea
                rows={12}
                value={importText}
                onChange={(event) => {
                  setImportText(event.target.value);
                  setImportReviewed(false);
                  setReport(null);
                }}
                className={inputClass}
                placeholder='[{"physicalProtocol":1,"careRecipientId":"…","lines":[{"productId":"…","currentStock":0,"urgent":false}]}]'
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className={buttonClass}
                type="button"
                onClick={() => {
                  try {
                    const parsed: unknown = JSON.parse(importText);
                    if (!Array.isArray(parsed))
                      throw new Error("O lote precisa ser uma lista.");
                    void execute(
                      {
                        action: "historicalImport",
                        preview: true,
                        rows: parsed,
                      },
                      "Pré-validação concluída.",
                    ).then((result) => setImportReviewed(Boolean(result)));
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "JSON inválido.",
                    );
                  }
                }}
              >
                Pré-validar lote
              </button>
              <button
                disabled={!importReviewed}
                className={primaryClass}
                type="button"
                onClick={() => {
                  try {
                    void execute(
                      {
                        action: "historicalImport",
                        rows: JSON.parse(importText),
                        preview: false,
                      },
                      "Importação processada. Revise o relatório por registro.",
                    );
                  } catch {
                    setError("Lote JSON inválido.");
                  }
                }}
              >
                Confirmar importação revisada
              </button>
            </div>
            {report != null && (
              <pre className="mt-4 max-h-96 overflow-auto rounded bg-slate-50 p-3 text-xs">
                {JSON.stringify(report, null, 2)}
              </pre>
            )}
          </section>
        )}
        {section === "profiles" && globalMode ? <GlobalAccounts rows={rows} save={execute} busy={busy} error={error} /> : null}
      </fieldset>
      {busy && <Notice>Salvando operação… Aguarde a confirmação.</Notice>}
    </div>
  );
}
