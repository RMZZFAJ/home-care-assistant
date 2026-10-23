"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { Dialog, StatusBadge } from "@/components/ui/primitives";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { Attachments } from "./attachments";
import { CommandEditor, type DocumentAction } from "./supply-command-editor";
import {
  documentLabels,
  type PatientPerson,
  type SupplyDocument,
} from "@/types/documents";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { DocumentActions } from "./document-actions";

export function SupplyDetail({ id }: { id: string }) {
  return (
    <Workspace title="Acompanhamento da ficha">
      {(context) => <Detail key={id} id={id} context={context} />}
    </Workspace>
  );
}
function Detail({ id, context }: { id: string; context: WorkspaceContext }) {
  const liveRevision = useLiveRevision();
  const editingRef = useRef(false);
  const [data, setData] = useState<SupplyDocument | null>(null);
  const [people, setPeople] = useState<PatientPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<DocumentAction | null>(null);
  const [review, setReview] = useState<{
    action: string;
    body: unknown;
    summary: string;
    expectedVersion: number;
  } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => { editingRef.current = Boolean(action || review || uncertain); }, [action, review, uncertain]);
  const pendingRef = useRef<{
    action: string;
    body: unknown;
    expectedVersion: number;
    idempotencyKey: string;
  } | null>(null);
  const patientId = context.patient?.id;
  useEffect(() => {
    const controller = new AbortController();
    // Cache Components can resume this route with its previous state. Reconnect
    // the loading state before exposing actions on a document being refreshed.
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });
    api<{ data: SupplyDocument }>(
      "/api/documents/" + id,
      undefined,
      controller.signal,
    )
      .then(async (result) => {
        if (controller.signal.aborted) return;
        if (!editingRef.current) setData(result.data);
        else setMessage("O acompanhamento foi atualizado. Sua operação permanece preservada e será validada contra a versão original ao confirmar.");
        setError("");
        if (result.data.care_recipient_id === patientId) {
          const directory = await api<{ directory: PatientPerson[] }>(
            "/api/patient-settings?careRecipientId=" +
              result.data.care_recipient_id,
            undefined,
            controller.signal,
          );
          if (!controller.signal.aborted) setPeople(directory.directory);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a ficha.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, patientId, attempt, liveRevision]);
  async function execute() {
    if (!data) return;
    if (!pendingRef.current && review)
      pendingRef.current = {
        action: review.action,
        body: review.body,
        expectedVersion: review.expectedVersion,
        idempotencyKey: crypto.randomUUID(),
      };
    if (!pendingRef.current) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ data: SupplyDocument }>(
        "/api/documents/" + id,
        pendingRef.current,
      );
      setData(result.data);
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      setAction(null);
      setMessage(
        "Operação confirmada e registrada na ficha. Consulte os eventos e as notificações para acompanhar o processamento.",
      );
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      if (rejected) {
        pendingRef.current = null;
        setReview(null);
      }
      setUncertain(!rejected);
      setError(
        reason instanceof Error
          ? reason.message
          : "O resultado precisa ser confirmado.",
      );
    } finally {
      setBusy(false);
    }
  }
  const activeContext = data?.care_recipient_id === context.patient?.id;
  const allowed = (cap: string) => Boolean(activeContext && can(context, cap));
  const actions: DocumentAction[] = [];
  if (
    data &&
    !["cancelled", "rejected"].includes(data.status) &&
    activeContext
  ) {
    if (
      data.status === "draft" &&
      allowed(
        data.type === "BAL" ? "bal.count" : data.type.toLowerCase() + ".create",
      )
    )
      actions.push("submit");
    else if (data.type === "COM") {
      if (data.status === "pending_approval" && allowed("com.approve"))
        actions.push("approve");
      if (
        [
          "approved",
          "partially_approved",
          "purchasing",
          "partially_received",
        ].includes(data.status) &&
        allowed("com.purchase") &&
        data.lines.some((line) =>
          quantity(line.approved_quantity).gt(line.purchased_quantity),
        )
      )
        actions.push("purchase");
      if (
        ["purchased", "purchasing", "partially_received"].includes(
          data.status,
        ) &&
        allowed("com.receive")
      )
        actions.push("receive");
      if (
        data.receipts.some((receipt) => receipt.state === "pending") &&
        allowed("com.validate")
      )
        actions.push("validate_receipt", "reject_receipt");
    } else if (data.type === "ENT") {
      if (
        data.status === "pending_receipt" &&
        data.recipient_id === context.userId &&
        allowed("ent.receive")
      )
        actions.push("receive", "divergence");
      if (
        data.status === "pending_receipt" &&
        (data.created_by === context.userId || allowed("access.manage"))
      )
        actions.push("reassign");
      if (
        data.status === "disputed" &&
        (data.recipient_id === context.userId || allowed("access.manage"))
      )
        actions.push("resolve");
      if (
        data.status === "cancellation_pending" &&
        data.recipient_id === context.userId &&
        allowed("ent.receive")
      )
        actions.push("consent_cancel");
    } else if (data.type === "BAL" && data.status === "submitted") {
      if (allowed("bal.approve.family")) actions.push("approve_family");
      if (allowed("bal.approve.supervisor")) actions.push("approve_supervisor");
    }
    if (
      data.status !== "cancellation_pending" &&
      (data.type === "ENT"
        ? allowed("ent.cancel") ||
          (data.created_by === context.userId &&
            !data.lines.some((line) => quantity(line.accepted_quantity).gt(0)))
        : data.type === "COM"
          ? allowed("com.approve") &&
            !data.lines.some((line) => quantity(line.purchased_quantity).gt(0))
          : data.status !== "approved" && allowed("access.manage"))
    )
      actions.push("cancel");
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap gap-3">
        <Link className={buttonClass} href="/historico">
          ← Histórico
        </Link>
        <button
          className={buttonClass}
          disabled={loading || busy}
          onClick={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        >
          Atualizar
        </button>
        {data?.protocol ? (
          <DocumentActions id={id} code={data.code ?? data.type} version={data.version} />
        ) : null}
      </div>
      {loading ? <Notice>Consultando documento persistido…</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {uncertain ? (
        <Notice>
          Esta tentativa está preservada.{" "}
          <button
            className={primaryClass}
            disabled={busy}
            onClick={() => void execute()}
          >
            Recuperar operação
          </button>
        </Notice>
      ) : null}
      {data ? (
        <>
          <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{documentLabels[data.type]}</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {data.code ?? "Rascunho"}
                </h2>
              </div>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-3 break-all text-xs text-(--muted)">
              {data.protocol}
            </p>
            <p className="mt-3 text-sm">
              {formatBrazilDate(data.created_at)} · Versão {data.version}
            </p>
            {data.type === "ENT" ? (
              <div className="mt-4 space-y-2">
                <p className="font-semibold">
                  {data.fullyCheckedLines}/{data.totalLines} linhas
                  integralmente conferidas
                </p>
                <p className="text-sm text-(--muted)">
                  {data.payload.source === "FAMILY"
                    ? "Família → Equipe"
                    : "Equipe → Família"}{" "}
                  · Destinatário:{" "}
                  {people.find((person) => person.id === data.recipient_id)
                    ?.name ?? "Pessoa designada no documento"}
                </p>
                <p className="text-xs text-(--muted)">
                  Quantidades aceitas já integram o saldo confirmado do destino.
                  Divergências seguem pendentes até conciliação formal.
                </p>
              </div>
            ) : null}
            {!activeContext ? (
              <Notice>
                Selecione o paciente desta ficha no cabeçalho para
                disponibilizar as ações autorizadas.
              </Notice>
            ) : null}
            {data.type === "REQ" ? (
              <Link className={primaryClass} href={"/historico/" + data.id}>
                Abrir requisição
              </Link>
            ) : null}
          </section>
          {activeContext &&
          data.status === "draft" &&
          allowed(
            data.type === "BAL"
              ? "bal.count"
              : data.type.toLowerCase() + ".create",
          ) ? (
            <Link
              className={primaryClass}
              href={
                "/fichas/" + data.type.toLowerCase() + "?documentId=" + data.id
              }
            >
              Editar rascunho
            </Link>
          ) : null}
          {activeContext &&
          data.type === "BAL" &&
          data.status === "submitted" &&
          allowed("bal.count") ? (
            <Link
              className={buttonClass}
              href={"/fichas/bal?documentId=" + data.id + "&recount=true"}
            >
              Recontar com nova referência de estoque
            </Link>
          ) : null}
          {actions.length ? (
            <section className="ui-card">
              <h2 className="font-semibold">Próxima ação</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((item) => (
                  <button
                    key={item}
                    className={item === "receive" ? primaryClass : buttonClass}
                    disabled={loading || busy || uncertain}
                    onClick={() => {
                      setAction(item);
                      setReview(null);
                    }}
                  >
                    {actionLabels[item]}
                  </button>
                ))}
              </div>
              {action ? (
                <CommandEditor
                  key={data.version + action}
                  action={action}
                  data={data}
                  people={people.filter(
                    (person) => person.id !== data.created_by,
                  )}
                  context={context}
                  onCancel={() => setAction(null)}
                  onReview={(command, body, summary) =>
                    setReview({
                      action: command,
                      body,
                      summary,
                      expectedVersion: data.version,
                    })
                  }
                />
              ) : null}
            </section>
          ) : null}
          <section className="ui-card">
            <h2 className="font-semibold">Produtos e quantidades</h2>
            <div className="mt-4 space-y-3">
              {data.lines.map((line) => (
                <article
                  key={line.id}
                  className="rounded-xl border border-(--line) p-4"
                >
                  <h3 className="font-semibold">{line.name_snapshot}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-(--muted)">
                        {data.type === "BAL"
                          ? "Contado"
                          : data.type === "ENT"
                            ? "Expedido"
                            : "Proposto"}
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {formatQuantity(line.quantity, line.unit_snapshot)}
                      </dd>
                    </div>
                    {data.type === "COM" ? (
                      <>
                        <div>
                          <dt>Aprovado</dt>
                          <dd>{formatQuantity(line.approved_quantity)}</dd>
                        </div>
                        <div>
                          <dt>Adquirido</dt>
                          <dd>{formatQuantity(line.purchased_quantity)}</dd>
                        </div>
                      </>
                    ) : data.type === "ENT" ? (
                      <>
                        <div>
                          <dt>Aceito</dt>
                          <dd className="font-semibold text-(--brand)">
                            {formatQuantity(line.accepted_quantity)}
                          </dd>
                        </div>
                        <div>
                          <dt>{line.metadata.issueOpen ? "Em divergência" : "Aguardando conferência"}</dt>
                          <dd>
                            {formatQuantity(
                              quantity(line.quantity)
                                .minus(line.accepted_quantity)
                                .minus(line.reconciled_quantity)
                                .toFixed(),
                            )}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <div>
                        <dt>Saldo na referência</dt>
                        <dd>
                          {formatQuantity(
                            String(line.metadata.expectedQuantity ?? "0"),
                          )}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>
                        {data.type === "ENT"
                          ? "Conciliado"
                          : "Recebido / validado"}
                      </dt>
                      <dd>
                        {formatQuantity(
                          data.type === "ENT"
                            ? line.reconciled_quantity
                            : line.accepted_quantity,
                        )}
                      </dd>
                    </div>
                  </dl>
                  {data.type === "ENT" ? (
                    <p className="mt-3 text-xs">
                      {line.fully_checked
                        ? "Linha integralmente conferida"
                        : line.metadata.issueOpen
                          ? "Divergência aberta"
                          : data.status === "confirmed"
                            ? "Linha conciliada com diferença"
                            : "Aguardando conferência"}
                    </p>
                  ) : null}
                  {line.requisitionItemIds.length ? (
                    <p className="mt-2 text-xs text-(--muted)">
                      {line.requisitionItemIds.length} linha(s) REQ
                      explicitamente vinculada(s).
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            {data.payload.notes ? (
              <p className="mt-4 whitespace-pre-wrap text-sm">
                {data.payload.notes}
              </p>
            ) : null}
          </section>
          <Attachments
            patientId={data.care_recipient_id}
            documentId={data.id}
            writable={
              activeContext &&
              (data.created_by === context.userId ||
                data.recipient_id === context.userId ||
                allowed("access.manage"))
            }
            onChange={() => setAttempt((value) => value + 1)}
          />
          <DocumentDeliveryStatus id={data.id} version={data.version} />
          <section className="ui-card">
            <h2 className="font-semibold">Versões e integridade</h2>
            <p className="mt-2 text-xs text-(--muted)">
              O hash permite comparar o conteúdo canônico registrado. A
              rastreabilidade depende também dos controles de acesso e do
              histórico do banco.
            </p>
            <ol className="mt-4 space-y-3">
              {data.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <strong>
                    v{event.version} · {documentEventLabel(event.action)}
                  </strong>
                  <p className="text-xs text-(--muted)">
                    {formatBrazilDate(event.createdAt)} ·{" "}
                    {people.find((person) => person.id === event.actorId)
                      ?.name ?? "Responsável registrado"}
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs">
                      SHA-256
                    </summary>
                    <code className="block break-all text-xs">
                      {event.hash}
                    </code>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
      <Dialog
        open={Boolean(review)}
        title="Revisar operação definitiva"
        onClose={() => {
          if (!busy && !uncertain) setReview(null);
        }}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">
          {review?.summary}
        </p>
        <p className="mt-4 text-xs text-(--muted)">
          Esta operação será registrada na versão documental e na auditoria.
        </p>
        <div className="ui-form-actions">
          <button
            className={buttonClass}
            disabled={busy || uncertain}
            onClick={() => setReview(null)}
          >
            Voltar à edição
          </button>
          <button
            className={primaryClass}
            disabled={busy}
            onClick={() => void execute()}
          >
            {busy
              ? "Confirmando…"
              : uncertain
                ? "Recuperar tentativa"
                : "Confirmar operação"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
export const actionLabels: Record<DocumentAction, string> = {
  submit: "Emitir rascunho",
  approve: "Aprovar itens",
  purchase: "Registrar aquisição",
  receive: "Confirmar recebimento",
  divergence: "Informar divergência",
  validate_receipt: "Validar recebimento",
  reject_receipt: "Rejeitar recebimento",
  reassign: "Alterar destinatário",
  resolve: "Conciliar divergência",
  approve_family: "Revisão da família",
  approve_supervisor: "Revisão da supervisão",
  cancel: "Solicitar cancelamento",
  consent_cancel: "Consentir e reconciliar cancelamento",
};
