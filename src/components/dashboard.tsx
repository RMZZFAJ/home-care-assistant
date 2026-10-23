"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  buttonClass,
  can,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import {
  DocumentRow,
  type DocumentSummary,
} from "@/components/documents/document-history";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { useLiveRevision } from "@/lib/use-live-revision";

type DashboardData = {
  requests: number;
  receipts: number;
  purchases: number;
  disputes: number;
  balances: number;
  recent: DocumentSummary[];
  balDay: number | null;
  balOverdue: boolean;
  balDue: string;
  drafts: number;
  consumptionPending: number;
  sciencePending: number;
  archivePending: number;
};
export function Dashboard() {
  return (
    <Workspace title="Visão geral">
      {(context) =>
        context.patient && context.activeContext?.mode === "patient" ? (
          <PatientDashboard context={context} />
        ) : (
          <EmptyState
            title="Seu espaço de cuidado começa aqui"
            action={
              context.isGlobalAdmin ? (
                <Link className={primaryClass} href="/admin">
                  Cadastrar paciente
                </Link>
              ) : undefined
            }
          >
            Selecione um paciente para acompanhar as próximas ações.
          </EmptyState>
        )
      }
    </Workspace>
  );
}
function PatientDashboard({ context }: { context: WorkspaceContext }) {
  const liveRevision = useLiveRevision();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: DashboardData }>(
      "/api/dashboard?careRecipientId=" + context.patient!.id,
      undefined,
      controller.signal,
    ).then(
      (result) => {
        setData(result.data);
        setError("");
      },
      (reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o painel.",
          );
      },
    );
    return () => controller.abort();
  }, [context.patient, attempt, liveRevision]);
  if (error)
    return (
      <Notice error>
        {error}
        <button
          className={buttonClass}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tentar novamente
        </button>
      </Notice>
    );
  if (!data) return <Notice>Organizando suas próximas ações…</Notice>;
  const cards = [
    ...(data.sciencePending ? [{ label: "Requisições para sua ciência", count: data.sciencePending, href: "/historico?type=REQ&status=science_pending" }] : []),
    ...(data.archivePending ? [{ label: "Conclusões para revisar e arquivar", count: data.archivePending, href: "/historico?type=REQ&status=completed_science_pending" }] : []),
    ...(data.drafts
      ? [
          {
            label: "Seus rascunhos",
            count: data.drafts,
            href: "/historico?status=draft",
          },
        ]
      : []),
    ...(data.consumptionPending && can(context, "consumption.confirm")
      ? [
          {
            label: "Relatos para confirmar",
            count: data.consumptionPending,
            href: "/consumo",
          },
        ]
      : []),
    ...(can(context, "req.read") ? [{
      label: "Requisições abertas",
      count: data.requests,
      href: "/historico?type=REQ",
    }] : []),
    ...(can(context, "ent.receive") ? [{
      label: "Recebimentos para você",
      count: data.receipts,
      href: "/historico?type=ENT&status=pending_receipt",
    }] : []),
    ...(can(context, "com.approve")
      ? [
          {
            label: "Compras a aprovar",
            count: data.purchases,
            href: "/historico?type=COM&status=pending_approval",
          },
        ]
      : []),
    ...(can(context, "ent.read") ? [{
      label: "Divergências em aberto",
      count: data.disputes,
      href: "/historico?type=ENT&status=disputed",
    }] : []),
    ...(can(context, "bal.approve") ? [{
      label: "BAL aguardando revisão",
      count: data.balances,
      href: "/historico?type=BAL&status=submitted",
    }] : []),
  ];
  return (
    <div className="space-y-6">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">Cuidado organizado, rotina mais simples</p>
          <h2>O que precisa da sua atenção</h2>
          <p>Pedidos, entregas e conferências do paciente em um só lugar.</p>
        </div>
        <Link href="/fichas" className={primaryClass}>
          Abrir fichas <Icon name="arrow" />
        </Link>
      </section>
      {data.balOverdue ? (
        <Notice>
          BAL da equipe pendente desde{" "}
          {new Date(data.balDue + "T12:00:00Z").toLocaleDateString("pt-BR")}.{" "}
          {can(context, "bal.count") ? (
            <Link href="/fichas/bal" className="font-semibold underline">
              Iniciar contagem
            </Link>
          ) : (
            "Acompanhe a equipe responsável."
          )}
        </Notice>
      ) : null}
      <div className="metric-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="metric-card">
            <span>{card.label}</span>
            <strong>{card.count}</strong>
            <span className="mt-3 inline-flex items-center gap-1">
              Acompanhar <Icon name="arrow" width="13" />
            </span>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="ui-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Movimentação recente</h2>
            <Link
              href="/historico"
              className="text-xs font-semibold text-(--brand)"
            >
              Ver histórico
            </Link>
          </div>
          {data.recent.length ? (
            data.recent.map((row) => <DocumentRow row={row} key={row.id} />)
          ) : (
            <EmptyState title="Tudo pronto para começar">
              As fichas emitidas aparecerão aqui.
            </EmptyState>
          )}
        </section>
        <section className="ui-card">
          <h2 className="font-semibold">Ações rápidas</h2>
          <div className="mt-4 grid gap-2">
            {can(context, "req.create") ? (
              <Link className={buttonClass} href="/fichas/req">
                Registrar necessidade · REQ
              </Link>
            ) : null}
            {can(context, "com.create") ? (
              <Link className={buttonClass} href="/fichas/com">
                Organizar compra · COM
              </Link>
            ) : null}
            {can(context, "ent.create") ? (
              <Link className={buttonClass} href="/fichas/ent">
                Registrar entrega · ENT
              </Link>
            ) : null}
            {can(context, "bal.count") ? (
              <Link className={buttonClass} href="/fichas/bal">
                Contar estoque · BAL
              </Link>
            ) : null}
          </div>
          <div className="mt-6 border-t border-(--line) pt-4">
            <h3 className="text-sm font-semibold">Rotina semanal da equipe</h3>
            <p className="mt-2 text-xs leading-5 text-(--muted)">
              {data.balDay == null
                ? "O dia do BAL ainda precisa ser configurado."
                : "BAL semanal: " +
                  [
                    "domingo",
                    "segunda-feira",
                    "terça-feira",
                    "quarta-feira",
                    "quinta-feira",
                    "sexta-feira",
                    "sábado",
                  ][data.balDay] +
                  "."}
            </p>
            {can(context, "access.manage") ? (
              <Link
                href="/configuracoes"
                className="mt-2 inline-block text-xs font-semibold text-(--brand)"
              >
                Configurar rotina e aprovações
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
