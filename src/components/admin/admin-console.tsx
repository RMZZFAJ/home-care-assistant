"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { ApiError } from "@/lib/client/api";
import { governanceCommandConfirmed } from "@/lib/validation/governance";
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
import { Field, RoleSelect, text, type Row } from "./admin-fields";
import { AlertSettings } from "./alert-settings";
import { PatientRegistration } from "./patient-registration";
import {
  AdministrationNavigation,
  administrationAreas,
} from "./administration-navigation";
import { CatalogueManagement } from "./catalogue-management";
import { MembershipManagement } from "./membership-management";
import { GlobalAccounts } from "./global-accounts";
import { AuditHistory } from "./audit-history";
import { useLiveRevision } from "@/lib/use-live-revision";
import { OperationsConsole } from "./operations-console";

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
  | "notifications"
  | "operations";
type AdministrativeResult = { data?: unknown; invitationUrl?: string; pendingApproval?: boolean };
type AdministrativeIntent = { payload: Row; success: string; refreshContext: boolean };
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
  operations: "Monitoramento e suporte",
};
export function AdminConsole() {
  const params = useSearchParams();
  return (
    <Workspace
      title="Administração"
      administration
      administrationCapabilities={[
        "access.manage",
        "catalog.manage",
        "audit.read",
      ]}
      administrationReadRecovery={params.get("section") === "catalog"}
    >
      {(context) => (
        <PatientAdmin
          key={(context.patient?.id ?? "global") + ":" + (params.get("section") ?? "overview")}
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
  const allowed =
    section === "overview" ||
    administrationAreas(context).some((area) => area.section === section);
  const [rows, setRows] = useState<Row[]>([]);
  const [directory, setDirectory] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [loading, setLoading] = useState(
    !["patient", "import", "overview", "audit", "operations"].includes(section),
  );
  const command = useCommandIntent<Row, AdministrativeResult>(governanceCommandConfirmed);
  const intentRef = useRef<AdministrativeIntent | null>(null);
  const loadSequenceRef = useRef(0);
  const versionRef = useRef<number | null>(null);
  const [versionAttempt, setVersionAttempt] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [confirmationRevision, setConfirmationRevision] = useState(0);
  const [localBusy, setLocalBusy] = useState(false);
  const busy = localBusy || command.busy || command.uncertain || conflict;
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [readDenied, setReadDenied] = useState(false);
  const live = useLiveRevision(), queueRevision = section === "notifications" ? live : 0;
  const [queueReadRevision,setQueueReadRevision]=useState(-1);
  const queueRefreshing=section==="notifications"&&queueReadRevision!==queueRevision;
  const [message, setMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [importText, setImportText] = useState("");
  const [importReviewed, setImportReviewed] = useState(false);
  const patientId = context.patient?.id;
  useEffect(() => {
    if (!globalMode || !patientId) return;
    const controller = new AbortController();
    void api<{ data: { version: number } }>("/api/patient-settings?careRecipientId=" + patientId, undefined, controller.signal).then(result => {
      if (!controller.signal.aborted) { versionRef.current = result.data.version; setConflict(false); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a versão administrativa."); });
    return () => controller.abort();
  }, [globalMode, patientId, versionAttempt]);
  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!allowed || ["patient", "import", "overview", "audit", "operations"].includes(section))
        return Promise.resolve();
      const sequence = ++loadSequenceRef.current;
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
        ([result, people, products]) => {
          if (signal?.aborted || sequence !== loadSequenceRef.current) return;
          setRows(result.data ?? []);
          setNotificationTotal(result.total ?? 0);
          setDirectory(people.data);
          setCatalog(products.data);
          setLoading(false);
          setReadError("");
          setReadDenied(false);
          setQueueReadRevision(queueRevision);
        },
        (reason) => {
          if (!signal?.aborted && sequence === loadSequenceRef.current) {
            setReadError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível carregar a seção.",
            );
            setLoading(false);
            setReadDenied(reason instanceof ApiError && [401,403,404,409].includes(reason.status));
            setQueueReadRevision(queueRevision);
          }
        },
      );
    },
    [section, patientId, globalMode, page, allowed,queueRevision],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, queueRevision]);
  async function confirmed(result: AdministrativeResult, packet: AdministrativeIntent) {
    setMessage(result.pendingApproval ? "Proposta global registrada. Um administrador local distinto deve aprovar em Permissões, comunicação e regras." : packet.success);
    setEditing(null);
    setConfirmationRevision(value => value + 1);
    if (result.invitationUrl) setInvitationUrl(result.invitationUrl);
    if (packet.payload.action === "historicalImport") setReport(result.data);
    intentRef.current = null;
    // A failing read after this point cannot make the completed command uncertain.
    try { if (packet.refreshContext) await context.refresh(); await load(); setVersionAttempt(value => value + 1); }
    catch (reason) { setError("A ação foi confirmada. A consulta posterior falhou: " + (reason instanceof Error ? reason.message : "Atualize esta seção.")); }
    return result;
  }
  function failed(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 409 && globalMode) setConflict(true);
    setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração.");
    return null;
  }
  async function execute(
    payload: Row,
    success: string,
    refreshContext = false,
  ) {
    if (busy) return null;
    setLocalBusy(true);
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
      const globalProposal = globalMode && ["membership", "product", "adoptProduct", "membershipStatus", "alertRule", "notificationRecipient", "recipient"].includes(String(payload.action)) && (payload.action !== "recipient" || Boolean(payload.id));
      if (globalProposal && versionRef.current === null) throw new Error("Consulte a versão administrativa antes de preparar esta proposta.");
      const packet: AdministrativeIntent = { payload, success, refreshContext };
      if (globalProposal) intentRef.current = packet;
      const body = {
        ...(scoped ? { careRecipientId: patientId } : {}),
        ...payload,
        ...(globalProposal ? { idempotencyKey: crypto.randomUUID(), expectedVersion: versionRef.current } : {}),
      };
      const url = isNotification ? "/api/admin/notifications" : "/api/admin";
      const result = globalProposal ? await command.send(url, body) : await api<AdministrativeResult>(url, body);
      return await confirmed(result, packet);
    } catch (reason) {
      return failed(reason);
    } finally {
      setLocalBusy(false);
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
  if (!allowed && section !== "catalog")
    return (
      <Notice error>Seu vínculo não autoriza esta área administrativa.</Notice>
    );
  const recovery = command.uncertain ? <Notice error>O resultado da alteração é incerto. Recupere a mesma tentativa antes de enviar outra. <button className={buttonClass} disabled={command.busy} onClick={async () => { setError(""); try { const result = await command.recover(); if (intentRef.current) await confirmed(result, intentRef.current); } catch (reason) { failed(reason); } }}>Recuperar mesma alteração administrativa</button></Notice>
    : conflict ? <Notice error>A versão ou a intenção mudou. Seus campos foram preservados; nenhuma nova proposta foi enviada. <button className={buttonClass} onClick={() => { versionRef.current = null; setVersionAttempt(value => value + 1); setError(""); }}>Revisar versão administrativa vigente</button></Notice> : null;
  return (
    <div className="space-y-5">
      {!allowed ? (
        <Notice error>
          Seu vínculo não permite novas mudanças no catálogo. Uma intenção
          própria já confirmada pode ser recuperada enquanto a leitura
          permanecer autorizada.
        </Notice>
      ) : null}
      <p className="text-sm text-(--muted)">
        {globalMode
          ? "Administração global e por paciente."
          : "Todas as alterações desta área se limitam ao paciente selecionado."}
      </p>
      <AdministrationNavigation
        context={context}
        section={section === "overview" ? null : section}
      />
      {section === "catalog" && allowed ? (
        <Link className={buttonClass} href="/unidades">
          Unidades e apresentações / scanner
        </Link>
      ) : null}
      {section === "catalog" && patientId ? (
        <Link className={buttonClass} href={"/comprovantes-catalogo?" + new URLSearchParams({
          [globalMode ? "paciente" : "careRecipientId"]: patientId,
        })}>
          Comprovantes do catálogo
        </Link>
      ) : null}
      {section === "memberships" ? (
        <Link className={buttonClass} href="/configuracoes?area=people">
          Permissões e alterações com dupla aprovação
        </Link>
      ) : null}
      {error && (
        <Notice error>
          {error}
          <button className={`${buttonClass} ml-3`} onClick={() => { if (globalMode && versionRef.current === null) setVersionAttempt(value => value + 1); void load(); }}>
            Recarregar
          </button>
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
      {readError ? <Notice error>{readError} <button type="button" className={buttonClass} onClick={() => void load()}>Atualizar seção</button></Notice> : null}
      {recovery}
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
      {loading && section !== "overview" && (
        <Notice>Carregando {labels[section].toLowerCase()}…</Notice>
      )}
      {queueRefreshing&&!loading?<Notice>Atualizando fila de notificações…</Notice>:null}
      <fieldset disabled={busy} hidden={readDenied} className="min-w-0 space-y-5">
        {section === "patient" && (
          <PatientRegistration
            patient={context.patient}
            globalMode={globalMode}
            creating={Boolean(editing)}
            onToggle={() => setEditing(editing ? null : {})}
            handle={handle}
          />
        )}
        {section === "catalog" && patientId ? (
          <CatalogueManagement
            key={JSON.stringify([context.userId, patientId, globalMode])}
            userId={context.userId}
            globalMode={globalMode}
            writable={allowed}
            rows={rows}
            loading={loading}
            patientId={patientId}
            onIdentitySaved={async (message) => {
              setMessage(message);
              if (allowed) await load();
            }}
          />
        ) : null}
        {section === "memberships" ? (
          <MembershipManagement
            credentialReviewAllowed={!globalMode}
            recovery={recovery}
            confirmationRevision={confirmationRevision}
            rows={rows}
            directory={directory}
            save={execute}
            busy={busy}
            error={error}
            patientId={patientId}
          />
        ) : null}
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
              queried={!loading && !readError && !queueRefreshing}
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
        {section === "audit" ? <AuditHistory patientId={patientId!} /> : null}
        {section === "operations" && globalMode ? <OperationsConsole key={context.userId} /> : null}
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
        {section === "profiles" && globalMode ? (
          <GlobalAccounts
            rows={rows}
            save={execute}
            busy={busy}
            error={error}
          />
        ) : null}
      </fieldset>
      {busy && <Notice>Salvando operação… Aguarde a confirmação.</Notice>}
    </div>
  );
}
