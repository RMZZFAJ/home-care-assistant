"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass, Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { api, TransportError } from "@/lib/client/api";
import {
  pdfIssuancePageSchema,
  pdfIssuanceSchema,
  type PdfIssuance,
} from "@/lib/documents/pdf-issuance";
import { formatBrazilDate } from "@/lib/receipt";

type Props = { id: string; code: string; version?: number };
type Intention = { key: string; version?: number };
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
  const { data } = useWorkspaceState();
  return data ? (
    <GeneratedFiles
      key={`${data.userId}:${props.id}`}
      {...props}
      userId={data.userId}
    />
  ) : (
    <p role="status">Validando acesso aos arquivos…</p>
  );
}
function InitialNoticeTracking({ id }: { id: string }) {
  const [message, setMessage] = useState(
    "Documento salvo. Consultando os avisos iniciais…",
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = setTimeout(() => {
      controller.abort();
      setMessage(
        "Documento salvo. Os avisos continuam sendo processados; consulte o acompanhamento.",
      );
    }, 10000);
    async function track() {
      try {
        const response = await fetch(`/api/documents/${id}/notifications`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const body = await response.json(),
            pending = body.data.filter((r: { state: string }) =>
              ["pending", "processing", "uncertain"].includes(r.state),
            ).length;
          if (!controller.signal.aborted) {
            setMessage(
              pending
                ? `Documento salvo · ${pending} aviso(s) aguardando resultado.`
                : "Documento salvo. Consulte os estados individuais dos avisos abaixo.",
            );
            if (pending) timer = setTimeout(() => void track(), 1800);
          }
        }
      } catch {
        /* Tracking has a fixed deadline; no provider success is assumed. */
      }
    }
    void track();
    return () => {
      controller.abort();
      clearTimeout(deadline);
      clearTimeout(timer);
    };
  }, [id]);
  return (
    <p className="text-xs text-(--muted)" role="status">
      {message}
    </p>
  );
}
function GeneratedFiles({
  id,
  code,
  version,
  userId,
}: Props & { userId: string }) {
  const headingId = useId(),
    scope = `hca:pdf-intention:${userId}:${id}`,
    endpoint = `/api/documents/${id}/issuances`;
  const [rows, setRows] = useState<PdfIssuance[]>([]),
    [next, setNext] = useState<{ at: string; id: string } | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<Intention | null>(null);
  const busyRef = useRef(false),
    sequenceRef = useRef(0);
  const invalidate = useCallback(() => {
    sequenceRef.current++;
  }, []);
  const load = useCallback(
    async (cursor?: { at: string; id: string }) => {
      const own = ++sequenceRef.current;
      setLoading(true);
      try {
        const raw = await api<unknown>(
          endpoint +
            (cursor
              ? `?before=${encodeURIComponent(cursor.at)}&beforeId=${cursor.id}`
              : ""),
        );
        const page = pdfIssuancePageSchema.safeParse(raw);
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
                  (r) => !current.some((c) => c.id === r.id),
                ),
              ]
            : page.data.data,
        );
        setNext(page.data.next);
      } catch (reason) {
        if (own === sequenceRef.current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os arquivos.",
          );
      } finally {
        if (own === sequenceRef.current) setLoading(false);
      }
    },
    [endpoint],
  );
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      try {
        const stored = JSON.parse(sessionStorage.getItem(scope) ?? "null");
        if (
          stored &&
          typeof stored.key === "string" &&
          /^[0-9a-f-]{36}$/i.test(stored.key) &&
          (stored.version === undefined ||
            (Number.isInteger(stored.version) && stored.version > 0))
        )
          setPending(stored);
      } catch {
        /* A damaged local hint never becomes a server command. */
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
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, [busy, pending, load]);
  async function generate() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("Consultando a mesma intenção de emissão…");
    try {
      const intention = pending ?? {
        key: crypto.randomUUID(),
        ...(version ? { version } : {}),
      };
      sessionStorage.setItem(scope, JSON.stringify(intention));
      setPending(intention);
      const raw = await api<unknown>(endpoint, {
        idempotencyKey: intention.key,
        ...(intention.version ? { version: intention.version } : {}),
      });
      const parsed = pdfIssuanceSchema.safeParse(raw);
      if (!parsed.success)
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
          "Arquivo assinado, conferido e armazenado. Visualize ou baixe o exemplar abaixo.",
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
  return (
    <section aria-labelledby={headingId} className="space-y-3 print:hidden">
      <h3 id={headingId} className="font-semibold">
        Arquivos gerados
      </h3>
      <div className="flex flex-wrap gap-3">
        <button
          className={buttonClass}
          type="button"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? "Gerando PDF…" : pending ? "Recuperar emissão" : "Gerar PDF"}
        </button>
        <button
          className={buttonClass}
          type="button"
          disabled={loading}
          onClick={() => void load()}
        >
          Atualizar arquivos
        </button>
      </div>
      <p className="text-xs text-(--muted)">
        Cada nova geração cria um exemplar. Visualizar e baixar recuperam o
        arquivo registrado.
      </p>
      {message ? <p role="status">{message}</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {loading ? (
        <p role="status">Consultando arquivos…</p>
      ) : !rows.length ? (
        <p>
          Nenhum exemplar gerado neste fluxo. PDFs antigos permanecem no
          histórico do documento.
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-(--border) p-3">
            <p className="font-medium">
              {code} · Versão {row.version} · {steps[row.step]}
            </p>
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
            {row.state === "ready" ? (
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
            <details className="mt-2 text-sm">
              <summary>Identificação do exemplar</summary>
              <p className="break-all">{row.id}</p>
              <p className="break-all">
                Código: HCA-{row.verificationCode.match(/.{4}/g)?.join("-")}
              </p>
            </details>
          </li>
        ))}
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
      <InitialNoticeTracking id={id} />
    </section>
  );
}
