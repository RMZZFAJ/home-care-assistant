"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { textRows } from "@/lib/text-rows";
import { Attachments } from "@/components/documents/attachments";
import { DocumentActions } from "@/components/documents/document-actions";
import {
  DocumentTimeline,
  type TimelineEvent,
} from "@/components/documents/document-timeline";
import { RelatedDocument } from "@/components/documents/related-document";
import { Dialog } from "@/components/ui/primitives";
import { ResolveExtraItem } from "./resolve-extra-item";
import {
  deliveryLabels,
  type DeliveryStatus,
} from "@/lib/notifications/presentation";

type Progress = {
  version: number;
  scienceSatisfied: boolean;
  eligible: boolean;
  completedAt: string | null;
  manualArchiveRequired: boolean;
  archivedAt: string | null;
  archiveReason: string | null;
  policy: { scienceAutomatic?: boolean } | null;
  preferences: Record<string, boolean>;
  events: TimelineEvent[];
  science: {
    id: string;
    user_id: string;
    actor_name: string;
    mode: string;
    created_at: string;
  }[];
};
type Detail = {
  id: string;
  care_recipient_id: string;
  code: string | null;
  protocol: string;
  status: string;
  created_at: string | null;
  is_historical?: boolean;
  requester_name_snapshot?: string;
  recipient_name_snapshot?: string;
  requisition_items: {
    id: string;
    product_id: string | null;
    product_name_snapshot: string;
    custom_name: string | null;
    unit_snapshot: string;
    current_stock: string | null;
    urgent: boolean;
    resolution?: { product_id: string } | null;
  }[];
  requisition_observations: { body: string }[];
  requisition_notifications: DeliveryStatus[];
  fulfillment: {
    total: number;
    fulfilled: number;
    lines: {
      id: string;
      attended: boolean;
      deliveries: { id: string; code: string; acceptedQuantity: string }[];
    }[];
  };
  progress: Progress;
};
const modes: Record<string, string> = {
  express: "Expressa no aplicativo",
  app_visible: "Automática · conteúdo exibido",
  whatsapp_read: "Automática · leitura correlacionada no WhatsApp",
  whatsapp_confirm: "Simplificada · WhatsApp verificado",
  dispatch: "Por expedição autorizada",
};

export function RequisitionDetail({ id }: { id: string }) {
  return (
    <Workspace title="Requisição e acompanhamento">
      {(context) => <DetailContent key={id} id={id} context={context} />}
    </Workspace>
  );
}
function DetailContent({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const revision = useLiveRevision();
  const [data, setData] = useState<Detail | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<"archive" | "cancel" | null>(null);
  const visibleRef = useRef<HTMLDivElement>(null);
  const automaticRef = useRef(false);
  const automaticAttemptsRef = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ data: Detail }>(
      `/api/requisitions/${id}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.data);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [id, attempt, revision]);
  useEffect(() => {
    if (
      !data ||
      data.is_historical ||
      automaticRef.current ||
      data.progress.science.some((row) => row.user_id === context.userId) ||
      !data.progress.eligible ||
      !data.progress.preferences.scienceAutomatic ||
      !data.progress.policy?.scienceAutomatic ||
      !visibleRef.current
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          document.hidden ||
          !entries.some((entry) => entry.isIntersecting) ||
          automaticRef.current
        )
          return;
        automaticRef.current = true;
        automaticAttemptsRef.current += 1;
        void api(`/api/requisitions/${id}/science`, {
          mode: "app_visible",
          expectedVersion: data.progress.version,
        })
          .then(() => {
            setMessage(
              "Ciência automática registrada após exibição do conteúdo.",
            );
            setAttempt((value) => value + 1);
          })
          .catch((cause) => {
            if (
              cause instanceof ApiError &&
              cause.status === 409 &&
              automaticAttemptsRef.current < 3
            ) {
              automaticRef.current = false;
              setAttempt((value) => value + 1);
            } else setError(cause.message);
          });
      },
      { threshold: 0.5 },
    );
    observer.observe(visibleRef.current);
    return () => observer.disconnect();
  }, [data, id, context.userId]);
  async function action(operation: "science" | "archive" | "cancel") {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/requisitions/${id}/${operation === "cancel" ? "status" : operation}`,
        operation === "science"
          ? { mode: "express", expectedVersion: data.progress.version }
          : operation === "cancel"
            ? { status: "cancelled", reason }
            : { reason },
        undefined,
        operation === "cancel" ? "PATCH" : "POST",
      );
      setMessage(
        operation === "science"
          ? "Ciência expressa registrada com sua identidade."
          : operation === "cancel"
            ? "Requisição cancelada com justificativa e histórico preservado."
            : "Arquivamento registrado com justificativa, preservando as ciências pendentes.",
      );
      setReview(null);
      setReason("");
      setAttempt((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <Notice error={Boolean(error)}>
        {error || "Carregando requisição…"}
      </Notice>
    );
  const { fulfillment: f, progress: p } = data;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link className={buttonClass} href="/historico">
        ← Histórico
      </Link>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <section className="ui-card" ref={visibleRef}>
        <p className="eyebrow">
          REQ · Paciente:{" "}
          {data.recipient_name_snapshot ?? context.patient?.display_name}
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          {data.code ?? data.protocol}
        </h2>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            Solicitante:{" "}
            {data.requester_name_snapshot ??
              (data.is_historical
                ? "Solicitante desconhecido"
                : "Solicitante registrado")}
          </span>
          <span>
            Data:{" "}
            {data.is_historical && !data.created_at
              ? "Data original desconhecida"
              : formatBrazilDate(data.created_at)}
          </span>
        </p>
        <div className="my-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-(--background) p-3">
            <p className="text-xs text-(--muted)">Atendimento</p>
            <strong>
              {f.fulfilled}/{f.total} itens atendidos
            </strong>
            <p className="text-xs">
              {f.total > 0 && f.fulfilled === f.total
                ? "Completo"
                : f.fulfilled
                  ? "Parcial"
                  : "Aguardando ENT aceita"}
            </p>
          </div>
          <div className="rounded-lg bg-(--background) p-3">
            <p className="text-xs text-(--muted)">Ciência familiar</p>
            <strong>
              {data.is_historical
                ? "Não comprovada no original"
                : p.scienceSatisfied
                  ? "Exigência satisfeita"
                  : "Pendente"}
            </strong>
            <p className="text-xs">Independente do recebimento</p>
          </div>
          <div className="rounded-lg bg-(--background) p-3">
            <p className="text-xs text-(--muted)">Documento</p>
            <strong>
              {data.is_historical
                ? "Registro histórico"
                : p.archivedAt
                  ? "Arquivado"
                  : data.status === "cancelled"
                    ? "Cancelado"
                    : p.completedAt
                      ? "Concluído operacionalmente"
                      : "Em atendimento"}
            </strong>
          </div>
        </div>
        <DocumentActions
          id={id}
          code={data.code ?? "REQ"}
          version={p.version}
        />
      </section>
      <section className="ui-card">
        <h2 className="font-semibold">Materiais requisitados</h2>
        <p className="mt-2 text-xs text-(--muted)">
          Uma linha é atendida após aceite positivo em ENT vinculada. Compras
          não atendem itens da REQ.
        </p>
        <ul className="mt-4 space-y-3">
          {data.requisition_items.map((item) => {
            const line = f.lines.find((row) => row.id === item.id);
            return (
              <li
                className="rounded-lg border border-(--line) p-3"
                key={item.id}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-sm">
                    {item.product_name_snapshot ?? item.custom_name}
                  </strong>
                  <span
                    className={
                      "ui-badge ui-badge-" +
                      (line?.attended ? "success" : "pending")
                    }
                  >
                    {line?.attended ? "Atendido" : "Pendente"}
                  </span>
                  {item.urgent ? (
                    <span className="ui-badge ui-badge-danger">Urgente</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-(--muted)">
                  {item.current_stock === null
                    ? "Estoque desconhecido"
                    : "Estoque observado na emissão: " +
                      formatQuantity(
                        String(item.current_stock),
                        item.unit_snapshot,
                      )}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {line?.deliveries.map((delivery) => (
                    <RelatedDocument
                      key={delivery.id}
                      id={delivery.id}
                      type="ENT"
                      label={`${delivery.code} · aceito ${delivery.acceptedQuantity}`}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {!data.is_historical && !p.archivedAt && data.status !== "cancelled" ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {can(context, "com.create") ? (
              <Link
                className={buttonClass}
                href={`/fichas/com?requisitionId=${id}`}
              >
                Abrir COM vinculada
              </Link>
            ) : null}
            {can(context, "ent.create") ? (
              <Link
                className={primaryClass}
                href={`/fichas/ent?requisitionId=${id}`}
              >
                Expedir ENT vinculada
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
      <section className="ui-card">
        <h2 className="font-semibold">Ciência e responsáveis</h2>
        <p className="mt-2 text-sm">
          {data.is_historical
            ? "A ciência original não foi comprovada. Nenhuma confirmação foi inferida na importação."
            : p.scienceSatisfied
              ? "Ciência exigida satisfeita. As evidências abaixo identificam a origem de cada registro."
              : "A ciência familiar está pendente. Entregas e aceites válidos podem continuar normalmente."}
        </p>
        <ul className="mt-3 space-y-2">
          {p.science.map((row) => (
            <li
              className="rounded-lg border border-(--line) p-3 text-sm"
              key={row.id}
            >
              <strong>{row.actor_name}</strong>
              <p>
                {modes[row.mode] ?? row.mode} ·{" "}
                {formatBrazilDate(row.created_at)}
              </p>
            </li>
          ))}
        </ul>
        {!data.is_historical &&
        p.eligible &&
        !p.archivedAt &&
        data.status !== "cancelled" &&
        !p.science.some((row) => row.user_id === context.userId) &&
        p.preferences.scienceExpress !== false ? (
          <button
            type="button"
            className={primaryClass + " mt-4"}
            disabled={busy}
            onClick={() => void action("science")}
          >
            Li a requisição e confirmo minha ciência
          </button>
        ) : null}
        {p.manualArchiveRequired ? (
          <Notice>
            Concluída com ciência obrigatória pendente. O arquivamento
            automático está bloqueado; um administrador do paciente poderá
            arquivar com justificativa, sem inventar ciência.
          </Notice>
        ) : null}
        {p.completedAt && !p.archivedAt && context.patient?.role === "admin" ? (
          <button
            className={buttonClass + " mt-4"}
            disabled={busy}
            onClick={() => {
              setReason("");
              setReview("archive");
            }}
          >
            Revisar arquivamento manual
          </button>
        ) : null}
        {p.archivedAt ? (
          <p className="mt-3 text-sm">
            Arquivado em {formatBrazilDate(p.archivedAt)} · {p.archiveReason}
          </p>
        ) : null}
      </section>
      <DocumentTimeline events={p.events} />
      {!data.is_historical &&
      !p.archivedAt &&
      data.status !== "cancelled" &&
      can(context, "req.review") ? (
        <button
          className={buttonClass}
          disabled={busy}
          onClick={() => {
            setReason("");
            setReview("cancel");
          }}
        >
          Cancelar requisição
        </button>
      ) : null}
      <Dialog
        open={review !== null}
        title={
          review === "cancel"
            ? "Revisar cancelamento da REQ"
            : "Revisar arquivamento manual"
        }
        onClose={() => {
          if (!busy) setReview(null);
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (review) void action(review);
          }}
        >
          <p className="text-sm">
            {data.code ?? data.protocol} · {f.fulfilled}/{f.total} itens
            atendidos.{" "}
            {review === "cancel"
              ? "O cancelamento preserva todos os eventos. Entregas vinculadas precisam estar formalmente resolvidas."
              : "O arquivamento mantém as ciências registradas e eventuais ciências pendentes, sem criar confirmação."}
          </p>
          <label className="block text-sm font-semibold">
            Justificativa
            <textarea
              autoFocus
              className={inputClass}
              required
              minLength={3}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button type="submit" className={primaryClass} disabled={busy}>
            {busy
              ? "Registrando…"
              : review === "cancel"
                ? "Confirmar cancelamento"
                : "Confirmar arquivamento"}
          </button>
        </form>
      </Dialog>
      <section className="ui-card">
        <h2 className="font-semibold">Avisos e acompanhamento</h2>
        <p className="mt-2 text-xs text-(--muted)">
          Enviado, entregue, lido e ciência são fatos independentes.
        </p>
        <ul className="mt-3 space-y-2">
          {data.requisition_notifications.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-(--line) p-3 text-sm"
            >
              {row.recipient_label} · {row.channel} ·{" "}
              {deliveryLabels[row.state] ?? row.state}
            </li>
          ))}
        </ul>
        {!data.requisition_notifications.length ? (
          <p className="mt-3 text-sm">Nenhum aviso disponível.</p>
        ) : null}
      </section>
      <section className="ui-card">
        <h2 className="font-semibold">Observações</h2>
        {data.requisition_observations.length ? (
          textRows(data.requisition_observations.map((row) => row.body)).map(
            (row) => (
              <p key={row.key} className="mt-2 text-sm">
                {row.value}
              </p>
            ),
          )
        ) : (
          <p className="mt-2 text-sm text-(--muted)">Sem observações.</p>
        )}
      </section>
      {can(context, "catalog.manage") &&
      can(context, "req.review") &&
      data.requisition_items.some(
        (item) => !item.product_id && !item.resolution,
      ) ? (
        <ResolveExtraItem
          patientId={data.care_recipient_id}
          requestId={id}
          items={data.requisition_items
            .filter((item) => !item.product_id && !item.resolution)
            .map((item) => ({
              id: item.id,
              name:
                item.product_name_snapshot ?? item.custom_name ?? "Item extra",
            }))}
          onChange={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      <Attachments
        patientId={data.care_recipient_id}
        documentId={id}
        writable={can(context, "req.create")}
      />
    </div>
  );
}
