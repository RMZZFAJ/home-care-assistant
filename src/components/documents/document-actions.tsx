"use client";
import { useEffect, useState } from "react";
import { buttonClass, Notice } from "@/components/workspace";

export function DocumentActions({
  id,
  code,
  version,
}: {
  id: string;
  code: string;
  version?: number;
}) {
  const [prepared, setPrepared] = useState<{
    id: string;
    version?: number;
    file: File;
  } | null>(null);
  const file =
    prepared?.id === id && prepared.version === version ? prepared.file : null;
  const [message, setMessage] = useState(
    "Preparando PDF; acompanhamento inicial dos avisos por até 10 segundos.",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = setTimeout(() => {
      controller.abort();
      setMessage(
        "Documento salvo. Os avisos continuam sendo processados; consulte o acompanhamento.",
      );
    }, 10_000);
    const pdf = async () => {
      const response = await fetch(
        `/api/documents/${id}/pdf${version ? "?version=" + version : ""}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(
          "O PDF continua disponível pelo botão Baixar PDF. Tente novamente se a preparação estiver pendente.",
        );
      const next = new File([await response.blob()], code + ".pdf", {
        type: "application/pdf",
      });
      if (!controller.signal.aborted) setPrepared({ id, version, file: next });
    };
    const track = async () => {
      try {
        const response = await fetch(`/api/documents/${id}/notifications`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const body = (await response.json()) as {
            data: { state: string; channel: string }[];
          };
          const pending = body.data.filter((row) =>
            ["pending", "processing", "uncertain"].includes(row.state),
          ).length;
          if (!controller.signal.aborted)
            setMessage(
              pending
                ? `Documento salvo · ${pending} aviso(s) aguardando resultado.`
                : "Documento salvo. Consulte os estados individuais dos avisos abaixo.",
            );
          if (pending && !controller.signal.aborted)
            timer = setTimeout(() => void track(), 1800);
        }
      } catch {
        /* The fixed deadline bounds initial tracking; no provider success is assumed. */
      }
    };
    void pdf().catch((reason) => {
      if (!controller.signal.aborted) setError(reason.message);
    });
    void track();
    return () => {
      controller.abort();
      clearTimeout(deadline);
      clearTimeout(timer);
    };
  }, [id, code, version]);
  async function share() {
    if (!file) return;
    setError("");
    try {
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: code, files: [file] });
      else {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(
          "PDF baixado. Anexe o arquivo no aplicativo em que deseja compartilhar.",
        );
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        setError(
          "Não foi possível compartilhar o arquivo. Baixe o PDF e anexe manualmente.",
        );
    }
  }
  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-3">
        <a
          className={buttonClass}
          href={`/api/documents/${id}/pdf${version ? "?version=" + version : ""}`}
          target="_blank"
          rel="noopener"
        >
          Baixar PDF
        </a>
        <button
          className={buttonClass}
          type="button"
          disabled={!file}
          onClick={() => void share()}
        >
          Compartilhar PDF
        </button>
      </div>
      <p className="text-xs text-(--muted)" role="status">
        {message}
      </p>
      {error ? <Notice error>{error}</Notice> : null}
    </div>
  );
}
