"use client";
import { z } from "zod";
import { PdfDocumentOptions } from "./pdf-document-options";
import { pdfDocumentOptionsSchema, documentModeLabel, type PdfDocumentOptions as DocumentOptions } from "@/lib/documents/pdf-modes";
import { FileRecord } from "@/components/ui/file-record";
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
      const raw = await api<unknown>(endpoint, {
        idempotencyKey: intention.key,
        ...(intention.version ? { version: intention.version } : {}),
        ...(intention.documentOptions ? { documentOptions: intention.documentOptions } : {}),
      });
      const parsed = pdfIssuanceSchema.safeParse(raw);
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
  return (
    <section aria-labelledby={headingId} className="space-y-3 print:hidden">
      <h3 id={headingId} className="font-semibold">
        Arquivos gerados
      </h3>
      <div className="flex flex-wrap gap-3">
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
      </div>
      {generationBlocked ? <p role="status">Atualize a ficha para gerar um novo PDF. Os exemplares já emitidos continuam disponíveis.</p> : null}
      <button className={buttonClass} type="button" disabled={busy || Boolean(pending) || integrityError || generationBlocked} onClick={() => setOptionsOpen(true)}>Escolher conteúdo do PDF</button>
      <PdfDocumentOptions key={optionsOpen ? "choosing" : "closed"} open={optionsOpen} onClose={() => setOptionsOpen(false)} canAudit={canAudit} canAccess={canAccess} onGenerate={value => { setOptionsOpen(false); onAction?.(); void generate(value); }} />
      <p className="text-xs text-(--muted)">
        Cada nova geração cria um exemplar. Visualizar e baixar recuperam o
        arquivo registrado.
      </p>
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
      <ul className="hca-file-records" aria-label="Exemplares registrados">
        {visibleRows.map((entry) => {
          const row = entry.issuance;
          return (
            <FileRecord key={row.id} identity={row.id} mime="application/pdf"
              title={<>{code}{row.documentOptions ? " · " + documentModeLabel(row.documentOptions) : ""} · Versão {row.version} · {steps[row.step]}</>}
              actions={<>              {row.state === "ready" ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  <a
                    className={buttonClass}
                    href={`/api/documents/${id}/pdf?issuance=${row.id}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Visualizar PDF
                  </a>
                  <a
                    className={buttonClass}
                    href={`/api/documents/${id}/pdf?issuance=${row.id}`}
                    download
                  >
                    Baixar PDF
                  </a>
                  <button
                    className={buttonClass}
                    type="button"
                    onClick={() => void share(row)}
                  >
                    Compartilhar PDF
                  </button>
                </div>
              ) : (
                <p className="text-sm">
                  {row.state === "uncertain"
                    ? "Arquivo ainda não confirmado. O solicitante pode recuperar a mesma emissão."
                    : "O arquivo ficará disponível após assinatura, validação e confirmação do armazenamento."}
                </p>
              )}
              </>}
            >
              <p className="text-sm">
                Solicitado por {row.requestedName} ·{" "}
                {formatBrazilDate(row.requestedAt)}
              </p>
              {row.readyAt ? (
                <p className="text-sm">
                  Emissão concluída em {formatBrazilDate(row.readyAt)} ·
                  Assinatura técnica e carimbo internos
                </p>
              ) : null}
              {row.representation === "derived" ? (
                <p className="text-sm">
                  Nova representação de uma versão histórica, gerada no momento
                  indicado.
                </p>
              ) : null}
              <details className="mt-2 text-sm">
                <summary>Identificação do exemplar</summary>
                <p className="break-all">{row.id}</p>
                <p className="break-all">
                  Código: HCA-{row.verificationCode.match(/.{4}/g)?.join("-")}
                </p>
              </details>
            </FileRecord>
          );
        })}
      </ul>
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
