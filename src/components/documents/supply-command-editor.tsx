"use client";
import { useImperativeHandle, useRef, useState, type RefObject } from "react";
import type { SupplyDocument } from "@/types/documents";
import { Notice, buttonClass } from "@/components/workspace";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { navigationForStep, draftFlow } from "@/lib/forms/draft-navigation";
import {
  isComOperationPurpose,
  isEntOperationPurpose,
  type EntOperationPurpose,
  type ComOperationPurpose,
  type ReceiptDraftContent,
} from "@/lib/validation/supply-drafts";
import {
  deliveryRequestDraftFields,
  deliveryConsentDraftFields,
  consentReferenceReady,
} from "@/lib/forms/delivery-draft-reference";
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
  adoptCancellationReference: (official: SupplyDocument) => boolean;
};
type OperationEditorProps = CommandEditorProps & {
  referenceAdoptionRef?: RefObject<OperationReferenceHandle | null>;
  onCompareCancellationReference?: () => void;
  recoveryOnly?: boolean;
};
export function CommandEditor(props: OperationEditorProps) {
  const purpose = props.action;
  if (
    (props.data.type === "ENT" && isEntOperationPurpose(purpose)) ||
    (props.data.type === "COM" && isComOperationPurpose(purpose))
  )
    return (
      <PrivateOperationEditor
        key={props.data.id + ":" + purpose}
        {...props}
        kind={props.data.type}
        purpose={purpose}
      />
    );
  return <CommandEditorFields {...props} />;
}
function PrivateOperationEditor(
  props: OperationEditorProps & {
    kind: "COM" | "ENT";
    purpose: OperationPurpose;
  },
) {
  const com = props.kind === "COM";
  const consent = props.kind === "ENT" && props.purpose === "consent_cancel";
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
    fields: consent ? deliveryConsentDraftFields(props.data) : {},
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
  const flow = draftFlow(props.kind, props.purpose)!;
  const [confirmationReset, setConfirmationReset] = useState(false);
  function restore(content: ReceiptDraftContent) {
    setInitial(content);
    setBaseline(content);
    setCurrent(content);
    setFormRevision((v) => v + 1);
    setError("");
  }
  const draft = useCreationDraft({
    userId: props.context.userId,
    patientId: props.data.care_recipient_id,
    kind: props.kind,
    purpose: props.purpose,
    targetDocumentId: props.data.id,
    navigation: navigationForStep(flow, 0),
    onResume: (saved) => {
      if (!saved.content || !("fields" in saved.content) || saved.content.documentVersion === null) return false;
      restore(saved.content);
      setConfirmationReset(false);
      return true;
    },
    onDiscard: () => {
      restore(empty);
      setConfirmationReset(false);
    },
  });
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
        official.version <= baseline.documentVersion ||
        draft.blocked
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
    adoptCancellationReference(official) {
      if (
        !consent ||
        props.recoveryOnly ||
        !captureRef.current ||
        official.id !== props.data.id ||
        official.care_recipient_id !== props.data.care_recipient_id ||
        official.version < baseline.documentVersion ||
        !consentReferenceReady(official) ||
        draft.blocked
      )
        return false;
      const content = snapshot();
      restore({
        ...content,
        documentVersion: official.version,
        fields: {
          ...content.fields,
          ...current.fields,
          ...deliveryConsentDraftFields(official),
        },
        materials: official.lines.map((line) => ({
          id: line.id,
          name: line.name_snapshot,
          unit: line.unit_snapshot,
          quantityDecimals: 0,
        })),
      });
      setComparison(false);
      return true;
    },
  }));
  const reference = deliveryConsentDraftFields(props.data);
  const stale =
    baseline.documentVersion !== props.data.version ||
    (consent &&
      (baseline.fields.referenceHash !== reference.referenceHash ||
        baseline.fields.requestId !== reference.requestId));
  const currentIds = new Set(props.data.lines.map((line) => line.id));
  const removedValues = com
    ? baseline.materials.filter(
        (material) =>
          !currentIds.has(material.id) && !!baseline.fields[material.id],
      )
    : [];
  async function review(action: string, body: unknown, summary: string) {
    if (stale || draft.blocked || props.reviewDisabled) return;
    setError("");
    try {
      const saved = await draft.save(snapshot());
      if (saved)
        props.onReview(
          action,
          structuredClone(body),
          summary,
          { id: saved.id, revision: saved.revision },
          baseline.documentVersion,
        );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o preenchimento.",
      );
    }
  }
  if (draft.readDenied || draft.protectedReadPending)
    return (
      <section tabIndex={-1} data-private-operation-recovery>
        <CreationDraftPanel
          draft={draft}
          current={baseline}
          patientName={
            props.context.patient?.display_name ?? "Paciente selecionado"
          }
          disabled={props.reviewDisabled}
        />
      </section>
    );
  if (props.recoveryOnly)
    return (
      <section
        className="hca-form-stack"
        tabIndex={-1}
        data-private-operation-recovery
      >
        <Notice>
          A operação oficial não está disponível neste estado ou perfil. Você
          pode consultar seu preenchimento, descartá-lo ou reconhecer um
          resultado já aplicado, sem repetir o ato.
        </Notice>
        <CreationDraftPanel
          draft={draft}
          current={baseline}
          patientName={
            props.context.patient?.display_name ?? "Paciente selecionado"
          }
          resumeLabel="Consultar preenchimento salvo"
          discardLabel="Descartar preenchimento privado"
          acknowledgeLabel="Reconhecer resultado aplicado"
        />
        {draft.base?.state === "active" && !draft.offered ? (
          <DraftContentSummary
            content={draft.base.content}
            kind={props.kind}
            purpose={props.purpose}
            navigation={draft.base.navigation}
          />
        ) : null}
        {!draft.loading &&
        !draft.loadError &&
        !draft.offered &&
        !draft.base &&
        !draft.consumed &&
        !draft.pending ? (
          <p>
            Nenhum preenchimento ou resultado privado pendente para esta
            operação neste perfil.
          </p>
        ) : null}
        <button type="button" className={buttonClass} onClick={props.onCancel}>
          Fechar consulta do preenchimento
        </button>
      </section>
    );
  return (
    <section
      className="mt-4 space-y-4"
      tabIndex={-1}
      data-private-operation-recovery
      aria-label={
        personalReceipt
          ? "Conferência pessoal em preparação"
          : `Operação ${props.kind} em preparação`
      }
    >
      <CreationDraftPanel
        draft={draft}
        current={{
          ...current,
          fields: fullReference
            ? { ...baseline.fields, ...current.fields }
            : current.fields,
          documentVersion: baseline.documentVersion,
          materials: baseline.materials,
        }}
        patientName={
          props.context.patient?.display_name ?? "Paciente selecionado"
        }
        disabled={props.reviewDisabled}
      />
      <p>
        {personalReceipt
          ? "Este preenchimento pertence somente a você e a esta entrega. Recebimento exige confirmação própria."
          : `Este preenchimento pertence somente a você, a esta ${props.kind} e a este tipo de operação. Salvar não confirma decisões, recebimento ou movimentação de estoque; a confirmação é uma etapa própria.`}
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {consent && !stale && props.onCompareCancellationReference ? (
        <button
          type="button"
          className={buttonClass}
          disabled={draft.blocked || props.reviewDisabled}
          onClick={props.onCompareCancellationReference}
        >
          Conferir fontes atuais da conciliação
        </button>
      ) : null}
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
          {consent ? (
            <p>
              O pedido ou a fonte de consumo consultada mudou. A versão da ficha
              pode continuar igual. Suas devoluções digitadas e seu motivo
              permanecem preservados.
            </p>
          ) : null}
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              if (consent && props.onCompareCancellationReference)
                props.onCompareCancellationReference();
              else setComparison(true);
            }}
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
                disabled={draft.blocked || props.reviewDisabled}
                onClick={() => {
                  const content = snapshot();
                  for (const material of removedValues)
                    delete content.fields[material.id];
                  restore(content);
                }}
              >
                Retirar estes valores do preenchimento privado
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
                    draft.blocked ||
                    props.reviewDisabled ||
                    !!removedValues.length
                  }
                  onClick={() => {
                    const content = {
                      ...snapshot(),
                      documentVersion: props.data.version,
                      materials: empty.materials,
                    };
                    if (
                      props.kind === "ENT" &&
                      ["refuse_cancellation", "withdraw_cancellation"].includes(
                        props.purpose,
                      )
                    )
                      Object.assign(
                        content.fields,
                        deliveryRequestDraftFields(props.data),
                      );
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
                draft.blocked || props.reviewDisabled || !!removedValues.length
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
      {!draft.readDenied ? (
        <fieldset
          className="min-w-0"
          disabled={draft.blocked || props.reviewDisabled}
        >
          <button
            type="button"
            className={buttonClass}
            onClick={() => void draft.save(snapshot())}
          >
            {personalReceipt
              ? "Salvar conferência privada"
              : "Salvar preenchimento privado"}
          </button>
          <CommandEditorFields
            key={formRevision}
            {...props}
            initialDraft={initial}
            snapshotRef={captureRef}
            onDraftChange={setCurrent}
            reviewDisabled={props.reviewDisabled || stale || draft.blocked}
            onReview={(action, body, summary) =>
              void review(action, body, summary)
            }
          />
        </fieldset>
      ) : null}
    </section>
  );
}
