"use client";
import { SettingsSection } from "@/components/forms/settings-section";
import { documentPatientName } from "@/lib/documents/presentation";
import { SupplyLineSummary } from "./supply-line-summary";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  Notice,
  primaryClass,
  type WorkspaceContext,
} from "@/components/workspace";
import { Dialog } from "@/components/ui/primitives";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { Attachments } from "./attachments";
import { CommandEditor, type DocumentAction } from "./supply-command-editor";
import {
  type PatientPerson,
  type SupplyDocument,
} from "@/types/documents";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { DocumentHeader } from "./document-header";
import { PurchaseDetails, PurchaseExpectationComparison } from "./purchase-details";
import { acquisitionRemaining, arrivalRemaining } from "@/lib/documents/purchase";

export function SupplyDocumentContent({ id, context }: { id: string; context: WorkspaceContext }) {
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
  const [purchaseConflict, setPurchaseConflict] = useState(false);
  const [comparison, setComparison] = useState<SupplyDocument | null>(null);
  const commandFormRef = useRef<HTMLFormElement | null>(null);
  const decisionFocusRef = useRef(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const resultFocusRef = useRef(false);
  useEffect(() => {
    if (decisionFocusRef.current) {
      decisionFocusRef.current = false;
      commandFormRef.current?.querySelector<HTMLElement>("input,textarea,select")?.focus();
    } else if (resultFocusRef.current) {
      resultFocusRef.current = false;
      headerRef.current?.querySelector<HTMLElement>("h2")?.focus();
    }
  }, [data?.version]);
  useEffect(() => {
    editingRef.current = Boolean(action || review || uncertain);
  }, [action, review, uncertain]);
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
        else
          setMessage(
            "O acompanhamento foi atualizado. Sua operação permanece preservada e será validada contra a versão original ao confirmar.",
          );
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
    const intention = pendingRef.current;
    try {
      const result = await api<{ data: SupplyDocument }>(
        "/api/documents/" + id,
        intention,
      );
      resultFocusRef.current = true;
      setData(result.data);
      pendingRef.current = null;
      setUncertain(false);
      setReview(null);
      setAction(null);
      setPurchaseConflict(false); setComparison(null);
      const receipt = result.data.receipts.find(receipt => receipt.submission_key === intention.idempotencyKey);
      const purchaseMessages: Record<string, string> = {
        approve: "Decisão de aprovação registrada. Quantidades adquiridas e recebidas não mudaram.",
        purchase: "Aquisição registrada. Este ato não confirma chegada nem entrada no estoque.",
        receive: receipt?.state === "approved" ? "Chegada registrada e validada. As quantidades desta parcela foram incorporadas ao estoque familiar." : receipt?.state === "pending" ? "Chegada registrada e aguardando conferência. Nenhuma quantidade desta parcela foi incorporada ao estoque." : "Chegada registrada. Consulte a parcela e seu estado de conferência.",
        validate_receipt: "Parcela validada. As quantidades declaradas integram o estoque familiar.",
        reject_receipt: "Parcela rejeitada. A declaração original foi preservada, sem entrada desta parcela no estoque.",
        close_expectation: "Expectativa restante encerrada, sem entrada ou baixa de material." + (result.data.purchaseProgress?.physicalPending ? " Parcelas que ainda aguardam chegada válida ou conferência continuam pendentes." : " As quantidades efetivamente validadas foram preservadas."),
        submit: "COM emitida. A emissão não comprova aquisição, chegada ou entrada no estoque.",
        cancel: "Ficha cancelada com histórico preservado, sem entrada ou baixa de material.",
      };
      setMessage(result.data.type === "COM" ? purchaseMessages[intention.action] ?? "Decisão registrada na ficha." : "Operação confirmada e registrada na ficha. Consulte os eventos e as notificações para acompanhar o processamento.");
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      if (rejected) {
        if (data.type === "COM" && reason instanceof ApiError && reason.code === "VERSION_CONFLICT") setPurchaseConflict(true);
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
  async function comparePurchaseVersion() {
    setBusy(true); setError("");
    try {
      const result = await api<{ data: SupplyDocument }>("/api/documents/" + id);
      setComparison(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar a versão atual."); }
    finally { setBusy(false); }
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
          acquisitionRemaining(line).gt(0),
        )
      )
        actions.push("purchase");
      if (
        ["purchased", "purchasing", "partially_received"].includes(
          data.status,
        ) &&
        allowed("com.receive") && data.lines.some(line => arrivalRemaining(line, data).gt(0))
      )
        actions.push("receive");
      if (
        data.receipts.some((receipt) => receipt.state === "pending") &&
        allowed("com.validate")
      )
        actions.push("validate_receipt", "reject_receipt");
      if (data.purchaseProgress?.expectationPending && !data.purchaseProgress.expectationClosed && allowed("com.close_expectation")) actions.push("close_expectation");
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
      const ownCount=(data.payload.balanceContext?.professionalId??data.created_by)===context.userId;
      if (!ownCount&&allowed("bal.approve.family") && ["admin","family"].includes(context.patient?.role??"")) actions.push("approve_family");
      if (!ownCount&&allowed("bal.approve.supervisor")) actions.push("approve_supervisor");
    }
    if (
      data.status !== "cancellation_pending" &&
      (data.type === "ENT"
        ? allowed("ent.cancel") ||
          (data.created_by === context.userId &&
            !data.lines.some((line) => quantity(line.accepted_quantity).gt(0)))
        : data.type === "COM"
          ? allowed("com.approve") &&
            !data.lines.some((line) => quantity(line.purchased_quantity).gt(0)) && !data.receipts.length && !data.purchaseProgress?.expectationClosed
          : data.status !== "approved" && !data.payload.balanceContext && allowed("access.manage"))
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

      </div>
      {loading ? <Notice>Consultando documento persistido…</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {purchaseConflict && data?.type === "COM" ? <section className="ui-card space-y-3"><Notice error>A COM mudou desde o resumo que você revisou. Seus campos permanecem preservados; consulte a versão atual antes de preparar outra confirmação.</Notice>{comparison ? <><PurchaseExpectationComparison original={data} current={comparison} /><button type="button" className={primaryClass} disabled={busy || !comparison.purchaseProgress} onClick={() => { decisionFocusRef.current = true; setData(comparison); setComparison(null); setPurchaseConflict(false); setReview(null); setMessage("Versão atual carregada. Confira os valores preservados e prepare uma nova revisão. O encerramento exige nova concordância com o resumo."); }}>Usar versão atual e revisar novamente</button></> : <button type="button" className={buttonClass} disabled={busy} onClick={() => void comparePurchaseVersion()}>Consultar versão atual da COM</button>}</section> : null}
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
          <DocumentHeader observedRef={headerRef} id={data.id} type={data.type} typeLabel={data.type === "COM" ? data.payload.origin === "donation" ? "Doação de insumos" : data.payload.origin === "purchase" ? "Compra de insumos" : "Compra ou doação de insumos" : undefined} code={data.code ?? "Rascunho"} status={data.type === "COM" ? data.purchaseProgress?.state ?? data.status : data.status} protocol={data.protocol} version={data.version} createdAt={data.created_at} patientName={documentPatientName(data.canonical_snapshot, context.patient?.display_name ?? "Paciente identificado no documento")}>
            {data.type === "COM" ? <p className="mt-3 text-sm">Origem: {data.payload.origin === "donation" ? "Doação" : data.payload.origin === "purchase" ? "Compra" : "Não informada no registro"}</p> : null}
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
          </DocumentHeader>
          {data.type === "COM" ? <PurchaseDetails data={data} /> : null}
          {data.type==="BAL"&&data.payload.balanceContext?<section className="ui-card"><h2>Plantão e contagem física</h2><strong>{data.payload.balanceContext.professionalName} · {data.payload.balanceContext.shiftType}</strong><p>{formatBrazilDate(data.payload.balanceContext.startsAt)} → {formatBrazilDate(data.payload.balanceContext.endsAt)}</p><p>Contagem atual: {formatBrazilDate(data.payload.balanceContext.countedAt)}</p><p>Semanas vinculadas: {data.payload.balanceContext.weeks.map(week=>week.split("-").reverse().join("/")).join(", ")}</p><p className="hca-muted">Semanas anteriores são regularizadas pela contagem atual, preservando seus prazos e atrasos históricos.</p>{data.status==="draft"?<Notice>Rascunho: a obrigação ainda não foi concluída.</Notice>:null}</section>:null}
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
          allowed("bal.count") && !data.payload.balanceContext ? (
            <Link
              className={buttonClass}
              href={"/fichas/bal?documentId=" + data.id + "&recount=true"}
            >
              Recontar com nova referência de estoque
            </Link>
          ) : null}
          {data.type === "BAL" && data.payload.balanceContext ? <Link href="/balancos" className={buttonClass} prefetch={false}>Acompanhar plantão, revisão e reconto</Link> : null}
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
                    {data.type === "COM" && item === "receive" ? "Informar nova chegada" : actionLabels[item]}
                  </button>
                ))}
              </div>
              {action ? (
                <CommandEditor
                  key={data.id + action}
                  action={action}
                  data={data}
                  people={people.filter(
                    (person) => person.id !== data.created_by,
                  )}
                  context={context}
                  formRef={commandFormRef}
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
                <SupplyLineSummary
                  key={line.id}
                  line={line}
                  type={data.type}
                  status={data.status}
                  purchaseLine={data.purchaseProgress?.lines.find(item => item.lineId ===line.id)}
                />
              ))}{" "}
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
          <SettingsSection title="Versões e integridade" summary={data.events.length + " versão(ões) · SHA-256 por evento"}>
            <p className="mt-2 text-xs text-(--muted)">
              O hash permite comparar o conteúdo canônico registrado. A
              rastreabilidade depende também dos controles de acesso e do
              histórico do banco.
            </p>
            <ol className="mt-4 space-y-3">
              {data.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <strong>
                    v{event.version} · {documentEventLabel(event.action, data.type === "COM" ? data.payload.origin : undefined)}
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
          </SettingsSection>
        </>
      ) : null}
      <Dialog
        open={Boolean(review)}
        title={review?.action === "close_expectation" ? "Revisar encerramento da expectativa" : "Revisar operação definitiva"}
        closeDisabled={busy || uncertain}
        onClose={() => {
          if (!busy && !uncertain) setReview(null);
        }}
      >
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? <Notice>O resultado ainda não foi confirmado. Esta tentativa permanece preservada; recupere o resultado antes de editar ou iniciar outra operação.</Notice> : null}
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
            {review?.action === "close_expectation" ? "Manter restante" : "Voltar à edição"}
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
                : review?.action === "close_expectation" ? "Confirmar encerramento da expectativa" : "Confirmar operação"}
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
  close_expectation: "Encerrar expectativa restante",
  reassign: "Alterar destinatário",
  resolve: "Conciliar divergência",
  approve_family: "Revisão da família",
  approve_supervisor: "Revisão da supervisão",
  cancel: "Solicitar cancelamento",
  consent_cancel: "Consentir e reconciliar cancelamento",
};
