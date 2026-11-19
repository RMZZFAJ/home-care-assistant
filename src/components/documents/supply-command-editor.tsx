"use client";
import { useId, useImperativeHandle, useRef, useState, type ReactNode, type RefObject } from "react";
import type { SupplyDocument } from "@/types/documents";
import { Notice, buttonClass, can } from "@/components/workspace";
import { Dialog } from "@/components/ui/overlays";
import { ActionButton } from "@/components/ui/controls";
import {
  isComOperationPurpose,
  isEntOperationPurpose,
  type EntOperationPurpose,
  type ComOperationPurpose,
  type ReceiptDraftContent,
} from "@/lib/validation/supply-drafts";
import { DraftReferenceComparison } from "./draft-reference-comparison";
import {
  CommandEditorFields,
  type CommandEditorProps,
  type ReceiptDraftHandle,
} from "./supply-command-fields";
export type { DocumentAction } from "./supply-command-fields";

type OperationPurpose = EntOperationPurpose | ComOperationPurpose;
export type OperationReferenceHandle = {
  adoptClosingReference: (official: SupplyDocument) => boolean;
};
type OperationEditorProps = CommandEditorProps & {
  referenceAdoptionRef?: RefObject<OperationReferenceHandle | null>;
  recoveryOnly?: boolean;
  purchaseFeedback?: string;
  purchaseConflictContent?: ReactNode;
  confirmationPending?: boolean;
};
export function CommandEditor(props: OperationEditorProps) {
  const purpose = props.action;
  if (
    (props.data.type === "ENT" && isEntOperationPurpose(purpose)) ||
    (props.data.type === "COM" && isComOperationPurpose(purpose))
  )
    return (
      <OperationEditor
        key={props.data.id + ":" + purpose}
        {...props}
        kind={props.data.type}
        purpose={purpose}
      />
    );
  return <CommandEditorFields {...props} />;
}
function OperationEditor(
  props: OperationEditorProps & {
    kind: "COM" | "ENT";
    purpose: OperationPurpose;
  },
) {
  const com = props.kind === "COM";
  const purchase = props.purpose === "purchase" && props.data.payload.origin !== "donation";
  const arrival = com && props.purpose === "receive";
  const coveredEditor = purchase || arrival;
  const directCredit = props.context.patient?.role === "admin" && can(props.context, "com.validate");
  const purchaseFormId = useId();
  const personalReceipt =
    props.kind === "ENT" &&
    (props.purpose === "receive" || props.purpose === "divergence");
  const fullReference = !personalReceipt;
  const captureRef = useRef<ReceiptDraftHandle | null>(null);
  const [initial, setInitial] = useState<ReceiptDraftContent | undefined>();
  const [formRevision, setFormRevision] = useState(0),
    [error, setError] = useState("");
  const empty: ReceiptDraftContent = {
    documentVersion: props.data.version,
    fields: {},
    divergentIds: [],
    materials: props.data.lines.map((line) => ({
      id: line.id,
      name: line.name_snapshot,
      unit: line.unit_snapshot,
      quantityDecimals: 0,
    })),
  };
  const [baseline, setBaseline] = useState(empty),
    [comparison, setComparison] = useState(false),
    [current, setCurrent] = useState(empty);
  const [confirmExit, setConfirmExit] = useState(false);
  const initialCaptureRef = useRef<string | null>(null);
  const [confirmationReset, setConfirmationReset] = useState(false);
  function restore(content: ReceiptDraftContent) {
    setInitial(content);
    setBaseline(content);
    setCurrent(content);
    setFormRevision((v) => v + 1);
    setError("");
  }
  const snapshot = () => {
    const captured = captureRef.current!.snapshot();
    return {
      ...captured,
      fields: fullReference
        ? { ...baseline.fields, ...captured.fields }
        : captured.fields,
      documentVersion: baseline.documentVersion,
      materials: baseline.materials,
    };
  };
  useImperativeHandle(props.referenceAdoptionRef, () => ({
    adoptClosingReference(official) {
      if (
        props.kind !== "COM" ||
        props.recoveryOnly ||
        !captureRef.current ||
        props.purpose !== "close_expectation" ||
        official.type !== "COM" ||
        official.id !== props.data.id ||
        official.care_recipient_id !== props.data.care_recipient_id ||
        official.version <= baseline.documentVersion
      )
        return false;
      // Called only by the explicit adoption of authorized, frozen comparison facts.
      const content = snapshot();
      restore({
        ...content,
        documentVersion: official.version,
        // FormData omits controls disabled by the conflict. Keep the last live
        // private reason capture, while always clearing the old acknowledgement.
        fields: {
          ...content.fields,
          reason: current.fields.reason ?? baseline.fields.reason ?? "",
          confirmed: "",
        },
        materials: official.lines.map((line) => ({
          id: line.id,
          name: line.name_snapshot,
          unit: line.unit_snapshot,
          quantityDecimals: 0,
        })),
      });
      setConfirmationReset(true);
      setComparison(false);
      return true;
    },
  }));
  const stale = baseline.documentVersion !== props.data.version;
  const currentIds = new Set(props.data.lines.map((line) => line.id));
  const removedValues = com
    ? baseline.materials.filter(
        (material) =>
          !currentIds.has(material.id) && !!baseline.fields[material.id],
      )
    : [];
  function requestClose() {
    const fields = captureRef.current?.snapshot().fields ?? current.fields;
    if (JSON.stringify(fields) !== (initialCaptureRef.current ?? JSON.stringify(empty.fields))) setConfirmExit(true);
    else props.onCancel();
  }
  async function review(action: string, body: unknown, summary: string) {
    if (stale || props.reviewDisabled || props.recoveryOnly) return;
    setError(""); props.onReview(action, structuredClone(body), summary, undefined, baseline.documentVersion);
  }
  const content = (
    <section
      className={coveredEditor ? "space-y-4" : "mt-4 space-y-4"}
      tabIndex={-1}
      data-operation-editor
      aria-label={
        personalReceipt
          ? "Conferência pessoal"
          : `Operação ${props.kind}`
      }
    >

      {!coveredEditor ? <p>Confira os dados antes de confirmar. Ao sair, os campos desta ação serão descartados.</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {coveredEditor && props.purchaseFeedback ? <Notice error>{props.purchaseFeedback}</Notice> : null}
      {coveredEditor ? props.purchaseConflictContent : null}
      {confirmationReset ? (
        <Notice>
          A confirmação anterior foi desmarcada porque a referência mudou.
          Confira novamente a expectativa vigente antes de marcar a confirmação.
        </Notice>
      ) : null}
      {stale ? (
        <Notice>
          Este preenchimento usa a versão {baseline.documentVersion}; a ficha
          vigente está na versão {props.data.version}.
          <button
            type="button"
            className={buttonClass}
            onClick={() => setComparison(true)}
          >
            {fullReference
              ? "Comparar referência da operação"
              : "Comparar referência da conferência"}
          </button>
        </Notice>
      ) : null}
      {comparison ? (
        <section
          className="ui-card"
          aria-label={
            fullReference
              ? "Comparação da referência da operação"
              : "Comparação da referência da entrega"
          }
        >
          <h3>Referência anterior e vigente</h3>
          <p>
            Versão do preenchimento: {baseline.documentVersion}. Versão vigente:{" "}
            {props.data.version}.
          </p>
          <h4>Materiais da referência anterior</h4>
          <ul>
            {baseline.materials.map((m) => (
              <li key={m.id}>
                {m.name} · {m.unit}
                {com
                  ? ` · Preenchimento: ${baseline.fields[m.id] || "Não informado"}`
                  : ""}
              </li>
            ))}
          </ul>
          <h4>
            {com
              ? "Materiais da COM vigente"
              : "Materiais expedidos na versão vigente"}
          </h4>
          <ul>
            {props.data.lines.map((line) => (
              <li key={line.id}>
                {line.name_snapshot} · {line.quantity} {line.unit_snapshot}
              </li>
            ))}
          </ul>
          <p>
            {com
              ? "Aprovação, aquisição, chegada e entrada no estoque são fatos distintos. Seus valores serão preservados; confira os limites vigentes antes da revisão. Nenhuma operação será confirmada nesta comparação."
              : personalReceipt
                ? "Pessoa indicada e destino devem ser conferidos nos fatos da expedição. Seus valores preenchidos serão preservados; nenhum recebimento será confirmado aqui."
                : "Pessoa indicada, pedido de cancelamento e situação da linha pertencem à referência da entrega. Seus valores permanecem preservados; adotar a referência não troca destinatário, recebe, concilia ou cancela materiais."}
          </p>
          {removedValues.length ? (
            <Notice>
              Há valores de materiais ausentes na versão vigente. Eles continuam
              preservados e precisam de uma decisão antes de adotar a nova
              referência.
              <ul>
                {removedValues.map((m) => (
                  <li key={m.id}>
                    {m.name}: {baseline.fields[m.id]} {m.unit}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={buttonClass}
                disabled={props.reviewDisabled}
                onClick={() => {
                  const content = snapshot();
                  for (const material of removedValues)
                    delete content.fields[material.id];
                  restore(content);
                }}
              >
                Retirar estes valores do preenchimento
              </button>
            </Notice>
          ) : null}
          {fullReference ? (
            <DraftReferenceComparison
              id={props.data.id}
              fromVersion={baseline.documentVersion}
              toVersion={props.data.version}
            >
              {(ready) => (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={
                    !ready ||
                    props.reviewDisabled ||
                    !!removedValues.length
                  }
                  onClick={() => {
                    const content = {
                      ...snapshot(),
                      documentVersion: props.data.version,
                      materials: empty.materials,
                    };
                    if (props.purpose === "close_expectation") {
                      delete content.fields.confirmed;
                      setConfirmationReset(true);
                    }
                    restore(content);
                    setComparison(false);
                  }}
                >
                  Usar referência vigente e manter preenchimento
                </button>
              )}
            </DraftReferenceComparison>
          ) : (
            <button
              type="button"
              className={buttonClass}
              disabled={
                props.reviewDisabled || !!removedValues.length
              }
              onClick={() => {
                setBaseline({
                  ...snapshot(),
                  documentVersion: props.data.version,
                  materials: empty.materials,
                });
                setComparison(false);
              }}
            >
              Usar referência vigente e manter preenchimento
            </button>
          )}
        </section>
      ) : null}
      {props.recoveryOnly ? <Notice>Esta ação não está disponível na situação atual. Fechar descarta os campos desta tela.</Notice> : (
        <fieldset
          className="min-w-0"
          disabled={props.reviewDisabled}
        >

          <CommandEditorFields
            key={formRevision}
            {...props}
            formId={coveredEditor ? purchaseFormId : undefined}
            initialDraft={initial}
            snapshotRef={captureRef}
            onDraftChange={value => { initialCaptureRef.current ??= JSON.stringify(value.fields); setCurrent(value); }}
            onCancel={requestClose}
            reviewDisabled={props.reviewDisabled || stale}
            onReview={(action, body, summary) =>
              void review(action, body, summary)
            }
          />
        </fieldset>
      )}
      <Dialog open={confirmExit} title="Sair sem concluir?" onClose={() => setConfirmExit(false)}>
        <p>Os campos desta ação serão descartados. Sair não confirma nenhuma alteração.</p>
        <div className="hca-toolbar"><button type="button" className={buttonClass} onClick={() => setConfirmExit(false)}>Voltar ao preenchimento</button><button type="button" className={buttonClass} onClick={props.onCancel}>Sair e descartar</button></div>
      </Dialog>
    </section>
  );
  if (!coveredEditor) return content;
  const subtitle = purchase ? "Marque os materiais que já estão com você." :
    directCredit ? "Marque o que chegou. Sua confirmação libera as quantidades no estoque familiar." :
      "Marque o que chegou. A família poderá usar essas quantidades após a aprovação do administrador.";
  return <Dialog open title={purchase ? "Registrar compra" : "Registrar chegada"} subtitle={subtitle}
    kicker={props.context.patient?.display_name ? "COM · " + props.context.patient.display_name.toLocaleUpperCase("pt-BR") : "COM"}
    onClose={requestClose} closeDisabled={props.confirmationPending}
    footer={<>
      <ActionButton onClick={requestClose} disabled={props.confirmationPending}>Voltar</ActionButton>
      <ActionButton type="submit" variant="primary" form={purchaseFormId}
        disabled={props.reviewDisabled || stale || props.recoveryOnly}>
        {purchase ? "Confirmar compra" : directCredit ? "Confirmar entrada" : "Enviar para aprovação"}
      </ActionButton>
    </>}>{content}</Dialog>;
}
