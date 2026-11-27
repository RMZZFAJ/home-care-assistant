"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { z } from "zod";
import { PdfDocumentOptions } from "./pdf-document-options";
import { PdfFileDetails } from "./pdf-file-details";
import { ScopedReadFailureDialog } from "./scoped-read-failure-dialog";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "./document-operation-failure-dialog";
import { pdfDocumentOptionsSchema, documentModeLabel, type PdfDocumentOptions as DocumentOptions } from "@/lib/documents/pdf-modes";
import { FileRecord } from "@/components/ui/file-record";
import { ActionButton, ActionLink, DefinitionGrid, Pill, type PillTone } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass, can, Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { DocumentActionSlot } from "./document-action-slot";
import { Icon } from "@/components/ui/primitives";
import { api, ApiError, TransportError } from "@/lib/client/api";
import {
  initialPdfStatusSchema,
  pdfIssuanceSchema,
  type PdfIssuance,
} from "@/lib/documents/pdf-issuance";
import {
  pdfArchivePageSchema,
  type pdfArchiveFilter,
  type PdfArchiveEntry,
  type PdfArchiveCursor,
} from "@/lib/documents/pdf-archive";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import {
  initialNoticeMessage,
  startInitialNoticeTracking,
  type InitialNoticeState,
} from "@/lib/notifications/initial-tracking";

type Props = {
  id: string;
  code: string;
  version?: number;
  archiveVersion?: number;
  consolidatedId?: string | null;
  trackNotices?: boolean;
  actionTarget?: HTMLElement | null;
  onAction?: () => void;
  generationBlocked?: boolean;
  readOnly?: boolean;
  active?: boolean;
};
const intentionSchema = z.object({ key: z.uuid(), version: z.number().int().positive().max(2147483647).optional(), documentOptions: pdfDocumentOptionsSchema.optional() }).strict();
const parseInitialPdf = (raw: unknown) => initialPdfStatusSchema.parse(raw);
type Intention = z.infer<typeof intentionSchema>;
type GenerationOutcome = { kind: "ready"; file: PdfIssuance; recovered: boolean }
  | { kind: "uncertain"; cause: unknown; attempts: number }
  | { kind: "unsent"; cause: unknown };
type ArchiveFilter = "all" | z.infer<typeof pdfArchiveFilter>;
type ArchivePage = { cursor: PdfArchiveCursor; basisVersion?: number };
const archiveFilters = [["all", "Todos"], ["current", "Atuais"], ["previous", "Anteriores"]] as const;
const steps = {
  reserved: "Solicitação registrada",
  recovering: "Recuperando o exemplar",
  composing: "Conferindo o conteúdo",
  signing: "Assinando com carimbo de tempo",
  persisting: "Confirmando armazenamento",
  uncertain: "Resultado ainda não confirmado",
  ready: "Arquivo pronto",
};
function exemplarPresentation(file: PdfIssuance, currentVersion: number, initialId?: string | null, consolidatedId?: string | null) {
  const consolidated = file.id === consolidatedId;
  const previous = currentVersion > 0 && file.version < currentVersion;
  const title = consolidated ? "Ficha consolidada" : documentModeLabel(file.documentOptions);
  let origin = "Emissão operacional";
  if (consolidated) origin = "Arquivamento da ficha";
  else if (file.id === initialId) origin = "Emissão inicial";
  else if (file.representation === "derived") origin = "Nova representação de uma versão histórica";
  else if (file.requestedBy) origin = "Solicitação de exemplar";
  let status = "Preparando arquivo", tone: PillTone = "warning";
  if (file.state === "uncertain") status = "A confirmar";
  if (file.state === "ready") {
    status = consolidated ? "Consolidado" : previous ? "Conteúdo anterior" : currentVersion > 0 ? "Atual" : "Disponível";
    tone = previous && !consolidated ? "neutral" : "success";
  }
  return { title, origin, status, tone, previous };
}
export function DocumentActions(props: Props) {
  const { data, value } = useWorkspaceState();
  return data ? (
    <GeneratedFiles
      key={`${data.userId}:${props.id}`}
      {...props}
      userId={data.userId}
      canAudit={Boolean(value && value.activeContext?.mode === "patient" && data.documentContext?.id === props.id && value.patient?.id === data.documentContext.patientId && can(value, "audit.read"))}
      canAccess={Boolean(value && value.activeContext?.mode === "patient" && data.documentContext?.id === props.id && value.patient?.id === data.documentContext.patientId && can(value, "document.access.read"))}
    />
  ) : (
    <p role="status">Validando acesso aos arquivos…</p>
  );
}
function InitialNoticeTracking({ id }: { id: string; }) {
  const [state, setState] = useState<InitialNoticeState>({ kind: "checking" });
  useEffect(
    () =>
      startInitialNoticeTracking(
        (signal) =>
          api<unknown>(`/api/documents/${id}/notifications`, undefined, signal),
        setState,
      ),
    [id],
  );
  return (
    <p
      className="text-xs text-(--muted)"
      role="status"
      data-notice-tracking={state.kind}
    >
      {initialNoticeMessage(state)}
    </p>
  );
}

function GeneratedFiles({
  id,
  code,
  version,
  userId,
  canAudit,
  canAccess,
  archiveVersion,
  consolidatedId,
  trackNotices = true,
  actionTarget,
  onAction,
  generationBlocked = false,
  readOnly = false,
  active = true,
}: Props & { userId: string; canAudit: boolean; canAccess: boolean; }) {
  const headingId = useId(),
    scope = `hca:pdf-intention:${userId}:${id}`,
    endpoint = `/api/documents/${id}/issuances`;
  const initialEndpoint = `${endpoint}/initial`;
  const initial = useScopedRead(archiveVersion ? null : initialEndpoint, userId, parseInitialPdf);
  const refreshInitial = initial.refresh;
  const initialProcessing = initial.data?.state === "reserved" || initial.data?.state === "processing";
  const [initialBusy, setInitialBusy] = useState(false);
  const [initialError, setInitialError] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const [confirmedVersion, setConfirmedVersion] = useState(0);
  const [rows, setRows] = useState<PdfArchiveEntry[]>([]),
    [next, setNext] = useState<ArchivePage | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [readError, setReadError] = useState(""),
    [pending, setPending] = useState<Intention | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false), [integrityError, setIntegrityError] = useState(false);
  const [detail, setDetail] = useState<{ id: string; opener: HTMLButtonElement; open: boolean } | null>(null);
  const [archiveDenied, setArchiveDenied] = useState(false);
  const [archiveErrorDismissed, setArchiveErrorDismissed] = useState(false);
  const [archiveFailureCause, setArchiveFailureCause] = useState<unknown>(null);
  const [archiveRetries, setArchiveRetries] = useState(0);
  const [activityStage, setActivityStage] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [generationOutcome, setGenerationOutcome] = useState<GenerationOutcome | null>(null);
  useOperationActivity(busy || initialBusy, {
    title: initialBusy ? "Recuperando o PDF inicial" : recovering ? "Recuperando o exemplar" : "Preparando o PDF",
    detail: "Aguarde a confirmação do exemplar.", stage: activityStage,
    steps: busy && recovering ? [
      { label: "Consultando a solicitação", icon: "file" },
      { label: "Confirmando o exemplar registrado", icon: "check" },
    ] : [
      { label: "Preparando a emissão", icon: "file" },
      { label: "Gerando e assinando o exemplar", icon: "shield" },
      { label: "Conferindo o arquivo registrado", icon: "check" },
    ],
  });
  const busyRef = useRef(false),
    sequenceRef = useRef(0), archiveRetryRef = useRef<HTMLButtonElement>(null), generateRef = useRef<HTMLButtonElement>(null);
  const invalidate = useCallback(() => {
    sequenceRef.current++;
  }, []);
  const load = useCallback(
    async (bookmark?: ArchivePage, quiet = false) => {
      const cursor = bookmark?.cursor;
      const own = ++sequenceRef.current;
      if (!quiet) setLoading(true);
      try {
        const query = new URLSearchParams();
        if (archiveVersion) query.set("version", String(archiveVersion));
        else if (filter !== "all") query.set("filter", filter);
        if (cursor) {
          query.set("before", cursor.at);
          query.set("kind", cursor.kind);
          query.set("reference", cursor.reference);
          if (bookmark?.basisVersion !== undefined) query.set("basis", String(bookmark.basisVersion));
        }
        const raw = await api<unknown>(
          `/api/documents/${id}/archive${query.size ? "?" + query : ""}`,
        );
        const page = pdfArchivePageSchema.safeParse(raw);
        if (!page.success || page.data.data.some(entry => entry.issuance.documentId !== id))
          throw new Error(
            "Não foi possível confirmar a lista de arquivos. Consulte novamente.",
          );
        if (archiveVersion && page.data.data.some(entry => entry.issuance.version !== archiveVersion))
          throw new Error("A resposta não corresponde à versão consultada.");
        const basis = page.data.basisVersion;
        if (!archiveVersion && filter !== "all" && (page.data.filter !== filter || basis === undefined
          || version !== undefined && basis < version
          || bookmark && bookmark.basisVersion !== basis
          || page.data.data.some(entry => filter === "current" ? entry.issuance.version !== basis : entry.issuance.version >= basis)))
          throw new Error("A resposta não corresponde ao filtro de exemplares selecionado.");
        if (own !== sequenceRef.current) return;
        if (basis !== undefined) setConfirmedVersion(previous => Math.max(previous, basis));
        setRows((current) =>
          cursor
            ? [
              ...current,
              ...page.data.data.filter(
                (r) =>
                  !current.some(
                    (c) => c.kind === r.kind && c.reference === r.reference,
                  ),
              ),
            ]
            : page.data.data,
        );
        setNext(page.data.next ? { cursor: page.data.next, basisVersion: basis } : null);
        setReadError("");
        setArchiveDenied(false);
        setArchiveFailureCause(null);
        setArchiveRetries(0);
      } catch (reason) {
        if (own === sequenceRef.current) {
          const denied = reason instanceof ApiError && [401, 403, 404].includes(reason.status);
          if (denied) {
            setRows([]);
            setNext(null);
          }
          setArchiveDenied(denied);
          setArchiveFailureCause(reason);
          if (!quiet) setArchiveErrorDismissed(false);
          setReadError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os arquivos.",
          );
        }
      } finally {
        if (own === sequenceRef.current) setLoading(false);
      }
    },
    [id, archiveVersion, filter, version],
  );
  function selectFilter(nextFilter: ArchiveFilter) {
    if (nextFilter === filter) return;
    invalidate();
    setRows([]);
    setNext(null);
    setReadError("");
    setArchiveRetries(0);
    setLoading(true);
    setFilter(nextFilter);
  }
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      try {
        const stored = JSON.parse(sessionStorage.getItem(scope) ?? "null");
        if (stored !== null) setPending(intentionSchema.parse(stored));
      } catch {
        setIntegrityError(true);
        setError("Não foi possível conferir a referência da emissão preservada. Nenhuma nova emissão será iniciada; consulte os arquivos e recupere sua referência original.");
      }
    });
    return () => { live = false; };
  }, [scope]);
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => { if (live) void load(); });
    return () => { live = false; invalidate(); };
  }, [load, invalidate]);
  useEffect(() => {
    if (!busy && !pending) return;
    const timer = setInterval(() => void load(undefined, true), 2000);
    const deadline = setTimeout(() => clearInterval(timer), 60000);
    return () => {
      clearInterval(timer);
      clearTimeout(deadline);
    };
  }, [busy, pending, load]);
  useEffect(() => {
    if (!initialProcessing) return;
    const timer = window.setInterval(refreshInitial, 4000);
    const deadline = window.setTimeout(() => window.clearInterval(timer), 60_000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(deadline);
    };
  }, [initialProcessing, refreshInitial]);

  async function retryInitial() {
    if (busyRef.current || !initial.data?.id) return;
    busyRef.current = true;
    setInitialBusy(true);
    setActivityStage(1);
    setInitialError("");
    try {
      const result = parseInitialPdf(await api<unknown>(initialEndpoint, {}));
      if (result?.documentId !== id || result.id !== initial.data.id)
        throw new Error("A resposta não confirmou o PDF inicial desta ficha.");
      setActivityStage(2);
    } catch {
      setInitialError("A ficha foi registrada. Ainda não foi possível confirmar o PDF inicial. Tente recuperar o mesmo exemplar.");
    } finally {
      refreshInitial();
      void load();
      setInitialBusy(false);
      busyRef.current = false;
    }
  }
  async function generate(documentOptions?: DocumentOptions, attempts = 0) {
    if (busyRef.current || integrityError || readOnly || generationBlocked && !pending) return;
    const sameIntention = Boolean(pending);
    let preserved = sameIntention;
    busyRef.current = true;
    setBusy(true);
    setRecovering(sameIntention);
    setGenerationOutcome(null);
    setActivityStage(0);
    setError("");
    setMessage("");
    try {
      const selectedVersion = archiveVersion ?? version;
      const intention = pending ?? {
        key: crypto.randomUUID(),
        ...(selectedVersion ? { version: selectedVersion } : {}),
        ...(documentOptions ? { documentOptions } : {}),
      };
      if (!pending) {
        sessionStorage.setItem(scope, JSON.stringify(intention));
        preserved = true;
        setPending(intention);
        setActivityStage(1);
      }
      const raw = await api<unknown>(endpoint, {
        idempotencyKey: intention.key,
        ...(intention.version ? { version: intention.version } : {}),
        ...(intention.documentOptions ? { documentOptions: intention.documentOptions } : {}),
      }, undefined, "POST", { timeoutMs: 65_000 });
      const parsed = pdfIssuanceSchema.safeParse(raw);
      if (!parsed.success || parsed.data.documentId !== id || parsed.data.requestedBy !== userId || intention.version && parsed.data.version !== intention.version || JSON.stringify(parsed.data.documentOptions) !== JSON.stringify(intention.documentOptions))
        throw new TransportError(
          "A resposta não confirmou o exemplar. Recupere esta mesma emissão.",
          "command",
          "INVALID_RESPONSE",
          undefined,
        );
      setActivityStage(sameIntention ? 1 : 2);
      if (parsed.data.state === "ready") {
        try {
          sessionStorage.removeItem(scope);
        } catch {
          setIntegrityError(true);
          setError("O exemplar foi confirmado. Recarregue a ficha antes de iniciar outra emissão.");
        }
        setPending(null);
        setGenerationOutcome({ kind: "ready", file: parsed.data, recovered: sameIntention });
        if (archiveVersion && parsed.data.version !== archiveVersion) {
          setMessage(`Arquivo recuperado da versão ${parsed.data.version}. Consulte os arquivos de todas as versões para encontrá-lo.`);
        }
      } else if (parsed.data.state === "uncertain") {
        setGenerationOutcome({ kind: "uncertain", cause: null, attempts });
      } else
        setMessage(
          "A emissão continua em processamento. O andamento aparece abaixo; recupere esta mesma tentativa se necessário.",
        );
      if (filter === "all") await load();
      else selectFilter("all");
    } catch (reason) {
      setGenerationOutcome(preserved ? { kind: "uncertain", cause: reason, attempts } : { kind: "unsent", cause: reason });
      if (preserved) void load(undefined, true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const fileHref = (file: PdfIssuance) => `/api/documents/${id}/pdf?issuance=${file.id}`;
  async function share(row: PdfIssuance) {
    const response = await fetch(fileHref(row), { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível recuperar este exemplar para compartilhar. Consulte seu acesso e tente novamente.");
    const file = new File([await response.blob()], `${code}-v${row.version}-${row.id.slice(0, 8)}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: code, files: [file] });
      return;
    }
    const url = URL.createObjectURL(file), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "PDF baixado. Anexe o exemplar no aplicativo em que deseja compartilhar.";
  }
  const currentVersion = Math.max(version ?? 0, confirmedVersion);
  const visibleRows = rows.filter(entry => {
    if (archiveVersion ? entry.issuance.version !== archiveVersion
      : filter === "current" && entry.issuance.version !== currentVersion) return false;
    if (entry.kind !== "issuance") return true;
    const options = entry.issuance.documentOptions;
    return !options || (options.mode !== "audit" || canAudit) && (!options.sections.includes("access") || canAccess);
  });
  const verification = visibleRows.find(entry => entry.issuance.state === "ready")?.issuance;
  const selectedFile = active && detail ? visibleRows.find(entry => entry.issuance.id === detail.id)?.issuance : undefined;
  const outcome = active && !busy && !initialBusy ? generationOutcome : null;
  const closeOutcome = () => setGenerationOutcome(null);
  const outcomeFocus = () => !generateRef.current?.disabled && generateRef.current?.isConnected ? generateRef.current : archiveRetryRef.current ?? false;
  const attempts = outcome?.kind === "uncertain" ? outcome.attempts : 0;
  const exhausted = attempts >= operationRecoveryLimit;
  return (
    <section aria-labelledby={headingId} className="doc-area hca-document-files print:hidden">
      <header className="doc-section-heading"><div><h2 id={headingId}>Arquivos gerados</h2><p>Exemplares emitidos a partir desta ficha.</p></div><div className="doc-heading-actions">
        {!readOnly ? <DocumentActionSlot target={actionTarget}>
          <button
            ref={generateRef}
            className={buttonClass}
            type="button"
            aria-haspopup="dialog"
            disabled={busy || initialBusy || integrityError || generationBlocked && !pending}
            onClick={() => {
              onAction?.();
              if (pending) void generate();
              else setOptionsOpen(true);
            }}
          >
            <Icon name="file" />
            {busy
              ? "Gerando PDF…"
              : pending
                ? "Recuperar emissão"
                : "Gerar PDF"}
          </button>
        </DocumentActionSlot> : null}
        <button
          ref={archiveRetryRef}
          className={buttonClass}
          type="button"
          disabled={loading}
          onClick={() => { setArchiveRetries(0); refreshInitial(); void load(); }}
        >
          Atualizar arquivos
        </button>
      </div></header>
      {archiveVersion === undefined ? <nav className="hca-document-file-nav" aria-label="Filtrar exemplares">
        {archiveFilters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value}
          disabled={busy || initialBusy} onClick={() => selectFilter(value)}>{label}</button>)}
      </nav> : null}
      {filter === "previous" ? <div className="hca-archive-context">
        <Icon name="history" width={19} height={19} />
        <div><strong>O que são exemplares anteriores?</strong>
          <p>São arquivos gerados antes da atualização mais recente desta ficha. Eles conservam o conteúdo daquela emissão e continuam disponíveis para consulta.</p>
        </div>
      </div> : null}
      {readOnly ? <p role="status">Os exemplares emitidos estão disponíveis para consulta e download.</p>
        : generationBlocked ? <p role="status">Atualize a ficha para gerar um novo PDF. Os exemplares já emitidos continuam disponíveis.</p> : null}
      {initial.data && filter === "all" ? <div className="doc-card hca-initial-pdf">
        <strong>PDF inicial</strong>
        {initial.data.state === "ready" && initial.data.issuanceId ? <a className={buttonClass}
          href={`/api/documents/${id}/pdf?issuance=${initial.data.issuanceId}`} download>
          <Icon name="download" />Baixar PDF inicial
        </a> : <>
          {initialError ? <Notice error>{initialError}</Notice> : <p role="status">{initial.data.state === "uncertain"
            ? "O PDF inicial ainda não foi confirmado. A ficha já está registrada."
            : "A ficha está emitida. O PDF inicial ficará disponível após a assinatura e a conferência."}</p>}
          {!readOnly && !generationBlocked && <button className={buttonClass} type="button" disabled={busy || initialBusy}
            onClick={() => void retryInitial()}>Recuperar PDF inicial</button>}
        </>}
      </div> : null}
      <PdfDocumentOptions key={optionsOpen ? "choosing" : "closed"} open={!readOnly && optionsOpen}
        onClose={() => setOptionsOpen(false)} canAudit={canAudit} canAccess={canAccess} code={code}
        blocked={generationBlocked || integrityError || initialBusy || busy || Boolean(pending)}
        onGenerate={value => { setOptionsOpen(false); void generate(value); }} />
      {message && !busy && !initialBusy ? <p role="status">{message}</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {readError ? <Notice error>{readError}</Notice> : null}
      {outcome?.kind === "ready" ? <Dialog open success
        popupClassName="hca-operation-result-dialog"
        title={outcome.recovered ? "Exemplar recuperado" : "Exemplar disponível"}
        subtitle={outcome.recovered ? "A mesma emissão foi confirmada." : "O exemplar foi registrado com identificação própria."}
        onClose={closeOutcome} finalFocus={outcomeFocus}
        footer={<ActionButton variant="primary" onClick={closeOutcome}><Icon name="check" />Concluir</ActionButton>}>
        <DefinitionGrid className="hca-operation-result-facts" items={[
          { label: "Ficha", value: code }, { label: "Modalidade", value: documentModeLabel(outcome.file.documentOptions) },
          { label: "Conteúdo", value: `Revisão ${outcome.file.version}` },
        ]} />
      </Dialog> : null}
      {outcome && outcome.kind !== "ready" ? <DocumentOperationFailureDialog
        title={outcome.kind === "uncertain" && !exhausted ? "Emissão ainda não confirmada" : "Não foi possível concluir a emissão"}
        description={outcome.kind === "unsent" ? "A referência não pôde ser guardada neste aparelho, por isso a solicitação não foi enviada."
          : outcome.cause instanceof ApiError && outcome.cause.code === "CONTENT_INVALID" ? outcome.cause.message
            : exhausted ? "A solicitação está preservada. O arquivo ainda não foi anunciado como disponível."
              : "A solicitação está preservada. Consulte a mesma emissão antes de iniciar outra."}
        guidance={outcome.kind === "uncertain" ? "Vamos consultar o registro da solicitação original antes de tentar outra gravação." : undefined}
        outcome={outcome.kind === "uncertain" ? "uncertain" : "rejected"}
        cause={outcome.cause} operation="Gerar PDF" fallbackCode="DOC-EMISSAO-024" attempts={attempts}
        onClose={closeOutcome} closeLabel="Voltar" finalFocus={outcomeFocus}
        action={outcome.kind === "uncertain" && pending && !readOnly && !exhausted
          ? { label: "Conferir resultado", onClick: () => void generate(undefined, attempts + 1) } : undefined}
        exhaustedMessage={exhausted ? "Copie os detalhes e envie ao responsável pelo sistema para verificar o resultado." : undefined}
      /> : null}
      <ScopedReadFailureDialog subject="files" open={active && Boolean(readError) && !archiveErrorDismissed && !optionsOpen && !busy && !initialBusy && !outcome}
        title="Não foi possível consultar os arquivos" denied={archiveDenied} message={readError} loading={loading}
        cause={archiveFailureCause} attempts={archiveRetries} returnFocus={archiveRetryRef}
        onClose={() => { setArchiveErrorDismissed(true); setArchiveRetries(0); }}
        onRetry={() => { setArchiveRetries(value => value + 1); void load(); }} />
      {loading ? (
        <p role="status">Consultando arquivos…</p>
      ) : !readError && !visibleRows.length && (filter !== "all" || !initial.data) ? (
        <p>
          {filter !== "all" ? "Nenhum exemplar neste filtro." : readOnly ? "Nenhum arquivo registrado nesta consulta." : "Nenhum arquivo registrado nesta consulta. Use Gerar PDF para uma nova emissão explícita."}
        </p>
      ) : null}
      <ul className="hca-file-archive-list" aria-label="Exemplares registrados">
        {visibleRows.map((entry) => {
          const row = entry.issuance;
          const { title, origin, status, tone } = exemplarPresentation(row, currentVersion, initial.data?.issuanceId, consolidatedId);
          const instant = row.readyAt ?? row.requestedAt;
          return (
            <FileRecord key={row.id} identity={row.id} mime="application/pdf"
              title={title}
              archive={{
                description: origin,
                details: <ActionButton aria-haspopup="dialog" aria-label="Identificação do exemplar" className="hca-file-record-more hca-control-icon"
                  onClick={event => setDetail({ id: row.id, opener: event.currentTarget, open: true })}><Icon name="more" /></ActionButton>,
                facts: <><Pill tone={tone}>{status}</Pill>{row.sizeBytes ? <span>{Math.ceil(row.sizeBytes / 1024)} KB</span> : null}</>,
              }}
              actions={row.state === "ready" ? <>
                <ActionLink compact href={fileHref(row)} target="_blank" rel="noopener"><Icon name="eye" />Visualizar</ActionLink>
                <ActionLink compact className="hca-control-icon" href={fileHref(row)} aria-label="Baixar PDF" download><Icon name="download" /></ActionLink>
              </> : undefined}
            >
              <span><Icon name="user" width={14} height={14} />{row.requestedName}</span>
              <time dateTime={instant}>{formatBrazilDate(instant)}</time>
              {row.state !== "ready" ? <p>{steps[row.step]}. {row.state === "uncertain"
                ? "O solicitante pode recuperar a mesma emissão."
                : "O arquivo ficará disponível após assinatura, validação e confirmação do armazenamento."}</p> : null}
            </FileRecord>
          );
        })}
      </ul>
      {selectedFile && detail ? <PdfFileDetails key={selectedFile.id} file={selectedFile} documentCode={code} open={detail.open}
        {...exemplarPresentation(selectedFile, currentVersion, initial.data?.issuanceId, consolidatedId)}
        href={fileHref(selectedFile)} onShare={() => share(selectedFile)}
        onClose={() => setDetail({ ...detail, open: false })}
        finalFocus={() => detail.opener.isConnected ? detail.opener : archiveRetryRef.current ?? false} /> : null}
      <p className="doc-footnote"><Icon name="info" width={14} height={14} />Visualizar ou baixar reutiliza o mesmo exemplar. Cada nova geração cria um exemplar.</p>
      {verification ? <Link className="btn btn-ghost" href={`/verificar/emissao/${verification.verificationCode}?returnTo=${encodeURIComponent(`/documentos/${id}?documentTab=files`)}`}><Icon name="shield" />Abrir validação pública</Link> : null}
      {next ? (
        <button
          className={buttonClass}
          disabled={loading}
          type="button"
          onClick={() => void load(next)}
        >
          Carregar emissões anteriores
        </button>
      ) : null}
      {trackNotices ? <InitialNoticeTracking id={id} /> : null}
    </section>
  );
}
