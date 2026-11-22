"use client";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { z } from "zod";
import { PdfDocumentOptions } from "./pdf-document-options";
import { pdfDocumentOptionsSchema, documentModeLabel, type PdfDocumentOptions as DocumentOptions } from "@/lib/documents/pdf-modes";
import { FileRecord } from "@/components/ui/file-record";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass, can, Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { DocumentActionSlot } from "./document-action-slot";
import { Icon } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlays";
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
  const [basisVersion, setBasisVersion] = useState<number>();
  const [rows, setRows] = useState<PdfArchiveEntry[]>([]),
    [next, setNext] = useState<ArchivePage | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [readError, setReadError] = useState(""),
    [pending, setPending] = useState<Intention | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false), [integrityError, setIntegrityError] = useState(false);
  const [archiveDenied, setArchiveDenied] = useState(false);
  const [archiveErrorDismissed, setArchiveErrorDismissed] = useState(false);
  const [activityStage, setActivityStage] = useState(0);
  useOperationActivity(busy || initialBusy, { title: initialBusy ? "Recuperando o PDF inicial" : "Emissão de PDF", detail: "Estamos conferindo a mesma solicitação. Aguarde a confirmação do exemplar.", stage: activityStage, steps: [{ label: "Preparando a emissão", icon: "file" }, { label: "Gerando e assinando o exemplar", icon: "shield" }, { label: "Conferindo o arquivo registrado", icon: "check" }] });
  const busyRef = useRef(false),
    sequenceRef = useRef(0), archiveRetryRef = useRef<HTMLButtonElement>(null);
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
        setBasisVersion(basis);
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
      } catch (reason) {
        if (own === sequenceRef.current) {
          const denied = reason instanceof ApiError && [401, 403, 404].includes(reason.status);
          if (denied) {
            setRows([]);
            setNext(null);
          }
          setArchiveDenied(denied);
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
  async function generate(documentOptions?: DocumentOptions) {
    if (busyRef.current || integrityError || readOnly || generationBlocked && !pending) return;
    busyRef.current = true;
    setBusy(true);
    setActivityStage(0);
    setError("");
    setMessage("Consultando a mesma intenção de emissão…");
    try {
      const selectedVersion = archiveVersion ?? version;
      const intention = pending ?? {
        key: crypto.randomUUID(),
        ...(selectedVersion ? { version: selectedVersion } : {}),
        ...(documentOptions ? { documentOptions } : {}),
      };
      sessionStorage.setItem(scope, JSON.stringify(intention));
      setPending(intention);
      setActivityStage(1);
      const raw = await api<unknown>(endpoint, {
        idempotencyKey: intention.key,
        ...(intention.version ? { version: intention.version } : {}),
        ...(intention.documentOptions ? { documentOptions: intention.documentOptions } : {}),
      });
      const parsed = pdfIssuanceSchema.safeParse(raw);
      setActivityStage(2);
      if (!parsed.success || parsed.data.documentId !== id || parsed.data.requestedBy !== userId || intention.version && parsed.data.version !== intention.version || JSON.stringify(parsed.data.documentOptions) !== JSON.stringify(intention.documentOptions))
        throw new TransportError(
          "A resposta não confirmou o exemplar. Recupere esta mesma emissão.",
          "command",
          "INVALID_RESPONSE",
          undefined,
        );
      if (parsed.data.state === "ready") {
        sessionStorage.removeItem(scope);
        setPending(null);
        setMessage(
          archiveVersion && parsed.data.version !== archiveVersion
            ? `Arquivo recuperado da versão ${parsed.data.version}. Consulte os arquivos de todas as versões para encontrá-lo.`
            : "Arquivo assinado, conferido e armazenado. Visualize ou baixe o exemplar abaixo.",
        );
      } else
        setMessage(
          "A emissão continua em processamento. O andamento aparece abaixo; recupere esta mesma tentativa se necessário.",
        );
      if (filter === "all") await load();
      else selectFilter("all");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar a emissão. Recupere a mesma tentativa.",
      );
      setMessage(
        "A intenção permanece preservada. Nenhum arquivo foi anunciado como pronto.",
      );
      void load();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function share(row: PdfIssuance) {
    setError("");
    try {
      const response = await fetch(
        `/api/documents/${id}/pdf?issuance=${row.id}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          "Não foi possível recuperar este exemplar para compartilhar. Consulte seu acesso e tente novamente.",
        );
      const file = new File(
        [await response.blob()],
        `${code}-v${row.version}-${row.id.slice(0, 8)}.pdf`,
        { type: "application/pdf" },
      );
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: code, files: [file] });
      else {
        const url = URL.createObjectURL(file),
          anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(
          "PDF baixado. Anexe o exemplar no aplicativo em que deseja compartilhar.",
        );
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível compartilhar este exemplar.",
        );
    }
  }
  const currentVersion = Math.max(version ?? 0, basisVersion ?? 0);
  const visibleRows = rows.filter(entry => {
    if (archiveVersion ? entry.issuance.version !== archiveVersion
      : filter === "current" && entry.issuance.version !== currentVersion) return false;
    if (entry.kind !== "issuance") return true;
    const options = entry.issuance.documentOptions;
    return !options || (options.mode !== "audit" || canAudit) && (!options.sections.includes("access") || canAccess);
  });
  const verification = visibleRows.find(entry => entry.issuance.state === "ready")?.issuance;
  return (
    <section aria-labelledby={headingId} className="doc-area hca-document-files print:hidden">
      <header className="doc-section-heading"><div><h2 id={headingId}>Arquivos gerados</h2><p>Exemplares emitidos a partir desta ficha.</p></div><div className="doc-heading-actions">
        {!readOnly ? <DocumentActionSlot target={actionTarget}>
          <button
            className={buttonClass}
            type="button"
            disabled={busy || initialBusy || integrityError || generationBlocked && !pending}
            onClick={() => {
              onAction?.();
              void generate();
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
          onClick={() => { refreshInitial(); void load(); }}
        >
          Atualizar arquivos
        </button>
        {!readOnly ? <button className={buttonClass} type="button" disabled={busy || initialBusy || Boolean(pending) || integrityError || generationBlocked} onClick={() => setOptionsOpen(true)}>Escolher conteúdo do PDF</button> : null}
      </div></header>
      {archiveVersion === undefined ? <nav className="hca-document-file-nav" aria-label="Filtrar exemplares">
        {archiveFilters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value}
          disabled={busy || initialBusy} onClick={() => selectFilter(value)}>{label}</button>)}
      </nav> : null}
      {filter === "previous" ? <div className="doc-card">
        <strong>O que são exemplares anteriores?</strong>
        <p>São arquivos gerados com o conteúdo preservado de revisões anteriores da ficha.</p>
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
      <PdfDocumentOptions key={optionsOpen ? "choosing" : "closed"} open={!readOnly && optionsOpen} onClose={() => setOptionsOpen(false)} canAudit={canAudit} canAccess={canAccess} code={code} onGenerate={value => { setOptionsOpen(false); onAction?.(); void generate(value); }} />
      {message ? <p role="status">{message}</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {readError ? <Notice error>{readError}</Notice> : null}
      <Dialog open={active && Boolean(readError) && !archiveErrorDismissed && !optionsOpen && !busy && !initialBusy}
        title={archiveDenied ? "Acesso indisponível" : "Não foi possível consultar os arquivos"}
        headingIcon={archiveDenied ? "lock" : "alert"} onClose={() => setArchiveErrorDismissed(true)}
        finalFocus={archiveRetryRef} footer={<>
          <button type="button" className={buttonClass} onClick={() => setArchiveErrorDismissed(true)}>Voltar aos arquivos</button>
          <button type="button" className="ui-button ui-button-primary" disabled={loading}
            onClick={() => void load()}>Consultar novamente</button>
        </>}>
        <p>{readError}</p>
        {loading ? <p role="status">Consultando arquivos…</p> : null}
      </Dialog>
      {loading ? (
        <p role="status">Consultando arquivos…</p>
      ) : !readError && !visibleRows.length && (filter !== "all" || !initial.data) ? (
        <p>
          {filter !== "all" ? "Nenhum exemplar neste filtro." : readOnly ? "Nenhum arquivo registrado nesta consulta." : "Nenhum arquivo registrado nesta consulta. Use Gerar PDF para uma nova emissão explícita."}
        </p>
      ) : null}
      <div className="doc-card doc-file-acervo"><ul className="doc-file-list doc-file-list-compact" aria-label="Exemplares registrados">
        {visibleRows.map((entry) => {
          const row = entry.issuance, earlier = row.version < currentVersion;
          return (
            <FileRecord key={row.id} identity={row.id} mime="application/pdf"
              title={<>{code} · {row.documentOptions ? documentModeLabel(row.documentOptions) : "Ficha"}{earlier ? <span className="doc-chip">Conteúdo anterior</span> : null}</>}
              actions={<>              {row.state === "ready" ? (
                <>
                  <a
                    className={buttonClass}
                    href={`/api/documents/${id}/pdf?issuance=${row.id}`}
                    target="_blank"
                    rel="noopener"
                  >
                    <Icon name="eye" />Visualizar
                  </a>
                  <span className="doc-file-icon-actions"><a
                    className="btn btn-icon"
                    aria-label="Baixar PDF"
                    title="Baixar PDF"
                    href={`/api/documents/${id}/pdf?issuance=${row.id}`}
                    download
                  >
                    <Icon name="download" />
                  </a>
                  <button
                    className="btn btn-icon"
                    aria-label="Compartilhar PDF"
                    title="Compartilhar PDF"
                    type="button"
                    onClick={() => void share(row)}
                  >
                    <Icon name="upload" />
                  </button></span>
                </>
              ) : (
                <p className="text-sm">
                  {row.state === "uncertain"
                    ? "Arquivo ainda não confirmado. O solicitante pode recuperar a mesma emissão."
                    : "O arquivo ficará disponível após assinatura, validação e confirmação do armazenamento."}
                </p>
              )}
              </>}
            >
              <p className="doc-file-edition">{row.id}</p>
              <div className="doc-file-meta"><span><Icon name="user" width={13} height={13} />{row.requestedName}</span><span><Icon name="clock" width={13} height={13} /><time dateTime={row.readyAt ?? row.requestedAt}>{formatBrazilDate(row.readyAt ?? row.requestedAt)}</time></span>{row.state !== "ready" ? <span>{steps[row.step]}</span> : null}</div>
              {row.representation === "derived" ? (
                <p className="text-sm">
                  Nova representação de uma versão histórica, gerada no momento
                  indicado.
                </p>
              ) : null}
              <details className="doc-help-details hca-file-identification">
                <summary>Identificação do exemplar</summary>
                <p>Conteúdo da revisão {row.version}. {steps[row.step]}.</p>
                {earlier ? <p>Este exemplar preserva o conteúdo de uma revisão anterior da ficha. Atualizações posteriores mantêm o conteúdo desta emissão.</p> : null}
                <p>Solicitado em {formatBrazilDate(row.requestedAt)}.{row.readyAt ? ` Emissão concluída em ${formatBrazilDate(row.readyAt)}. Assinatura técnica e carimbo internos.` : ""}</p>
                <p className="break-all">
                  Código: HCA-{row.verificationCode.match(/.{4}/g)?.join("-")}
                </p>
              </details>
            </FileRecord>
          );
        })}
      </ul></div>
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
