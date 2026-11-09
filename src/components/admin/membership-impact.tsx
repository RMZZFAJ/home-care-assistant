"use client";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { api, Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { documentStatuses } from "@/types/documents";
import type { ImpactSet, MembershipImpactData } from "@/types/memberships";
function Impacts<T extends { id: string }>({
  title,
  group,
  children,
}: {
  title: string;
  group: ImpactSet<T>;
  children: (item: T) => ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="font-semibold">
        {title} · {group.available ? group.total : "consulta não autorizada"}
      </h4>
      {group.available ? (
        <>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-(--line) p-3 text-sm"
              >
                {children(item)}
              </li>
            ))}
          </ul>
          {group.total === 0 ? (
            <p className="text-sm text-(--muted)">
              Nenhuma pendência deste tipo nesta consulta.
            </p>
          ) : null}
          {group.total! > group.items.length ? (
            <p className="text-sm">
              Mostradas {group.items.length} de {group.total}. Consulte o
              processo correspondente para ver os demais registros.
            </p>
          ) : null}
        </>
      ) : (
        <Notice>
          Suas permissões atuais não permitem consultar estas pendências. Isso
          não significa que não existam.
        </Notice>
      )}
    </section>
  );
}
export function MembershipImpact({
  patientId,
  userId,
}: {
  patientId: string;
  userId: string;
}) {
  const refreshRef = useRef<HTMLButtonElement>(null),
    focusAfterRefreshRef = useRef(false);
  const [attempt, setAttempt] = useState(0),
    [result, setResult] = useState<{
      key: string;
      data: MembershipImpactData | null;
      error: string;
    }>({ key: "", data: null, error: "" });
  const query = new URLSearchParams({
      careRecipientId: patientId,
      userId,
    }).toString(),
    requestKey = query + ":" + attempt,
    loading = result.key !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: MembershipImpactData }>(
      "/api/admin/membership-impact?" + query,
      undefined,
      controller.signal,
    ).then(
      (response) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, data: response.data, error: "" });
      },
      (cause) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            ...previous,
            key: requestKey,
            error:
              cause instanceof Error
                ? cause.message
                : "Não foi possível consultar as pendências.",
          }));
      },
    );
    return () => controller.abort();
  }, [query, requestKey]);
  const data =
    result.data?.careRecipientId === patientId && result.data.userId === userId
      ? result.data
      : null;
  useEffect(() => {
    if (!loading && focusAfterRefreshRef.current) {
      focusAfterRefreshRef.current = false;
      refreshRef.current?.focus();
    }
  }, [loading]);
  return (
    <section
      className="my-4 space-y-4"
      aria-label="Consequências do desligamento"
    >
      <h3 className="font-semibold">Pendências antes do desligamento</h3>
      <p>
        A revogação continua disponível durante esta consulta. Depois, encaminhe
        as tarefas futuras pelos processos próprios; recebimentos e autorias
        anteriores permanecem preservados.
      </p>
      {loading ? <LoadingIndicator label="Consultando pendências do vínculo" /> : null}
      {!loading && result.error ? <Notice error>{result.error}</Notice> : null}
      <ActionButton
        ref={refreshRef}
        disabled={loading}
        onClick={() => {
          focusAfterRefreshRef.current = true;
          setAttempt((v) => v + 1);
        }}
      >
        Atualizar pendências
      </ActionButton>
      {data ? (
        <>
          {loading || result.error ? (
            <Notice>
              Última consulta preservada. As pendências podem ter mudado.
            </Notice>
          ) : null}
          <p className="text-xs text-(--muted)">
            Consulta de {formatBrazilDate(data.checkedAt)} · {data.member.name}.
            Horários apresentados em Brasília.
          </p>
          <Impacts
            title="Entregas aguardando ato pessoal"
            group={data.deliveries}
          >
            {(item) => (
              <>
                <Link
                  className="font-semibold underline"
                  href={"/fichas/" + item.id}
                  prefetch={false}
                >
                  {item.code}
                </Link>
                <p>{documentStatuses[item.status] ?? item.status}</p>
                {item.lines.map((line) => (
                  <div key={line.id} className="mt-2">
                    <p className="wrap-break-word">{line.name}</p>
                    <p>
                      Aceite pessoal preservado:{" "}
                      {formatQuantity(line.acceptedQuantity, line.unit)}
                    </p>
                    <p>
                      Em trânsito:{" "}
                      {formatQuantity(line.pendingQuantity, line.unit)}
                    </p>
                  </div>
                ))}
                {item.lineCount > item.lines.length ? (
                  <p>
                    Mostradas {item.lines.length} de {item.lineCount} linhas;
                    veja a ficha completa.
                  </p>
                ) : null}
              </>
            )}
          </Impacts>
          <Impacts
            title="Regularizações administrativas designadas"
            group={data.regularizations}
          >
            {(item) => (
              <>
                <Link
                  className="font-semibold underline"
                  href={"/fichas/" + item.documentId}
                  prefetch={false}
                >
                  {item.code}
                </Link>
                <p>
                  {item.responsibilities
                    .map(
                      (r) =>
                        ({
                          proposal: "Proponente",
                          review: "Conferente independente",
                          follow_up: "Apuração futura",
                        })[r],
                    )
                    .join(" · ")}
                </p>
                <p>
                  Após revogar, a família deve encaminhar a pendência com
                  autoria própria.
                </p>
              </>
            )}
          </Impacts>
          <Impacts
            title="Balanços com responsabilidade vigente"
            group={data.balances}
          >
            {(item) => (
              <p>
                {formatBrazilDate(item.startsAt)} até{" "}
                {formatBrazilDate(item.endsAt)} ·{" "}
                {(
                  {
                    active: "Responsabilidade ativa",
                    missed: "Prazo perdido preservado",
                    deferred: "Adiado",
                  } as Record<string, string>
                )[item.status] ?? "Responsabilidade a conferir"}
              </p>
            )}
          </Impacts>
          <Impacts
            title="Propostas de adiamento para esta pessoa"
            group={data.deferrals}
          >
            {(item) => (
              <p>
                {formatBrazilDate(item.startsAt)} até{" "}
                {formatBrazilDate(item.endsAt)} · Aguardando decisão; ainda não
                transfere responsabilidade.
              </p>
            )}
          </Impacts>
          <Impacts title="Plantões em andamento ou futuros" group={data.shifts}>
            {(item) => (
              <p>
                {formatBrazilDate(item.startsAt)} até{" "}
                {formatBrazilDate(item.endsAt)} ·{" "}
                {item.status === "published" ? "Publicado" : "Proposto"}
              </p>
            )}
          </Impacts>
          <Impacts
            title="Propostas de escala envolvendo esta pessoa"
            group={data.shiftChanges}
          >
            {(item) => (
              <p>
                {formatBrazilDate(item.startsAt)} até{" "}
                {formatBrazilDate(item.endsAt)} · Aguardando decisão; confira o
                contexto antes de aprovar.
              </p>
            )}
          </Impacts>
          <div className="hca-toolbar">
            <Link className="underline" href="/entregas" prefetch={false}>
              Encaminhamentos de entregas
            </Link>
            <Link className="underline" href="/balancos" prefetch={false}>
              Balanços e responsáveis futuros
            </Link>
            <Link className="underline" href="/escalas" prefetch={false}>
              Revisar escala
            </Link>
          </div>
        </>
      ) : !loading && !result.error ? (
        <Notice>
          Não foi possível identificar o vínculo consultado. Atualize a
          consulta; a revogação permanece disponível.
        </Notice>
      ) : null}
    </section>
  );
}
