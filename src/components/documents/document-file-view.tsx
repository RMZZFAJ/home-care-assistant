"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Workspace, Notice } from "@/components/workspace";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { api } from "@/lib/client/api";
import { activeDocumentArchive } from "@/lib/documents/document-archive";
import { DocumentActions } from "./document-actions";
type ArchiveDocument = { id: string; code: string; version: number; workflow_data?: { documentArchive?: unknown } };
export function DocumentFileView({
  id,
  version,
  historyBefore,
}: {
  id: string;
  version?: number;
  historyBefore?: number;
}) {
  const { data, loading } = useWorkspaceState(),
    doc = data?.documentContext?.id === id ? data.documentContext : null;
  const [record, setRecord] = useState<ArchiveDocument | null>(null),
    [error, setError] = useState("");
  const currentRecord = record?.id === id ? record : null;
  useEffect(() => {
    if (!doc) return;
    const controller = new AbortController();
    void api<{ data: ArchiveDocument }>(
      `/api/documents/${id}`,
      undefined,
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) {
          setRecord(r.data);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar este documento.",
          );
      });
    return () => controller.abort();
  }, [id, doc]);
  return (
    <Workspace title="Arquivos do documento">
      {() =>
        doc ? (
          <section className="hca-record-detail doc-page">
            <header className="doc-section-heading"><div><h2>
              {currentRecord?.code ?? "Documento autorizado"}
              {version
                ? ` · Versão de origem ${version}`
                : " · Todas as versões"}
            </h2>
            <p>
              Baixe um exemplar registrado ou solicite explicitamente outra
              emissão. Uma nova representação histórica usa o momento e a
              assinatura técnica atuais.
            </p></div></header>
            {error ? (
              <Notice error>{error}</Notice>
            ) : currentRecord ? (
              <DocumentActions
                id={id}
                code={currentRecord.code}
                version={currentRecord.version}
                archiveVersion={version}
                consolidatedId={activeDocumentArchive(currentRecord.workflow_data?.documentArchive)?.issuanceId}
                trackNotices={false}
              />
            ) : (
              <p role="status">Consultando documento…</p>
            )}
            {version ? (
              <Link
                href={`/documentos/${id}/arquivos`}
                className="ui-button ui-button-secondary"
              >
                Ver arquivos de todas as versões
              </Link>
            ) : null}
            <Link
              href={`/historico/${id}${version ? `?historyVersion=${version}${historyBefore ? "&historyBefore=" + historyBefore : ""}` : ""}`}
              className="ui-button ui-button-secondary"
            >
              Voltar ao acompanhamento
            </Link>
          </section>
        ) : (
          <Notice error={!loading}>
            {loading
              ? "Identificando documento autorizado…"
              : "Documento indisponível neste contexto."}
          </Notice>
        )
      }
    </Workspace>
  );
}
