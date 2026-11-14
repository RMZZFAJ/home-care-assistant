"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { api, ApiError, Notice } from "@/components/workspace";
import {
  balancePreparationListSchema,
  type BalancePreparationList,
} from "@/lib/validation/balance-preparations";
import { balancePreparationTitles } from "@/lib/forms/balance-preparation-purposes";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalancePreparationSelection } from "./balance-workspace-preparation";
export function BalancePreparationsList({
  patientId,
  revision,
  onOpen,
}: {
  patientId: string;
  revision: number;
  onOpen: (s: BalancePreparationSelection, opener: HTMLElement) => void;
}) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<BalancePreparationList["items"]>([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [readyRevision, setReadyRevision] = useState(-1);
  const activeReadRef = useRef<AbortController | null>(null);
  const read = useCallback(
    async (
      cursor?: { createdAt: string; id: string },
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({ careRecipientId: patientId });
      if (cursor) {
        params.set("before", cursor.createdAt);
        params.set("beforeId", cursor.id);
      }
      const parsed = balancePreparationListSchema.parse(
        (
          await api<{ data: unknown }>(
            "/api/balances/preparations/list?" + params,
            undefined,
            signal,
          )
        ).data,
      );
      if (signal?.aborted) return;
      setItems((previous) =>
        cursor
          ? [
              ...previous,
              ...parsed.items.filter(
                (row) => !previous.some((p) => p.id === row.id),
              ),
            ]
          : parsed.items,
      );
      setTotal(parsed.total);
      setMore(parsed.items.length === 20);
      setError("");
      setReadyRevision(revision);
    },
    [patientId, revision],
  );
  useEffect(() => {
    if (!open) return;
    activeReadRef.current?.abort();
    const controller = new AbortController();
    activeReadRef.current = controller;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setBusy(true);
      try {
        await read(undefined, controller.signal);
      } catch (e) {
        if (!controller.signal.aborted) {
          if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
            setItems([]);
            setTotal(0);
            setMore(false);
          }
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar seus preenchimentos.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    });
    return () => activeReadRef.current?.abort();
  }, [open, revision, read]);
  async function loadMore() {
    if (busy) return;
    activeReadRef.current?.abort();
    const controller = new AbortController();
    activeReadRef.current = controller;
    setBusy(true);
    try {
      await read(items.at(-1), controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) {
        if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
          setItems([]);
          setTotal(0);
          setMore(false);
        }
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível consultar seus preenchimentos.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <details
      className="ui-card"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Meus preenchimentos privados de programação e plantões</summary>
      <p>
        Somente seus preenchimentos e resultados preservados. Salvar não
        registra uma decisão, presença ou contagem física.
      </p>
      {busy || (readyRevision !== revision && !error) ? (
        <Notice>Consultando seus preenchimentos…</Notice>
      ) : null}
      {error ? (
        <Notice error>
          {error}
          <ActionButton disabled={busy} onClick={() => void loadMore()}>
            Consultar novamente
          </ActionButton>
        </Notice>
      ) : null}
      {!busy && readyRevision === revision && !error && !items.length ? (
        <p>
          Nenhum preenchimento privado ativo ou resultado aguardando
          reconhecimento nesta consulta.
        </p>
      ) : null}
      {items.length ? (
        <p>
          {items.length} de {total} preenchimento(s) consultado(s).
        </p>
      ) : null}
      {items.map((row) => (
        <article key={row.id} className="hca-record">
          <div className="hca-record-main">
            <strong>{balancePreparationTitles[row.purpose]}</strong>
            <p>
              {row.state === "consumed"
                ? "Resultado preservado; não confirma a situação atual."
                : "Preenchimento privado ainda não utilizado em uma decisão."}
            </p>
            <small>
              Salvo em {formatZonedDate(row.savedAt, "America/Sao_Paulo")}.
            </small>
          </div>
          <ActionButton
            onClick={(e) =>
              onOpen(
                {
                  purpose: row.purpose,
                  targetResourceId: row.targetResourceId,
                },
                e.currentTarget,
              )
            }
          >
            {row.state === "consumed"
              ? "Consultar meu resultado"
              : "Retomar meu preenchimento"}
          </ActionButton>
        </article>
      ))}
      {more && !error ? (
        <ActionButton disabled={busy} onClick={() => void loadMore()}>
          Consultar mais preenchimentos
        </ActionButton>
      ) : null}
    </details>
  );
}
