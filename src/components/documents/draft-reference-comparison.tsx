"use client";
import { useCallback, type ReactNode } from "react";
import { Notice, buttonClass } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parseDocumentHistoryRead } from "@/lib/validation/document-history";
import type { VersionComparison } from "@/lib/documents/version-history";
import { VersionFacts } from "./document-timeline";

/** Official frozen facts are read through the existing Auth boundary, never from draft fields. */
export function DraftReferenceComparison({
  id,
  fromVersion,
  toVersion,
  children,
}: {
  id: string;
  fromVersion: number;
  toVersion: number;
  children: (ready: boolean) => ReactNode;
}) {
  const revision = useLiveRevision();
  const decode = useCallback(
    (value: unknown) =>
      parseDocumentHistoryRead(value, id, toVersion, fromVersion),
    [id, toVersion, fromVersion],
  );
  const read = useScopedRead<{ data: VersionComparison }>(
    `/api/documents/${id}/history?version=${toVersion}&before=${fromVersion}`,
    String(revision),
    decode,
  );
  const ready = !!read.data && !read.loading && !read.error;
  const comparison = ready ? read.data!.data : null;
  return (
    <section
      className="hca-form-stack"
      aria-label="Fatos oficiais das referências da operação"
    >
      <h3>Fatos preservados nas duas versões</h3>
      <p>
        Estes fatos vêm do histórico autorizado. O preenchimento privado não
        substitui a parcela, a autoria, as quantidades ou as consequências
        registradas na ficha.
      </p>
      {read.loading ? (
        <p role="status">Consultando as duas referências exatas…</p>
      ) : null}
      {read.error ? (
        <Notice error>
          Não foi possível conferir as referências oficiais. {read.error} Seu
          preenchimento permanece preservado; a referência vigente não foi
          adotada.
        </Notice>
      ) : null}
      <button
        type="button"
        className={buttonClass}
        aria-disabled={read.loading}
        onClick={() => {
          if (!read.loading) read.refresh();
        }}
      >
        Consultar novamente as referências da operação
      </button>
      {comparison?.before ? (
        <>
          {comparison.before.additionalFields ||
          comparison.selected.additionalFields ? (
            <Notice>
              Há dados adicionais preservados além desta descrição. Consulte
              também Versões e integridade e o arquivo exato antes de confirmar
              a operação.
            </Notice>
          ) : null}
          <VersionFacts version={comparison.before} />
          <VersionFacts version={comparison.selected} />
        </>
      ) : null}
      {children(ready)}
    </section>
  );
}
