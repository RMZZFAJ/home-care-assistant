"use client";

import { useCallback,useEffect,useId,useImperativeHandle,useRef, useState, type FormEvent, type Ref } from "react";
import { useMergedRefs } from "@fluentui/react-components";
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
import type { PatientPerson, SupplyDocument } from "@/types/documents";
import {
  acquisitionRemaining,
  arrivalRemaining,
} from "@/lib/documents/purchase";
import { formatBrazilDate } from "@/lib/receipt";
import { PurchaseReceiptContent } from "./purchase-details";
import { DeliveryConsumptionReferences } from "./delivery-cancellation";

export type DocumentAction =
  | "submit"
  | "approve"
  | "purchase"
  | "receive"
  | "divergence"
  | "validate_receipt"
  | "reject_receipt"
  | "close_expectation"
  | "reassign"
  | "resolve"
  | "approve_family"
  | "approve_supervisor"
  | "cancel"
  | "consent_cancel"
  | "refuse_cancellation"
  | "withdraw_cancellation";
export type ReceiptDraftHandle={snapshot:()=>ReceiptDraftContent};
export type CommandEditorProps={action:DocumentAction;data:SupplyDocument;people:PatientPerson[];context:WorkspaceContext;onCancel:()=>void;onReview:(action:string,body:unknown,summary:string,draftCommit?:{id:string;revision:number},expectedVersion?:number)=>void;formRef?:Ref<HTMLFormElement>;reviewDisabled?:boolean};
export function CommandEditorFields({
  action,
  data,
  people,
  context,
  onCancel,
  onReview,
  formRef,
  reviewDisabled = false,
  initialDraft,snapshotRef,onDraftChange,
}:CommandEditorProps&{initialDraft?:ReceiptDraftContent;snapshotRef?:Ref<ReceiptDraftHandle>;onDraftChange?:(content:ReceiptDraftContent)=>void}) {
  const [error, setError] = useState("");
  const instanceId = useId();
  const [reasonText, setReasonText] = useState(initialDraft?.fields.reason??"");
  const [returns, setReturns] = useState<Record<string, string>>({});
  const [receiptId, setReceiptId] = useState(
    data.receipts.find((receipt) => receipt.state === "pending")?.id ?? "",
  );
  const selectedReceipt = data.receipts.find(
    (receipt) => receipt.id === receiptId && receipt.state === "pending",
  );
  const [divergent, setDivergent] = useState<string[]>(initialDraft?.divergentIds??[]);
  const formElementRef=useRef<HTMLFormElement|null>(null);
  const mergedFormRef=useMergedRefs(formElementRef,formRef);
  const [fieldRevision,setFieldRevision]=useState(0);
  const captureSnapshot=useCallback(()=>({documentVersion:data.version,fields:Object.fromEntries([...new FormData(formElementRef.current!).entries()].filter((entry):entry is [string,string]=>typeof entry[1]==="string")),divergentIds:[...divergent],materials:data.lines.map(line=>({id:line.id,name:line.name_snapshot,unit:line.unit_snapshot,quantityDecimals:0}))}),[data,divergent]);
  useImperativeHandle(snapshotRef,()=>({snapshot:captureSnapshot}),[captureSnapshot]);
  useEffect(()=>{if(onDraftChange&&formElementRef.current)onDraftChange(captureSnapshot());},[onDraftChange,captureSnapshot,fieldRevision]);
  const [selectedLine, setSelectedLine] = useState(
    data.lines.find((line) => line.metadata.issueOpen)?.id ?? "",
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
      } else if (
        action === "approve" ||
        action === "purchase" ||
        (action === "receive" && data.type === "COM")
      ) {
        const values = lines
          .flatMap((line) => {
            const value = String(form.get(line.id) ?? "").trim();
            if (!value && action !== "approve") return [];
            if (!validQuantity(value, 6, true))
              throw new Error("Confira a quantidade de " + line.name_snapshot);
            const limit =
              action === "approve"
                ? quantity(line.quantity)
                : action === "purchase"
                  ? acquisitionRemaining(line)
                  : arrivalRemaining(line, data);
            if (quantity(value).gt(limit))
              throw new Error(
                "A quantidade supera o limite deste ato para " +
                  line.name_snapshot,
              );
            return [{ lineId: line.id, quantity: quantity(value).toFixed() }];
          })
          .filter(
            (line) => action === "approve" || quantity(line.quantity).gt(0),
          );
        if (!values.length)
          throw new Error("Informe ao menos uma quantidade positiva.");
        body = {
          lines: values,
          ...(action === "approve" && reason ? { reason } : {}),
        };
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
        if (action === "receive" && data.type === "COM")
          summary +=
            context.patient?.role === "admin" && can(context, "com.validate")
              ? "\nEsta chegada será validada imediatamente pela sua permissão administrativa, com entrada das quantidades declaradas no estoque familiar."
              : "\nRegistrar esta chegada para conferência, sem entrada no estoque até a validação autorizada.";
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
      } else if (action === "validate_receipt" || action === "reject_receipt") {
        if (!selectedReceipt)
          throw new Error("Selecione uma parcela pendente para conferir.");
        body = {
          receiptId: selectedReceipt.id,
          ...(action === "reject_receipt" ? { reason } : {}),
        };
        summary =
          action === "validate_receipt"
            ? "Validar este recebimento e incorporar suas quantidades ao estoque familiar."
            : "Rejeitar o recebimento indicado, sem entrada no estoque. Motivo: " +
              reason;
        summary +=
          "\nParcela informada por " +
          (selectedReceipt.submitted_name ?? "autor histórico não preservado") +
          " em " +
          formatBrazilDate(selectedReceipt.created_at) +
          ".\n" +
          selectedReceipt.lines
            .map((item) => {
              const line = data.lines.find((line) => line.id === item.lineId);
              return (
                (line?.name_snapshot ?? "Material registrado") +
                ": " +
                formatQuantity(item.quantity, line?.unit_snapshot)
              );
            })
            .join("\n");
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
      } else if (action === "reassign") {
        body = { recipientId: form.get("recipientId"), reason };
        summary =
          "Alterar o destinatário antes do primeiro aceite. Motivo: " + reason;
      } else if (action === "resolve") {
        const value = String(form.get("quantity"));
        if (!validQuantity(value, 6, true))
          throw new Error("Informe a quantidade conciliada.");
        body = {
          lineId: selectedLine,
          quantity: quantity(value).toFixed(),
          resolution: form.get("resolution"),
          reason,
        };
        summary =
          "Conciliar " +
          formatQuantity(value) +
          " da linha selecionada com a solução informada. Motivo: " +
          reason;
      } else if (action === "cancel") {
        body = { reason };
        summary =
          "Registrar cancelamento. Caso já exista aceite na ENT, o documento aguardará o consentimento autenticado do recebedor e a conciliação dos materiais. Motivo: " +
          reason;
      } else if (
        action === "refuse_cancellation" ||
        action === "withdraw_cancellation"
      ) {
        const request = data.deliveryCancellation?.request;
        if (!request || request.status !== "pending")
          throw new Error(
            "Não existe pedido de cancelamento vigente para esta ação. Atualize a ficha.",
          );
        body = { reason, requestId: request.id };
        summary = `${action === "refuse_cancellation" ? "Recusar" : "Retirar meu"} pedido de cancelamento de ${request.requestedName ?? "nome não preservado"}, ${formatBrazilDate(request.requestedAt)}. Motivo original: ${request.reason}\nJustificativa desta decisão: ${reason}\nA ficha retorna à conferência vigente; esta decisão não movimenta estoque.`;
      } else if (action === "consent_cancel") {
        const reference = data.deliveryCancellation;
        if (
          !reference?.sourceReady ||
          !reference.referenceHash ||
          reference.request.status !== "pending"
        )
          throw new Error(
            "Atualize as referências da conciliação. Os dados de origem não podem ser editados aqui.",
          );
        if (quantity(reference.unresolvedTransit ?? "0").gt(0))
          throw new Error(
            "Concilie a situação real do material em trânsito antes de consentir.",
          );
        const returned = data.lines.map((line) => {
          const source = reference.lines.find(
              (item) => item.lineId === line.id,
            ),
            raw = quantity(line.accepted_quantity).isZero()
              ? "0"
              : (returns[line.id] ?? "");
          if (
            !source ||
            !validQuantity(raw, source.quantityDecimals ?? 6, true) ||
            quantity(raw).gt(line.accepted_quantity) ||
            quantity(raw).lt(source.minimumReturnQuantity ?? "0")
          ) {
            (
              event.currentTarget.elements.namedItem(
                line.id + ":return",
              ) as HTMLInputElement | null
            )?.focus();
            throw new Error(
              "Confira a devolução real e o consumo já confirmado disponível para a linha indicada.",
            );
          }
          return { lineId: line.id, returnQuantity: quantity(raw).toFixed() };
        });
        body = {
          reason,
          requestId: reference.request.id,
          referenceHash: reference.referenceHash,
          lines: returned,
        };
        summary =
          `Consentir com o pedido de ${reference.request.requestedName ?? "nome não preservado"}, ${formatBrazilDate(reference.request.requestedAt)}. Motivo original: ${reference.request.reason}\n` +
          returned
            .map((item) => {
              const line = data.lines.find((line) => line.id === item.lineId)!;
              return `${line.name_snapshot}: devolução real ${formatQuantity(item.returnQuantity, line.unit_snapshot)}; consumo já confirmado referenciado ${formatQuantity(quantity(line.accepted_quantity).minus(item.returnQuantity).toFixed(), line.unit_snapshot)}.`;
            })
            .join("\n") +
          `\nJustificativa da conciliação: ${reason}\nSomente a devolução real movimenta estoque. O consumo anterior é referenciado uma vez, sem novo desconto.`;
      }
      onReview(command, body, summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Revise os campos.");
    }
  }
  const needsReason = [
    "approve",
    "divergence",
    "reject_receipt",
    "close_expectation",
    "reassign",
    "resolve",
    "cancel",
    "consent_cancel",
    "refuse_cancellation",
    "withdraw_cancellation",
  ].includes(action);
  const recipientRole =
    data.payload.destination === "FAMILY"
      ? ["admin", "family"]
      : ["admin", "professional", "supervisor"];
  return (
    <form
      ref={mergedFormRef}
      className="mt-5 space-y-4 border-t border-(--line) pt-5"
      onSubmit={submit}
      onChange={()=>setFieldRevision(value=>value+1)}
    >
      {action === "receive" && data.type === "ENT" ? (
        <Notice>
          Confirmar tudo aceita integralmente todos os produtos expedidos. Use
          “Informar divergência” quando houver diferença.
        </Notice>
      ) : null}
      {["approve", "purchase"].includes(action) ||
      (action === "receive" && data.type === "COM")
        ? lines.map((line) => {
            const remaining =
              action === "approve"
                ? line.quantity
                : action === "purchase"
                  ? acquisitionRemaining(line).toFixed()
                  : arrivalRemaining(line, data).toFixed();
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
                  defaultValue={action === "approve" ? remaining : ""}
                  required={action === "approve"}
                  aria-describedby={instanceId + line.id + "-help"}
                />
                <p
                  id={instanceId + line.id + "-help"}
                  className="text-xs text-(--muted)"
                >
                  Limite deste ato:{" "}
                  {formatQuantity(remaining, line.unit_snapshot)}.{" "}
                  {action === "receive"
                    ? "Informe somente o que chegou nesta parcela. Deixe vazio se não chegou."
                    : action === "purchase"
                      ? "Informe somente o adquirido agora. Deixe vazio para as outras linhas."
                      : "Aprovar não registra aquisição ou entrada no estoque."}
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
                      defaultValue={initialDraft?.fields[line.id]??""}
                      type="text"
                      inputMode="decimal"
                      maxLength={64}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Diferença encontrada
                    <select className={inputClass} name={line.id + ":problem"} defaultValue={initialDraft?.fields[line.id+":problem"]??"shortage"}>
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
      {["validate_receipt", "reject_receipt"].includes(action) ? (
        <div className="space-y-3">
          <label className="block text-sm font-semibold">
            Recebimento pendente
            <select
              className={inputClass}
              name="receiptId"
              required
              value={receiptId}
              onChange={(event) => setReceiptId(event.target.value)}
            >
              {data.receipts
                .filter((receipt) => receipt.state === "pending")
                .map((receipt) => (
                  <option key={receipt.id} value={receipt.id}>
                    {receipt.lines.length} produto(s) ·{" "}
                    {new Date(receipt.created_at).toLocaleString("pt-BR")}
                  </option>
                ))}
            </select>
          </label>
          {selectedReceipt ? (
            <section className="space-y-2">
              <h3 className="font-semibold">Parcela selecionada</h3>
              <PurchaseReceiptContent
                receipt={selectedReceipt}
                lines={data.lines}
              />
            </section>
          ) : (
            <Notice error>
              Não há parcela pendente disponível para esta decisão.
            </Notice>
          )}
        </div>
      ) : null}
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
              required
            />
            Conferi o resumo e confirmo dispensar somente a expectativa não
            adquirida.
          </label>
        </section>
      ) : null}
      {action === "reassign" ? (
        <label className="block text-sm font-semibold">
          Novo destinatário
          <select name="recipientId" className={inputClass} required>
            <option value="">Selecione</option>
            {people
              .filter(
                (person) =>
                  recipientRole.includes(person.role) &&
                  person.id !== data.recipient_id,
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {action === "resolve" ? (
        <>
          <label className="block text-sm font-semibold">
            Linha divergente
            <select
              className={inputClass}
              value={selectedLine}
              onChange={(event) => setSelectedLine(event.target.value)}
              required
            >
              <option value="">Selecione</option>
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
            <select name="resolution" className={inputClass}>
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
              inputMode="decimal"
              autoComplete="off"
              required
            />
          </label>
        </>
      ) : null}
      {[
        "consent_cancel",
        "refuse_cancellation",
        "withdraw_cancellation",
      ].includes(action) && data.deliveryCancellation ? (
        <section className="space-y-2">
          <h3 className="font-semibold">Pedido original em leitura</h3>
          <p>
            {data.deliveryCancellation.request.requestedName ??
              "Nome não preservado"}{" "}
            · {formatBrazilDate(data.deliveryCancellation.request.requestedAt)}
          </p>
          <p className="whitespace-pre-wrap">
            {data.deliveryCancellation.request.reason}
          </p>
        </section>
      ) : null}
      {action === "consent_cancel" ? (
        <>
          <Notice>
            Informe somente as devoluções físicas reais. A parte do aceite que
            não será devolvida precisa de consumo já confirmado nas referências
            abaixo; esta conciliação não registra um novo consumo.
          </Notice>
          {data.lines.map((line) => (
            <fieldset
              key={line.id}
              className="grid min-w-0 gap-3 rounded border border-(--line) p-3 sm:grid-cols-2"
            >
              <legend className="px-2 text-sm font-semibold">
                {line.name_snapshot} · aceito{" "}
                {formatQuantity(line.accepted_quantity)}
              </legend>
              <div>
                <p>
                  Consumo já confirmado disponível:{" "}
                  {formatQuantity(
                    data.deliveryCancellation?.lines.find(
                      (item) => item.lineId === line.id,
                    )?.availableConsumedQuantity,
                    line.unit_snapshot,
                  )}
                </p>
                {data.deliveryCancellation?.lines.find(
                  (item) => item.lineId === line.id,
                ) ? (
                  <DeliveryConsumptionReferences
                    line={
                      data.deliveryCancellation.lines.find(
                        (item) => item.lineId === line.id,
                      )!
                    }
                  />
                ) : null}
              </div>
              {quantity(line.accepted_quantity).gt(0) ? (
                <label className="text-sm">
                  Devolução física real · {line.name_snapshot} ·{" "}
                  {line.unit_snapshot}
                  <input
                    name={line.id + ":return"}
                    className={inputClass}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby={instanceId + line.id + "-return-help"}
                    value={returns[line.id] ?? ""}
                    onChange={(event) =>
                      setReturns((values) => ({
                        ...values,
                        [line.id]: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              ) : (
                <p>
                  Sem quantidade aceita nesta linha: devolução e consumo
                  conciliados são zero.
                </p>
              )}
              <p
                id={instanceId + line.id + "-return-help"}
                className="hca-field-hint"
              >
                Informe a devolução em {line.unit_snapshot}, com até{" "}
                {data.deliveryCancellation?.lines.find(
                  (item) => item.lineId === line.id,
                )?.quantityDecimals ?? 6}{" "}
                casas decimais. Aceita vírgula ou ponto.
              </p>
              <p className="text-sm">
                Parcela do aceite a conciliar com consumo confirmado:{" "}
                {quantity(line.accepted_quantity).isZero()
                  ? formatQuantity("0", line.unit_snapshot)
                  : returns[line.id] !== undefined &&
                      validQuantity(returns[line.id], 6, true) &&
                      quantity(returns[line.id]).lte(line.accepted_quantity)
                    ? formatQuantity(
                        quantity(line.accepted_quantity)
                          .minus(quantity(returns[line.id]))
                          .toFixed(),
                        line.unit_snapshot,
                      )
                    : "Aguardando declaração da devolução real"}
              </p>
            </fieldset>
          ))}
        </>
      ) : null}
      {needsReason ? (
        <label className="block text-sm font-semibold">
          {action === "refuse_cancellation"
            ? "Motivo da recusa"
            : action === "withdraw_cancellation"
              ? "Motivo da retirada"
              : action === "divergence"
                ? "Observações da divergência"
                : "Motivo / justificativa"}
          <textarea
            className={inputClass}
            name="reason"
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            rows={3}
            minLength={3}
            maxLength={1000}
            required={!["approve", "divergence"].includes(action)}
          />
        </label>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      <div className="flex flex-wrap gap-3">
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
      </div>
    </form>
  );
}
