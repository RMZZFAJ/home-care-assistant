"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { ApiError } from "@/lib/client/api";
import { governanceCommandConfirmed } from "@/lib/validation/governance";
import {
  api,
  buttonClass,
  can,
  inputClass,
  Notice,
  panelClass,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { NotificationQueue } from "./notification-settings";
import { type Row } from "./admin-fields";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";
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
import { ResidenceAdministration, ResidenceAdministrationUnavailable } from "./residence-administration";
import { Icon } from "@/components/ui/icon";
import { InvitationManagement } from "./invitation-management";
import { PeopleNavigation } from "./people-navigation";
import "./administration.css";

type Section =
  | "patient"
  | "catalog"
  | "memberships"
  | "invitations"
  | "audit"
  | "import"
  | "profiles"
  | "notifications"
  | "operations";
type AdministrativeResult = { data?: unknown; pendingApproval?: boolean };
type AdministrativeIntent = { payload: Row; success: string; refreshContext: boolean };
const labels: Record<Section, string> = {
  patient: "Paciente",
  catalog: "Catálogo",
  memberships: "Vínculos",
  invitations: "Convites",
  audit: "Auditoria",
  import: "Importação histórica",
  profiles: "Contas globais",
  notifications: "Notificações",
  operations: "Central técnica",
};
export function AdminConsole() {
  const params = useSearchParams();
  const section = params.get("section");
  const technical = section === "operations";
  const people = section === "memberships" || section === "invitations";
  const catalogue = section === "catalog";
  const catalogueHeadingRef = useRef<HTMLHeadingElement>(null);
  const overview = !section || section === "patient" || !Object.hasOwn(labels, section);
  const administrativeCapabilities = ["access.manage", "catalog.manage", "audit.read"];
  return (
    <Workspace
      title={technical ? "Central técnica" : people ? "Pessoas e convites" : catalogue ? "Catálogo" : "Administração"}
      eyebrow={technical ? "Administração global" : people || catalogue ? "Organização da residência" : undefined}
      administration
      administrationCapabilities={administrativeCapabilities}
      administrationReadRecovery={section === "catalog"}
      administrationUnavailable={overview ? <ResidenceAdministrationUnavailable /> : undefined}
      heading={overview ? context => {
        const global = context.activeContext?.mode === "global" && context.globalAdministrationAllowed;
        const available = global || administrativeCapabilities.some(capability => can(context, capability));
        return <>
          {global && context.patient ? <div className="hca-residence-admin-banner"><Icon name="info" />
            <p><strong>Atuação administrativa</strong> As propostas locais dependem da decisão de outro administrador do paciente.</p>
          </div> : null}
          <div className="page-heading hca-residence-admin-heading"><div>
            <p className="eyebrow">{available ? "Organização da residência" : "Home Care Assistant"}</p>
            <h1>{available ? "Administração" : "Acesso à residência"}</h1>
            {available ? <p className="hca-residence-admin-subtitle">Organize o acesso e o trabalho da residência.</p> : null}
          </div></div>
        </>;
      } : catalogue ? () => <div className="page-heading hca-residence-admin-heading"><div>
        <p className="eyebrow">Organização da residência</p><h1 ref={catalogueHeadingRef} tabIndex={-1}>Catálogo</h1>
        <p className="hca-residence-admin-subtitle">Materiais desta residência, sempre identificados por tipo.</p>
      </div></div> : undefined}
    >
      {(context) => overview ? <ResidenceAdministration
        key={`${context.userId}:${context.patient?.id ?? "global"}:${context.activeContext?.mode}:${section ?? "overview"}`}
        context={context} initialEdit={section === "patient"} /> : (
        <PatientAdmin
          key={(context.patient?.id ?? "global") + ":" + (params.get("section") ?? "overview")}
          context={context}
          catalogueHeadingRef={catalogueHeadingRef}
        />
      )}
    </Workspace>
  );
}

function PatientAdmin({ context, catalogueHeadingRef }: { context: WorkspaceContext; catalogueHeadingRef: RefObject<HTMLHeadingElement | null> }) {
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
  const [page, setPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [loading, setLoading] = useState(
    !["patient", "import", "overview", "audit", "operations", "catalog", "profiles", "invitations"].includes(section),
  );
  const command = useCommandIntent<Row, AdministrativeResult>(governanceCommandConfirmed);
  const intentRef = useRef<AdministrativeIntent | null>(null);
  const loadSequenceRef = useRef(0);
  const versionRef = useRef<number | null>(null);
  const [versionAttempt, setVersionAttempt] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const busy = localBusy || command.busy || command.uncertain || conflict;
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [readDenied, setReadDenied] = useState(false);
  const live = useLiveRevision(), queueRevision = section === "notifications" ? live : 0;
  const [queueReadRevision,setQueueReadRevision]=useState(-1);
  const queueRefreshing=section==="notifications"&&queueReadRevision!==queueRevision;
  const [message, setMessage] = useState("");
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
      if (!allowed || ["patient", "import", "overview", "audit", "operations", "catalog", "profiles", "invitations"].includes(section))
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
        section === "memberships"
          ? api<{ data: Row[] }>(
              section === "memberships" && globalMode
                ? "/api/admin?section=profiles"
                : `/api/admin?section=memberships&careRecipientId=${patientId}`,
              undefined,
              signal,
            )
          : Promise.resolve({ data: [] as Row[] }),
      ]).then(
        ([result, people]) => {
          if (signal?.aborted || sequence !== loadSequenceRef.current) return;
          setRows(result.data ?? []);
          setNotificationTotal(result.total ?? 0);
          setDirectory(people.data);
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
    if (packet.payload.action === "historicalImport") setReport(result.data);
    intentRef.current = null;
    // A failing read after this point cannot make the completed command uncertain.
    try { if (packet.refreshContext) await context.refresh(); await load(); setVersionAttempt(value => value + 1); }
    catch (reason) { setError("A ação foi confirmada. A consulta posterior falhou: " + (reason instanceof Error ? reason.message : "Atualize esta seção.")); }
    return result;
  }
  function preparationConfirmed(outcome: AdministrativeOutcome) {
    setMessage("");
    void (async () => {
      if (outcome.kind==="local" && ["membership","membershipStatus"].includes(outcome.action)) await context.refresh();
      await load();
      setVersionAttempt(value => value + 1);
    })().catch(reason => setError("A alteração foi confirmada. A consulta posterior falhou. " + (reason instanceof Error ? reason.message : "")));
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
      {section !== "catalog" && section !== "operations" && section !== "memberships" && section !== "invitations" && <p className="text-sm text-(--muted)">
        {globalMode
          ? "Administração global e por paciente."
          : "Todas as alterações desta área se limitam ao paciente selecionado."}
      </p>}
      {section === "catalog" ? null : patientId && (section === "memberships" || section === "invitations") ? <PeopleNavigation patientId={patientId} area={section} globalMode={globalMode} /> :
        <AdministrationNavigation context={context} section={section === "overview" ? null : section} />}
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
      {loading && section !== "overview" && (
        <Notice>Carregando {labels[section].toLowerCase()}…</Notice>
      )}
      {queueRefreshing&&!loading?<Notice>Atualizando fila de notificações…</Notice>:null}
      <fieldset disabled={busy} hidden={readDenied} className="min-w-0 space-y-5">
        {section === "catalog" && patientId ? (
          <><CatalogueManagement
            key={JSON.stringify([context.userId, patientId, globalMode])}
            userId={context.userId}
            globalMode={globalMode}
            writable={allowed}
            patientId={patientId}
            headingRef={catalogueHeadingRef}
            onIdentitySaved={async (message) => {
              setMessage(message);
              if (allowed) await load();
            }}
          /><div className="hca-form-stack">
            <Link className={buttonClass} href={"/comprovantes-catalogo?" + new URLSearchParams({
              [globalMode ? "paciente" : "careRecipientId"]: patientId,
            })}>Comprovantes do catálogo</Link>
            <AdministrationNavigation context={context} section="catalog" />
          </div></>
        ) : null}
        {section === "memberships" && patientId && !readDenied ? (
          <MembershipManagement
            key={JSON.stringify([context.userId, patientId, globalMode])}
            userId={context.userId} globalMode={globalMode} onConfirmed={preparationConfirmed}
            credentialReviewAllowed={!globalMode}
            mayRegularize={can(context, "ent.regularize")}
            rows={rows}
            directory={directory}
            patientId={patientId}
            patientName={context.patient?.display_name ?? "Residência"}
          />
        ) : null}
        {section === "invitations" && patientId ? <InvitationManagement key={patientId + ":" + (params.get("invitationId") ?? "")}
          patientId={patientId} userId={context.userId} initialInvitationId={params.get("invitationId")} /> : null}
        {(section === "memberships" || section === "invitations") && patientId ? <Link className={buttonClass} href={`/admin?careRecipientId=${patientId}`} prefetch={false}>
          <Icon name="back" />Voltar à administração
        </Link> : null}
        {section === "notifications" && (
          <>
            <NotificationQueue
              rows={rows}
              execute={execute}
              isGlobalAdmin={globalMode}
              queried={!loading && !readError && !queueRefreshing}
              blocked={busy || loading || Boolean(readError) || queueRefreshing || readDenied}
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
        {section === "audit" ? <AuditHistory patientId={patientId!} /> : null}
        {section === "operations" && globalMode ? <OperationsConsole key={context.userId} actorId={context.userId} /> : null}
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
