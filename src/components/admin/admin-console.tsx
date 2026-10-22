"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  api,
  buttonClass,
  inputClass,
  may,
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
  Check,
  RoleSelect,
  roles,
  text,
  bool,
  type Row,
} from "./admin-fields";
import { AlertSettings } from "./alert-settings";

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
    <Workspace title="Administração" administration>
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
  const params = useSearchParams();
  const requestedSection = params.get("section") as Section | null;
  const [section, setSection] = useState<Section>(
    requestedSection && Object.hasOwn(labels, requestedSection)
      ? requestedSection
      : "patient",
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [directory, setDirectory] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [importText, setImportText] = useState("");
  const [importReviewed, setImportReviewed] = useState(false);
  const patientId = context.patient?.id;
  const canManage = context.isGlobalAdmin || may(context, "manage");
  const load = useCallback(
    (signal?: AbortSignal) => {
      if (["patient", "import"].includes(section)) return Promise.resolve();
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
              section === "memberships" && context.isGlobalAdmin
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
    [section, patientId, context.isGlobalAdmin, page],
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
          ? "Proposta registrada. A segunda pessoa administradora deve aprovar em Funções, permissões e regras."
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
  if (!canManage)
    return <Notice error>Selecione um paciente que você administra.</Notice>;
  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        {context.isGlobalAdmin
          ? "Administração global e por paciente."
          : "Todas as alterações desta área se limitam ao paciente selecionado."}
      </p>
      <div className="ui-card">
        <label className="text-sm font-semibold">
          Seção administrativa
          <select
            className={inputClass}
            value={section}
            onChange={(event) => {
              const key = event.target.value as Section;
              setSection(key);
              setPage(1);
              setRows([]);
              setLoading(!["patient", "import"].includes(key));
              setEditing(null);
              setError("");
              setMessage("");
            }}
          >
            {(Object.keys(labels) as Section[])
              .filter((key) => key !== "profiles" || context.isGlobalAdmin)
              .filter(
                (key) =>
                  Boolean(patientId) || key === "patient" || key === "profiles",
              )
              .map((key) => (
                <option key={key} value={key}>
                  {labels[key]}
                </option>
              ))}
          </select>
        </label>
        {section === "catalog" ? (
          <Link className={buttonClass + " mt-3"} href="/unidades">
            Unidades e apresentações / scanner
          </Link>
        ) : null}
        {section === "memberships" ? (
          <Link className={buttonClass + " mt-3"} href="/configuracoes">
            Permissões e alterações com dupla aprovação
          </Link>
        ) : null}
      </div>
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
      {loading && <Notice>Carregando {labels[section].toLowerCase()}…</Notice>}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {section === "patient" && (
          <section className={panelClass}>
            <h2 className="mb-4 text-lg font-semibold">Cadastro do paciente</h2>
            <form
              key={editing ? "new" : (patientId ?? "none")}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) =>
                handle(
                  event,
                  (data) => ({
                    action: "recipient",
                    id: editing ? null : (patientId ?? null),
                    displayName: data.get("displayName"),
                    isActive: data.has("isActive"),
                    isDevelopment: context.isGlobalAdmin
                      ? data.has("isDevelopment")
                      : context.patient?.is_development === true,
                  }),
                  "Paciente salvo.",
                  true,
                )
              }
            >
              <Field
                name="displayName"
                label="Nome de exibição"
                value={editing ? "" : (context.patient?.display_name ?? "")}
                required
              />
              <div>
                <Check
                  name="isActive"
                  label="Paciente ativo"
                  checked={
                    editing ? true : context.patient?.is_active !== false
                  }
                />
                {context.isGlobalAdmin && (
                  <Check
                    name="isDevelopment"
                    label="Cadastro de desenvolvimento"
                    checked={bool(
                      (context.patient as unknown as Row) ?? {},
                      "is_development",
                    )}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button className={primaryClass} type="submit">
                  {editing || !patientId ? "Criar paciente" : "Salvar paciente"}
                </button>
                {context.isGlobalAdmin && patientId && (
                  <button
                    className={buttonClass}
                    type="button"
                    onClick={() => setEditing(editing ? null : {})}
                  >
                    {editing ? "Editar atual" : "Novo paciente"}
                  </button>
                )}
              </div>
            </form>
          </section>
        )}
        {section === "catalog" && (
          <>
            <section className={panelClass}>
              <h2 className="mb-4 text-lg font-semibold">
                {editing
                  ? "Editar item"
                  : "Adicionar item exclusivo deste paciente"}
              </h2>
              <form
                key={editing ? text(editing, "id") : "new"}
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) =>
                  handle(event, (data) => ({
                    action: "product",
                    id: editing ? text(editing, "id") : null,
                    name: data.get("name"),
                    category: data.get("category"),
                    unit: data.get("unit"),
                    description: data.get("description"),
                    aliases: String(data.get("aliases") ?? "")
                      .split(",")
                      .map((alias) => alias.trim())
                      .filter(Boolean),
                    sortOrder: Number(data.get("sortOrder")),
                    isActive: data.has("isActive"),
                  }))
                }
              >
                <Field
                  name="name"
                  label="Nome"
                  value={editing ? text(editing, "name") : ""}
                  required
                />
                <label className="text-sm font-semibold">
                  Categoria
                  <select
                    name="category"
                    defaultValue={
                      editing ? text(editing, "category") : "medicamentos"
                    }
                    className={inputClass}
                  >
                    <option value="medicamentos">Medicamentos</option>
                    <option value="higiene">Higiene</option>
                    <option value="dieta">Dieta</option>
                  </select>
                </label>
                <Field
                  name="unit"
                  label="Unidade"
                  value={editing ? text(editing, "unit") : "unidade"}
                  required
                />
                <Field
                  name="aliases"
                  label="Nomes alternativos, separados por vírgula"
                  value={
                    editing && Array.isArray(editing.aliases)
                      ? editing.aliases.join(", ")
                      : ""
                  }
                />
                <Field
                  name="description"
                  label="Descrição operacional"
                  value={editing ? text(editing, "description") : ""}
                />
                <Field
                  name="sortOrder"
                  label="Ordem"
                  type="number"
                  value={editing ? Number(editing.sort_order ?? 0) : 0}
                />
                <Check
                  name="isActive"
                  label="Item ativo"
                  checked={
                    editing
                      ? bool(
                          editing,
                          "is_active",
                          bool(editing, "active", true),
                        )
                      : true
                  }
                />
                <div className="flex gap-3">
                  <button type="submit" className={primaryClass}>
                    Salvar item
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setEditing(null)}
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
              <p className="mt-3 text-xs text-(--muted)">
                A unidade de itens com histórico só pode ser alterada criando um
                novo item.
              </p>
            </section>
            <section className={panelClass}>
              <h2 className="font-bold">
                Catálogo do paciente ({rows.length})
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <article
                    key={text(row, "id")}
                    className="rounded-lg border border-(--line) p-3"
                  >
                    <h3 className="font-semibold">{text(row, "name")}</h3>
                    <p className="mt-1 text-sm text-(--muted)">
                      {text(row, "category")} · {text(row, "unit")} ·{" "}
                      {bool(row, "is_active", bool(row, "active", true))
                        ? "Ativo"
                        : "Inativo"}
                    </p>
                    <button
                      className={`${buttonClass} mt-3`}
                      onClick={() => setEditing(row)}
                    >
                      Editar {text(row, "name")}
                    </button>
                  </article>
                ))}
              </div>
              {!loading && rows.length === 0 && (
                <p className="mt-3 text-sm">
                  O catálogo está vazio. Adicione um item ou adote um modelo.
                </p>
              )}
            </section>
            <section className={panelClass}>
              <h2 className="font-bold">Adotar modelo existente</h2>
              <p className="mt-2 text-sm">
                A cópia será editável apenas neste paciente.
              </p>
              <form
                className="mt-3 flex flex-wrap items-end gap-3"
                onSubmit={(event) =>
                  handle(
                    event,
                    (data) => ({
                      action: "adoptProduct",
                      productId: data.get("productId"),
                    }),
                    "Modelo adicionado ao catálogo deste paciente.",
                  )
                }
              >
                <label className="text-sm font-semibold">
                  Produto modelo
                  <select name="productId" className={inputClass} required>
                    <option value="">Selecione</option>
                    {templates.map((row) => (
                      <option key={text(row, "id")} value={text(row, "id")}>
                        {text(row, "name")} · {text(row, "unit")}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={primaryClass}>
                  Adotar modelo
                </button>
              </form>
            </section>
          </>
        )}
        {section === "memberships" && (
          <>
            <section className={panelClass}>
              <h2 className="mb-4 font-bold">
                {editing ? "Editar vínculo" : "Vincular conta existente"}
              </h2>
              <form
                key={editing ? text(editing, "user_id") : "new"}
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) =>
                  handle(event, (data) => ({
                    action: "membership",
                    userId: data.get("userId"),
                    role: data.get("role"),
                    canManageStock: data.get("role") === "admin",
                    canCountStock: false,
                  }))
                }
              >
                <label className="text-sm font-semibold">
                  Conta vinculada
                  <select
                    name="userId"
                    defaultValue={editing ? text(editing, "user_id") : ""}
                    required
                    className={inputClass}
                  >
                    <option value="">Selecione uma conta</option>
                    {directory.map((person) => (
                      <option
                        key={text(person, "user_id") || text(person, "id")}
                        value={text(person, "user_id") || text(person, "id")}
                      >
                        {text(person, "full_name")}
                      </option>
                    ))}
                  </select>
                </label>
                <RoleSelect
                  value={editing ? text(editing, "role") : "professional"}
                />
                <p className="text-xs leading-5 text-(--muted)">
                  As permissões de contagem e estoque são configuradas em
                  Funções, permissões e regras.
                </p>
                <div className="flex gap-3">
                  <button className={primaryClass} type="submit">
                    Salvar vínculo
                  </button>
                  {editing && (
                    <button
                      className={buttonClass}
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
              <p className="mt-3 text-xs text-(--muted)">
                Para convidar alguém pelo e-mail, use Convites. Revogar o
                vínculo afeta somente este paciente.
              </p>
            </section>
            <section className={panelClass}>
              <h2 className="font-bold">Vínculos deste paciente</h2>
              <ul className="mt-4 space-y-3">
                {rows.map((row) => (
                  <li
                    key={text(row, "id") || text(row, "user_id")}
                    className="flex flex-wrap justify-between gap-3 rounded-lg border border-(--line) p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {(row.profiles as { full_name?: string } | null)
                          ?.full_name ?? text(row, "user_id")}
                      </p>
                      <p className="text-sm">
                        {roles[text(row, "role") as keyof typeof roles] ??
                          text(row, "role")}{" "}
                        ·{" "}
                        {text(row, "status") === "revoked"
                          ? "Revogado"
                          : "Ativo"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        onClick={() => setEditing(row)}
                      >
                        Editar vínculo
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() =>
                          void execute(
                            {
                              action: "membershipStatus",
                              userId: row.user_id,
                              status:
                                row.status === "revoked" ? "active" : "revoked",
                            },
                            "Estado do vínculo atualizado.",
                            true,
                          )
                        }
                      >
                        {row.status === "revoked" ? "Reativar" : "Revogar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
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
              isGlobalAdmin={context.isGlobalAdmin}
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
        {section === "profiles" && context.isGlobalAdmin && (
          <section className={panelClass}>
            <h2 className="font-bold">Identidades globais</h2>
            <p className="mt-2 text-sm">
              Estas alterações atingem a conta inteira. O banco protege o último
              administrador global ativo.
            </p>
            <ul className="mt-4 space-y-4">
              {rows.map((row) => (
                <li
                  key={text(row, "id")}
                  className="rounded-lg border border-(--line) p-4"
                >
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(event) =>
                      handle(
                        event,
                        (data) => ({
                          action: "profile",
                          userId: row.id,
                          fullName: data.get("fullName"),
                          role: data.get("role"),
                          status: data.has("isActive") ? "active" : "revoked",
                          globalScope: data.has("globalScope"),
                        }),
                        "Conta global atualizada.",
                        true,
                      )
                    }
                  >
                    <Field
                      name="fullName"
                      label="Nome da conta"
                      value={text(row, "full_name")}
                      required
                    />
                    <label className="text-sm font-semibold">
                      Papel global
                      <select
                        name="role"
                        className={inputClass}
                        defaultValue={text(row, "role")}
                      >
                        {Object.keys(roles)
                          .filter((role) => role !== "family")
                          .map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Check
                      name="isActive"
                      label="Conta ativa"
                      checked={text(row, "status") === "active"}
                    />
                    <Check
                      name="globalScope"
                      label="Privilégio global"
                      checked={bool(row, "global_scope")}
                    />
                    <button className={primaryClass} type="submit">
                      Salvar conta global
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </fieldset>
      {busy && <Notice>Salvando operação… Aguarde a confirmação.</Notice>}
    </div>
  );
}
