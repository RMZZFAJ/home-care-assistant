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
import { api, ApiError, TransportError } from "@/lib/client/api";
import {
  pdfIssuanceSchema,
  type PdfIssuance,
} from "@/lib/documents/pdf-issuance";
import {
  pdfArchivePageSchema,
  type PdfArchiveEntry,
  type PdfArchiveCursor,
} from "@/lib/documents/pdf-archive";
import { formatBrazilDate } from "@/lib/receipt";
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
};
const intentionSchema = z.object({ key: z.uuid(), version: z.number().int().positive().max(2147483647).optional(), documentOptions: pdfDocumentOptionsSchema.optional() }).strict();
type Intention = z.infer<typeof intentionSchema>;
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
}: Props & { userId: string; canAudit: boolean; canAccess: boolean; }) {
  const headingId = useId(),
    scope = `hca:pdf-intention:${userId}:${id}`,
    endpoint = `/api/documents/${id}/issuances`;
  const [rows, setRows] = useState<PdfArchiveEntry[]>([]),
    [next, setNext] = useState<PdfArchiveCursor | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [readError, setReadError] = useState(""),
    [pending, setPending] = useState<Intention | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false), [integrityError, setIntegrityError] = useState(false);
  const [activityStage, setActivityStage] = useState(0);
  useOperationActivity(busy, { title: "Emissão de PDF", detail: "Estamos conferindo a mesma solicitação. Aguarde a confirmação do exemplar.", stage: activityStage, steps: [{ label: "Preparando a emissão", icon: "file" }, { label: "Gerando e assinando o exemplar", icon: "shield" }, { label: "Conferindo o arquivo registrado", icon: "check" }] });
  const busyRef = useRef(false),
    sequenceRef = useRef(0);
  const invalidate = useCallback(() => {
    sequenceRef.current++;
  }, []);
  const load = useCallback(
    async (cursor?: PdfArchiveCursor, quiet = false) => {
      const own = ++sequenceRef.current;
      if (!quiet) setLoading(true);
      try {
        const query = new URLSearchParams();
        if (archiveVersion) query.set("version", String(archiveVersion));
        if (cursor) {
          query.set("before", cursor.at);
          query.set("kind", cursor.kind);
          query.set("reference", cursor.reference);
        }
        const raw = await api<unknown>(
          `/api/documents/${id}/archive${query.size ? "?" + query : ""}`,
        );
        const page = pdfArchivePageSchema.safeParse(raw);
        if (!page.success)
          throw new Error(
            "Não foi possível confirmar a lista de arquivos. Consulte novamente.",
          );
        if (own !== sequenceRef.current) return;
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
        setNext(page.data.next);
        setReadError("");
      } catch (reason) {
        if (own === sequenceRef.current) {
          if (
            reason instanceof ApiError &&
            [401, 403].includes(reason.status)
          ) {
            setRows([]);
            setNext(null);
          }
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
    [id, archiveVersion],
  );
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
      void load();
    });
    return () => {
      live = false;
      invalidate();
    };
  }, [load, scope, invalidate]);
  useEffect(() => {
    if (!busy && !pending) return;
    const timer = setInterval(() => void load(undefined, true), 2000);
    const deadline = setTimeout(() => clearInterval(timer), 60000);
    return () => {
      clearInterval(timer);
      clearTimeout(deadline);
    };
  }, [busy, pending, load]);
  async function generate(documentOptions?: DocumentOptions) {
    if (busyRef.current || integrityError || generationBlocked && !pending) return;
    busyRef.current = true;
    setBusy(true);
    setActivityStage(0);
    setError("");
    setMessage("Consultando a mesma intenção de emissão…");
    try {
      const intention = pending ?? {
        key: crypto.randomUUID(),
        ...(version ? { version } : {}),
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
      await load();
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
  const visibleRows = rows.filter(entry => {
    if (entry.kind !== "issuance") return true;
    const options = entry.issuance.documentOptions;
    return !options || (options.mode !== "audit" || canAudit) && (!options.sections.includes("access") || canAccess);
  });
  const verification = visibleRows.find(entry => entry.issuance.state === "ready")?.issuance;
  return (
    <section aria-labelledby={headingId} className="doc-area print:hidden">
      <header className="doc-section-heading"><div><h2 id={headingId}>Arquivos gerados</h2><p>Exemplares emitidos a partir desta ficha.</p></div><div className="doc-heading-actions">
        <DocumentActionSlot target={actionTarget}>
          <button
            className={buttonClass}
            type="button"
            disabled={busy || integrityError || generationBlocked && !pending}
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
        </DocumentActionSlot>
        <button
          className={buttonClass}
          type="button"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar arquivos
        </button>
        <button className={buttonClass} type="button" disabled={busy || Boolean(pending) || integrityError || generationBlocked} onClick={() => setOptionsOpen(true)}>Escolher conteúdo do PDF</button>
      </div></header>
      {generationBlocked ? <p role="status">Atualize a ficha para gerar um novo PDF. Os exemplares já emitidos continuam disponíveis.</p> : null}
      <PdfDocumentOptions key={optionsOpen ? "choosing" : "closed"} open={optionsOpen} onClose={() => setOptionsOpen(false)} canAudit={canAudit} canAccess={canAccess} onGenerate={value => { setOptionsOpen(false); onAction?.(); void generate(value); }} />
      {message ? <p role="status">{message}</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {readError ? <Notice error>{readError}</Notice> : null}
      {loading ? (
        <p role="status">Consultando arquivos…</p>
      ) : !visibleRows.length ? (
        <p>
          Nenhum arquivo registrado nesta consulta. Use Gerar PDF para uma nova
          emissão explícita.
        </p>
      ) : null}
      <div className="doc-card doc-file-acervo"><ul className="doc-file-list doc-file-list-compact" aria-label="Exemplares registrados">
        {visibleRows.map((entry) => {
          const row = entry.issuance;
          return (
            <FileRecord key={row.id} identity={row.id} mime="application/pdf"
              title={<>{code} · {row.documentOptions ? documentModeLabel(row.documentOptions) : "Ficha"}{row.version < (version ?? row.version) ? <span className="doc-chip">Conteúdo anterior</span> : null}</>}
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
