"use client";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  can,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { ActionButton, Pill } from "@/components/ui/controls";
import type { CatalogProduct } from "@/types/documents";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import {
  parseFlowPage,
  type FlowSubmission,
} from "@/lib/validation/flow-reviews";
import { parseFlowPreparationList } from "@/lib/validation/flow-preparations";
import { FlowReviewPreparation } from "./flow-review-preparation";
type Cursor = { at: string; id: string };
export function FlowReviews({
  context,
  products,
  catalogReady,
  onChange,
}: {
  context: WorkspaceContext;
  products: CatalogProduct[];
  catalogReady: boolean;
  onChange: () => void;
}) {
  const patientId = context.patient!.id,
    canWrite =
      can(context, "consumption.report") &&
      context.patient!.is_active !== false &&
      context.patient!.active !== false,
    live = useLiveRevision();
  const [page, setPage] = useState(1),
    [attempt, setAttempt] = useState(0),
    [result, setResult] = useState<{
      key: string;
      data: ReturnType<typeof parseFlowPage>;
    } | null>(null),
    [failure, setFailure] = useState<{
      key: string;
      message: string;
      denied: boolean;
    } | null>(null);
  const [privateRead, setPrivateRead] = useState<{
      key: string;
      scopeKey: string;
      data: ReturnType<typeof parseFlowPreparationList>;
    } | null>(null),
    [privateFailure, setPrivateFailure] = useState<{
      key: string;
      message: string;
      denied: boolean;
    } | null>(null),
    [cursors, setCursors] = useState<(Cursor | null)[]>([null]);
  const cursor = cursors[cursors.length - 1],
    readKey = JSON.stringify([patientId, page, attempt, live]),
    privateScope = JSON.stringify([
      context.userId,
      patientId,
      cursor,
      context.patient!.capabilities,
      context.patient!.is_active,
      context.patient!.active,
    ]),
    privateKey = JSON.stringify([privateScope, attempt, live]),
    sourceLoading =
      canWrite && result?.key !== readKey && failure?.key !== readKey,
    privateLoading =
      privateRead?.key !== privateKey && privateFailure?.key !== privateKey;
  const [selected, setSelected] = useState<{
      target: string;
      source?: FlowSubmission;
      accept: boolean;
      opener: HTMLElement;
    } | null>(null),
    headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!canWrite) return;
    const controller = new AbortController();
    api<unknown>(
      `/api/whatsapp/flows/submissions?careRecipientId=${patientId}&page=${page}&pageSize=20`,
      undefined,
      controller.signal,
    )
      .then(parseFlowPage)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key: readKey, data });
          setFailure(null);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setFailure({
            key: readKey,
            message:
              cause instanceof Error
                ? cause.message
                : "Não foi possível consultar sugestões.",
            denied:
              cause instanceof ApiError &&
              [401, 403, 404, 409].includes(cause.status),
          });
      });
    return () => controller.abort();
  }, [patientId, page, readKey, canWrite]);
  useEffect(() => {
    const controller = new AbortController(),
      params = new URLSearchParams({ careRecipientId: patientId, limit: "20" });
    if (cursor) {
      params.set("before", cursor.at);
      params.set("beforeId", cursor.id);
    }
    api<unknown>(
      "/api/whatsapp/flows/preparations/list?" + params,
      undefined,
      controller.signal,
    )
      .then(parseFlowPreparationList)
      .then((data) => {
        if (!controller.signal.aborted) {
          setPrivateRead({ key: privateKey, scopeKey: privateScope, data });
          setPrivateFailure(null);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setPrivateFailure({
            key: privateKey,
            message:
              cause instanceof Error
                ? cause.message
                : "Não foi possível consultar seus preenchimentos.",
            denied:
              cause instanceof ApiError &&
              [401, 403, 404].includes(cause.status),
          });
      });
    return () => controller.abort();
  }, [patientId, cursor, privateKey, privateScope]);
  const sourceRows =
      canWrite && !failure?.denied && result?.data.page === page
        ? result.data.data
        : [],
    ownPage = privateRead?.scopeKey === privateScope ? privateRead.data : null,
    ownRows = !privateFailure?.denied ? (ownPage?.data ?? []) : [],
    total = result?.data.total ?? 0;
  function refreshed() {
    // A verified review is terminal. Remove its pending action before restoring focus.
    const target = selected?.target;
    if (target)
      setResult((previous) => {
        if (!previous || !previous.data.data.some((row) => row.id === target))
          return previous;
        return {
          ...previous,
          data: {
            ...previous.data,
            data: previous.data.data.filter((row) => row.id !== target),
            total: previous.data.total - 1,
          },
        };
      });
    setSelected(null);
    setAttempt((n) => n + 1);
    onChange();
  }
  return (
    <section
      className="ui-card hca-form-stack"
      aria-label="Relatos recebidos por Flow"
    >
      <h2 ref={headingRef} tabIndex={-1}>
        Relatos recebidos por Flow
      </h2>
      <p>
        {result?.data.configured
          ? "Confira os dados recebidos no WhatsApp antes de registrá-los no aplicativo."
          : "O canal de Flows aguarda configuração do provedor. Sugestões já recebidas continuam disponíveis para revisão."}
      </p>
      <ActionButton onClick={() => setAttempt((n) => n + 1)}>
        Atualizar sugestões
      </ActionButton>
      <section
        className="hca-form-stack"
        aria-label="Sugestões pendentes do Flow"
      >
        <h3>Sugestões que aguardam revisão</h3>
        {!canWrite ? (
          <Notice>
            Novas revisões exigem autorização atual e paciente ativo. Seus
            preenchimentos preservados podem ser consultados abaixo.
          </Notice>
        ) : null}
        {sourceLoading ? <p role="status">Consultando sugestões…</p> : null}
        {failure && canWrite ? <Notice error>{failure.message}</Notice> : null}
        <ul className="hca-form-stack">
          {sourceRows.map((row) => (
            <li className="hca-record hca-form-stack" key={row.id}>
              <p className="whitespace-pre-wrap wrap-anywhere">
                {row.body.text ?? "Relato recebido para revisão"}
              </p>
              <p>Recebido em {formatBrazilDate(row.created_at)}</p>
              <div className="hca-toolbar">
                <ActionButton
                  disabled={!catalogReady}
                  onClick={(e) =>
                    setSelected({
                      target: row.id,
                      source: row,
                      accept: true,
                      opener: e.currentTarget,
                    })
                  }
                >
                  Conferir sugestão
                </ActionButton>
                <ActionButton
                  onClick={(e) =>
                    setSelected({
                      target: row.id,
                      source: row,
                      accept: false,
                      opener: e.currentTarget,
                    })
                  }
                >
                  Descartar sugestão
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
        {canWrite && !sourceLoading && !failure && !sourceRows.length ? (
          <p>Nenhuma sugestão pendente de confirmação.</p>
        ) : null}
        {canWrite && total > 20 && !failure?.denied ? (
          <nav className="hca-toolbar" aria-label="Páginas das sugestões">
            <ActionButton
              disabled={sourceLoading || page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Página anterior de sugestões
            </ActionButton>
            <span>
              Página {page} de {Math.ceil(total / 20)} · {total} sugestões
            </span>
            <ActionButton
              disabled={sourceLoading || page * 20 >= total}
              onClick={() => setPage((v) => v + 1)}
            >
              Próxima página de sugestões
            </ActionButton>
          </nav>
        ) : null}
      </section>
      <section
        className="hca-form-stack"
        aria-label="Meus preenchimentos e resultados do Flow"
      >
        <h3>Meus preenchimentos e resultados do Flow</h3>
        <p>
          Somente seus preenchimentos e resultados ainda não reconhecidos
          aparecem aqui. Recuperar uma revisão não confirma consumo nem desconta
          estoque.
        </p>
        {privateLoading ? (
          <p role="status">Consultando preenchimentos do Flow…</p>
        ) : null}
        {privateFailure ? (
          <Notice error>{privateFailure.message}</Notice>
        ) : null}
        <ul className="hca-form-stack">
          {ownRows.map((row) => (
            <li className="hca-record hca-form-stack" key={row.id}>
              <Pill tone={row.state === "consumed" ? "success" : "neutral"}>
                {row.state === "consumed"
                  ? "Revisão registrada"
                  : "Preenchimento privado"}
              </Pill>
              <p>
                Salvo em {formatBrazilDate(row.savedAt)} · revisão{" "}
                {row.revision}
              </p>
              <p className="wrap-anywhere">Sugestão: {row.targetResourceId}</p>
              <ActionButton
                onClick={(e) =>
                  setSelected({
                    target: row.targetResourceId,
                    accept: true,
                    opener: e.currentTarget,
                  })
                }
              >
                {row.state === "consumed"
                  ? "Consultar resultado do Flow"
                  : "Retomar preenchimento do Flow"}
              </ActionButton>
            </li>
          ))}
        </ul>
        {!privateLoading && !privateFailure && !ownRows.length ? (
          <p>Nenhum preenchimento ou resultado pessoal pendente.</p>
        ) : null}
        {cursors.length > 1 || ownPage?.next ? (
          <nav
            className="hca-toolbar"
            aria-label="Páginas dos preenchimentos do Flow"
          >
            <ActionButton
              disabled={privateLoading || cursors.length === 1}
              onClick={() => setCursors((v) => v.slice(0, -1))}
            >
              Página anterior dos preenchimentos do Flow
            </ActionButton>
            <span>Página {cursors.length}</span>
            <ActionButton
              disabled={privateLoading || !ownPage?.next}
              onClick={() => {
                const next = ownPage?.next;
                if (next) setCursors((v) => [...v, next]);
              }}
            >
              Próxima página dos preenchimentos do Flow
            </ActionButton>
          </nav>
        ) : null}
      </section>
      {selected ? (
        <FlowReviewPreparation
          key={context.userId + ":" + selected.target}
          context={context}
          target={selected.target}
          source={selected.source}
          initialAccept={selected.accept}
          products={products}
          restoreFocusTo={selected.opener}
          restoreFocusFallbackRef={headingRef}
          onClose={() => setSelected(null)}
          onSaved={refreshed}
        />
      ) : null}
    </section>
  );
}
