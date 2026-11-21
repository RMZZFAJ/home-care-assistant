"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import {
  buttonClass,
  can,
  inputClass,
  Notice,
  primaryClass,
  type WorkspaceContext,
} from "@/components/workspace";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";
import {
  acquisitionRemaining,
  arrivalRemaining,
} from "@/lib/documents/purchase";
import { PurchaseFormLine } from "./purchase-register";
import { PurchaseApprovalFields, purchaseApprovalSummary } from "./purchase-approval";
import { PurchaseArrivalFields } from "./purchase-arrival";
import { coverageFromForm } from "./purchase-coverage-fields";
import { Icon } from "@/components/ui/icon";
import { familyFulfillmentDescription } from "@/lib/documents/family-fulfillment";

export type DocumentAction =
  | "submit"
  | "approve"
  | "purchase"
  | "receive"
  | "divergence"
  | "close_expectation"
  | "reassign"
  | "resolve"
  | "approve_family"
  | "approve_supervisor"
  | "cancel"
  | "consent_cancel"
  | "refuse_cancellation"
  | "withdraw_cancellation";
export type ReceiptDraftHandle = { snapshot: () => ReceiptDraftContent; };
export type CommandEditorProps = {
  action: DocumentAction;
  data: SupplyDocument;
  context: WorkspaceContext;
  onCancel: () => void;
  onReview: (
    action: string,
    body: unknown,
    summary: string,
    draftCommit?: { id: string; revision: number; },
    expectedVersion?: number,
  ) => void;
  formRef?: Ref<HTMLFormElement>;
  formId?: string;
  reviewDisabled?: boolean;
};
export function CommandEditorFields({
  action,
  data,
  context,
  onCancel,
  onReview,
  formRef,
  formId,
  reviewDisabled = false,
  initialDraft,
  snapshotRef,
  onDraftChange,
}: CommandEditorProps & {
  initialDraft?: ReceiptDraftContent;
  snapshotRef?: Ref<ReceiptDraftHandle>;
  onDraftChange?: (content: ReceiptDraftContent) => void;
}) {
  const [error, setError] = useState("");
  const instanceId = useId();
  const registeringPurchase = action === "purchase" && data.payload.origin !== "donation";
  const registeringArrival = action === "receive" && data.type === "COM";
  const authorizingPurchase = action === "approve" && data.type === "COM";
  const mayReceivePurchase = can(context, "com.receive");
  const directPurchaseCredit = mayReceivePurchase && context.patient?.role === "admin" && can(context, "com.validate");
  const [divergent, setDivergent] = useState<string[]>(
    initialDraft?.divergentIds ?? [],
  );
  const [resolutionSelection, setResolutionSelection] = useState(
    initialDraft?.fields.resolution ??
    (data.recipient_id === context.userId ? "received" : "returned"),
  );
  const formElementRef = useRef<HTMLFormElement | null>(null);
  useImperativeHandle(formRef, () => formElementRef.current!);
  const [fieldRevision, setFieldRevision] = useState(0);
  const captureSnapshot = useCallback(() => {
    const form = formElementRef.current!;
    // This is an in-memory snapshot, not the submitted command. FormData
    // omits controls inside the temporarily disabled confirmation fieldset,
    // which would erase the user's values while comparing a new reference.
    const fields: Record<string, string> = {};
    for (const control of form.elements) {
      if (!(
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) || !control.name) continue;
      if (control instanceof HTMLInputElement) {
        if (["file", "submit", "button", "reset"].includes(control.type)) continue;
        if (control.type === "radio" && !control.checked) continue;
        if (control.type === "checkbox") {
          fields[control.name] = control.checked ? control.value : "";
          continue;
        }
      }
      fields[control.name] = control.value;
    }
    // An unchecked checkbox is absent from FormData. Persist the explicit off
    // value so the private baseline merge cannot resurrect an earlier check.
    if (action === "close_expectation")
      fields.confirmed = (
        form.elements.namedItem("confirmed") as HTMLInputElement | null
      )?.checked
        ? "on"
        : "";
    if (action === "resolve") {
      const line = data.lines.find((item) => item.id === fields.lineId);
      if (line)
        fields.lineLabel = `${line.name_snapshot} · ${line.unit_snapshot}`;
    }
    return {
      documentVersion: data.version,
      fields,
      divergentIds: [...divergent],
      materials: data.lines.map((line) => ({
        id: line.id,
        name: line.name_snapshot,
        unit: line.unit_snapshot,
        quantityDecimals: 0,
      })),
    };
  }, [
    data,
    divergent,
    action,
  ]);
  useImperativeHandle(snapshotRef, () => ({ snapshot: captureSnapshot }), [
    captureSnapshot,
  ]);
  useEffect(() => {
    if (onDraftChange && formElementRef.current)
      onDraftChange(captureSnapshot());
  }, [onDraftChange, captureSnapshot, fieldRevision]);
  const [selectedLine, setSelectedLine] = useState(
    initialDraft?.fields.lineId ??
    data.lines.find((line) => line.metadata.issueOpen)?.id ??
    "",
  );
  const lines = data.lines.filter((line) =>
    action === "purchase"
      ? acquisitionRemaining(line).gt(0)
      : action === "receive" && data.type === "COM"
        ? arrivalRemaining(line, data).gt(0)
        : true,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    let command: string = action;
    let body: unknown = {};
    let summary =
      "Emitir esta ficha com os produtos e quantidades registrados.";
    try {
      if (action === "approve_family" || action === "approve_supervisor") {
        command = "approve";
        body = { group: action === "approve_family" ? "family" : "supervisor" };
        summary =
          "Confirmar revisão deste balanço. A aplicação depende da política e da referência de estoque ainda válida.";
      } else if (registeringArrival) {
        const selected = lines.filter(line => form.has(line.id + ":selected"));
        if (!selected.length) throw new Error("Selecione ao menos um material que chegou.");
        const entries = selected.map(line => {
          const raw = String(form.get(line.id) ?? "").trim();
          const expected = arrivalRemaining(line, data);
          if (!validQuantity(raw, 6, true)) throw new Error("Confira a quantidade recebida de " + line.name_snapshot);
          const physical = quantity(raw);
          const remaining = form.get(line.id + ":remainingAction");
          const coverage = coverageFromForm(form, line.id);
          if (physical.gt(expected) && !form.has(line.id + ":excess"))
            throw new Error("Confirme o excedente de " + line.name_snapshot);
          if (coverage && (!quantity(coverage.quantity).gt(0) || quantity(coverage.quantity).gt(physical)))
            throw new Error("Confira a cobertura declarada para " + line.name_snapshot);
          return {
            lineId: line.id, quantity: physical.toFixed(), expectedQuantity: expected.toFixed(),
            ...(physical.lt(expected) ? { remainingAction: remaining === "short" ? "short" : "wait" } : {}),
            ...(physical.gt(expected) ? { excessConfirmed: true as const } : {}),
            ...(coverage ? { coverage } : {}),
          };
        });
        body = { lines: entries };
        summary = entries.map((row, index) => {
          const line = selected[index];
          return line.name_snapshot + " · " + formatQuantity(row.quantity, line.unit_snapshot) +
            " recebidos de " + formatQuantity(row.expectedQuantity, line.unit_snapshot);
        }).join("\n");
      } else if (authorizingPurchase) {
        ({ body, summary } = purchaseApprovalSummary(data, form));
      } else if (action === "purchase") {
        const values = lines
          .flatMap((line) => {
            const value = String(form.get(line.id) ?? "").trim();
            if (!value) return [];
            if (!validQuantity(value, 6, true))
              throw new Error("Confira a quantidade de " + line.name_snapshot);
            const limit = acquisitionRemaining(line);
            if (quantity(value).gt(limit))
              throw new Error(
                "A quantidade supera o limite deste ato para " +
                line.name_snapshot,
              );
            const amount = { lineId: line.id, quantity: quantity(value).toFixed() };
            if (!registeringPurchase) return [amount];
            const inHand = form.has(line.id + ":inHand");
            const expectedDate = String(form.get(line.id + ":expectedDate") ?? "");
            return [{ ...amount, inHand, ...(!inHand && expectedDate ? { expectedDate } : {}) }];
          })
          .filter((line) => quantity(line.quantity).gt(0));
        if (!values.length)
          throw new Error("Informe ao menos uma quantidade positiva.");
        body = { lines: values };
        summary = values
          .map((value) => {
            const line = data.lines.find((line) => line.id === value.lineId)!;
            return (
              line.name_snapshot +
              ": " +
              formatQuantity(value.quantity, line.unit_snapshot)
            );
          })
          .join("\n");
      } else if (action === "receive" || action === "divergence") {
        command = "receive";
        if (action === "divergence" && !divergent.length)
          throw new Error("Selecione ao menos uma linha divergente.");
        const divergences = divergent.map((id) => {
          const value = String(form.get(id) ?? "");
          if (!validQuantity(value, 6, true))
            throw new Error("Informe o recebido nos itens divergentes.");
          const line = data.lines.find((line) => line.id === id)!;
          if (quantity(value).gt(line.quantity))
            throw new Error(
              "O recebido supera o expedido de " + line.name_snapshot,
            );
          return {
            lineId: id,
            acceptedQuantity: quantity(value).toFixed(),
            problem: String(form.get(id + ":problem") ?? ""),
            notes: reason,
          };
        });
        body = { divergences: action === "receive" ? [] : divergences };
        summary =
          action === "receive"
            ? "Confirmar o recebimento integral de todas as linhas e incorporar as quantidades ao estoque do destino."
            : "Aceitar integralmente as linhas não marcadas. Nas linhas selecionadas, incorporar imediatamente apenas a quantidade informada e abrir divergência para resolução.";
      } else if (action === "close_expectation") {
        if (
          !data.purchaseProgress?.expectationPending ||
          data.purchaseProgress.expectationClosed
        )
          throw new Error(
            "Não existe expectativa restante elegível para encerrar nesta versão.",
          );
        if (form.get("confirmed") !== "on")
          throw new Error(
            "Confirme expressamente o resumo antes de encerrar a expectativa.",
          );
        body = { reason, confirmed: true };
        summary =
          data.purchaseProgress.lines
            .map(
              (line) =>
                `${line.name}: aprovado ${formatQuantity(line.approvedQuantity, line.unit)}; adquirido ${formatQuantity(line.purchasedQuantity, line.unit)}; validado ${formatQuantity(line.validatedQuantity, line.unit)}; em conferência ${formatQuantity(line.pendingValidationQuantity, line.unit)}; não será adquirido ${formatQuantity(line.waivableQuantity, line.unit)}.`,
            )
            .join("\n") +
          "\n\nDispensar somente a expectativa não adquirida, sem entrada ou baixa de material. Parcelas pendentes continuam exigindo conferência.\nMotivo: " +
          reason;
      } else if (action === "resolve") {
        const selected = data.lines.find(
          (line) => line.id === selectedLine && line.metadata.issueOpen,
        );
        if (!selected)
          throw new Error(
            "Escolha uma linha divergente vigente para esta conciliação.",
          );
        if (
          !["received", "returned", "missing"].includes(resolutionSelection) ||
          (resolutionSelection === "received" &&
            data.recipient_id !== context.userId)
        )
          throw new Error(
            "Escolha uma solução disponível para sua atuação; recebimento pessoal pertence à pessoa indicada na entrega.",
          );
        const value = String(form.get("quantity"));
        if (!validQuantity(value, 6, true))
          throw new Error("Informe a quantidade conciliada.");
        body = {
          lineId: selectedLine,
          quantity: quantity(value).toFixed(),
          resolution: form.get("resolution"),
          reason,
        };
        summary = `Conciliar ${selected.name_snapshot}: ${formatQuantity(value, selected.unit_snapshot)}. Solução: ${{ received: "Recebimento complementar confirmado por mim", returned: "Material voltou à custódia de origem", missing: "Falta / perda conciliada" }[resolutionSelection as "received" | "returned" | "missing"]}. Motivo: ${reason}`;
      } else if (action === "cancel") {
        body = { reason };
        summary =
          "Registrar cancelamento. Caso já exista aceite na ENT, o documento aguardará o consentimento autenticado do recebedor e a conciliação dos materiais. Motivo: " +
          reason;
      }
      onReview(command, body, summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Revise os campos.");
    }
  }
  const needsReason = [
    "divergence",
    "close_expectation",
    "resolve",
    "cancel",
  ].includes(action);

  return (
    <form
      id={formId}
      ref={formElementRef}
      className={registeringPurchase || registeringArrival || authorizingPurchase ? "hca-purchase-list" : "mt-5 space-y-4 border-t border-(--line) pt-5"}
      onSubmit={submit}
      onChange={() => setFieldRevision((value) => value + 1)}
    >
      {data.type === "ENT" && ["receive", "divergence"].includes(action) ? <section className="ui-card hca-form-stack" aria-label="Avaliação familiar de atendimento"><h3>Informação da família para este recebimento</h3>{data.lines.map(line => { const description = familyFulfillmentDescription(line); return description ? <p key={line.id}><strong>{line.name_snapshot}.</strong> {description}</p> : null; })}<p>Você confirma as quantidades físicas. A avaliação familiar permanece em leitura.</p></section> : null}
      {action === "receive" && data.type === "ENT" ? (
        <Notice>
          Confirmar tudo aceita integralmente todos os produtos expedidos. Use
          “Informar divergência” quando houver diferença.
        </Notice>
      ) : null}
      {registeringPurchase ? <>
        {directPurchaseCredit ? <p className="hca-purchase-administrator"><Icon name="shield" />Aprovação automática · administrador</p> : null}
        {!mayReceivePurchase ? <Notice>O seu vínculo permite registrar a compra. A chegada será registrada por uma pessoa habilitada.</Notice> : null}
        {lines.map(line => <PurchaseFormLine key={line.id} line={line} fields={initialDraft?.fields} status={data.status}
          progress={data.purchaseProgress?.lines.find(progress => progress.lineId === line.id)}
          fieldId={instanceId + line.id} mayReceive={mayReceivePurchase} directCredit={directPurchaseCredit} />)}
      </> : null}
      {registeringArrival ? <PurchaseArrivalFields data={data} lines={lines} fields={initialDraft?.fields}
        mayReadStock={can(context, "stock.family.read")}
        directCredit={directPurchaseCredit} /> : null}
      {authorizingPurchase ? <PurchaseApprovalFields data={data} fields={initialDraft?.fields} /> : null}
      {action === "purchase" && !registeringPurchase
        ? lines.map((line) => {
          const remaining = acquisitionRemaining(line).toFixed();
          return (
            <div key={line.id} className="space-y-1">
              <label
                htmlFor={instanceId + line.id}
                className="block text-sm font-semibold"
              >
                {line.name_snapshot} · {line.unit_snapshot}
              </label>
              <input
                id={instanceId + line.id}
                className={inputClass}
                name={line.id}
                type="text"
                inputMode="decimal"
                maxLength={64}
                defaultValue={initialDraft?.fields[line.id] ?? ""}
                aria-describedby={instanceId + line.id + "-help"}
              />
              <p
                id={instanceId + line.id + "-help"}
                className="text-xs text-(--muted)"
              >
                Limite deste ato:{" "}
                {formatQuantity(remaining, line.unit_snapshot)}.{" "}
                Informe somente o adquirido nesta parcela.
              </p>
            </div>
          );
        })
        : null}
      {action === "divergence"
        ? data.lines.map((line) => (
          <div
            key={line.id}
            className="rounded-lg border border-(--line) p-3"
          >
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={divergent.includes(line.id)}
                onChange={(event) =>
                  setDivergent((current) =>
                    event.target.checked
                      ? [...current, line.id]
                      : current.filter((id) => id !== line.id),
                  )
                }
              />
              {line.name_snapshot} · expedido{" "}
              {formatQuantity(line.quantity, line.unit_snapshot)}
            </label>
            {divergent.includes(line.id) ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Efetivamente recebido
                  <input
                    className={inputClass}
                    name={line.id}
                    defaultValue={initialDraft?.fields[line.id] ?? ""}
                    type="text"
                    inputMode="decimal"
                    maxLength={64}
                    required
                  />
                </label>
                <label className="text-sm">
                  Diferença encontrada
                  <select
                    className={inputClass}
                    name={line.id + ":problem"}
                    defaultValue={
                      initialDraft?.fields[line.id + ":problem"] ?? "shortage"
                    }
                  >
                    <option value="shortage">Quantidade menor</option>
                    <option value="damaged">Material avariado</option>
                    <option value="wrong">Produto divergente</option>
                    <option value="other">Outra diferença</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        ))
        : null}
      {action === "close_expectation" ? (
        <section className="space-y-3">
          <h3 className="font-semibold">Expectativa que não será adquirida</h3>
          {data.purchaseProgress?.lines.map((line) => (
            <article
              key={line.lineId}
              className="rounded-xl border border-(--line) p-4 text-sm"
            >
              <strong>{line.name}</strong>
              <dl className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <dt>Aprovado</dt>
                  <dd>{formatQuantity(line.approvedQuantity, line.unit)}</dd>
                </div>
                <div>
                  <dt>Adquirido</dt>
                  <dd>{formatQuantity(line.purchasedQuantity, line.unit)}</dd>
                </div>
                <div>
                  <dt>Validado</dt>
                  <dd>{formatQuantity(line.validatedQuantity, line.unit)}</dd>
                </div>
                <div>
                  <dt>Em conferência</dt>
                  <dd>
                    {formatQuantity(line.pendingValidationQuantity, line.unit)}
                  </dd>
                </div>
                <div>
                  <dt>Não será adquirido</dt>
                  <dd className="font-semibold">
                    {formatQuantity(line.waivableQuantity, line.unit)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
          <Notice>
            Encerrar não recebe materiais nem altera o estoque. Aquisições já
            registradas e parcelas pendentes continuam exigindo chegada e
            conferência.
          </Notice>
          <label className="flex items-start gap-2 text-sm">
            <input
              key={data.version}
              type="checkbox"
              name="confirmed"
              defaultChecked={initialDraft?.fields.confirmed === "on"}
              required
            />
            Conferi o resumo e confirmo dispensar somente a expectativa não
            adquirida.
          </label>
        </section>
      ) : null}
      {action === "resolve" ? (
        <>
          <label className="block text-sm font-semibold">
            Linha divergente
            <select
              className={inputClass}
              name="lineId"
              value={selectedLine}
              onChange={(event) => setSelectedLine(event.target.value)}
              required
            >
              <option value="">Selecione</option>
              {selectedLine &&
                !data.lines.some(
                  (line) => line.id === selectedLine && line.metadata.issueOpen,
                ) ? (
                <option value={selectedLine}>
                  Linha preservada indisponível para esta conciliação
                </option>
              ) : null}
              {data.lines
                .filter((line) => line.metadata.issueOpen)
                .map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name_snapshot}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Resolução
            <select
              name="resolution"
              className={inputClass}
              value={resolutionSelection}
              onChange={(event) => setResolutionSelection(event.target.value)}
            >
              {!["returned", "missing"].includes(resolutionSelection) &&
                !(
                  resolutionSelection === "received" &&
                  data.recipient_id === context.userId
                ) ? (
                <option value={resolutionSelection}>
                  Solução preservada indisponível para sua atuação
                </option>
              ) : null}
              {data.recipient_id === context.userId ? (
                <option value="received">
                  Recebimento complementar confirmado por mim
                </option>
              ) : null}
              <option value="returned">
                Material voltou à custódia de origem
              </option>
              <option value="missing">Falta / perda conciliada</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Quantidade conciliada neste ato
            <input
              className={inputClass}
              type="text"
              name="quantity"
              defaultValue={initialDraft?.fields.quantity ?? ""}
              inputMode="decimal"
              autoComplete="off"
              required
            />
          </label>
        </>
      ) : null}
      {needsReason ? (
        <label className="block text-sm font-semibold">
          {action === "divergence" ? "Observações da divergência" : "Motivo / justificativa"}
          <textarea
            className={inputClass}
            name="reason"
            defaultValue={initialDraft?.fields.reason ?? ""}
            rows={3}
            minLength={3}
            maxLength={1000}
            required={action !== "divergence"}
          />
        </label>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      {!formId ? <div className="flex flex-wrap gap-3">
        <button className={buttonClass} type="button" onClick={onCancel}>
          Fechar ação
        </button>
        <button
          className={primaryClass}
          type="submit"
          disabled={reviewDisabled}
        >
          Revisar operação
        </button>
      </div> : null}
    </form>
  );
}
