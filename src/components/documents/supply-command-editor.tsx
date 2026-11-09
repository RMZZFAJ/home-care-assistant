"use client";
import { useRef, useState } from "react";
import { Notice, buttonClass } from "@/components/workspace";
import { CreationDraftPanel } from "@/components/forms/creation-draft-panel";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  navigationForStep,
  type DraftFlow,
} from "@/lib/forms/draft-navigation";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import {
  CommandEditorFields,
  type CommandEditorProps,
  type ReceiptDraftHandle,
} from "./supply-command-fields";
export type { DocumentAction } from "./supply-command-fields";

type OperationPurpose = "receive" | "divergence" | "approve" | "purchase";
export function CommandEditor(props: CommandEditorProps) {
  const purpose = props.action;
  if (
    (props.data.type === "ENT" &&
      (purpose === "receive" || purpose === "divergence")) ||
    (props.data.type === "COM" &&
      (purpose === "approve" ||
        purpose === "purchase" ||
        purpose === "receive"))
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
  props: CommandEditorProps & {
    kind: "COM" | "ENT";
    purpose: OperationPurpose;
  },
) {
  const com = props.kind === "COM";
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
  const flow: DraftFlow = com
    ? props.purpose === "approve"
      ? "APPROVE"
      : props.purpose === "purchase"
        ? "PURCHASE"
        : "ARRIVAL"
    : props.purpose === "receive"
      ? "RECEIVE"
      : "DIVERGENCE";
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
      if (!saved.content || !("fields" in saved.content)) return false;
      restore(saved.content);
      return true;
    },
    onDiscard: () => {
      restore(empty);
    },
  });
  const snapshot = () => {
    const captured = captureRef.current!.snapshot();
    return {
      ...captured,
      fields: com
        ? { ...baseline.fields, ...captured.fields }
        : captured.fields,
      documentVersion: baseline.documentVersion,
      materials: baseline.materials,
    };
  };
  const stale = baseline.documentVersion !== props.data.version;
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
      <CreationDraftPanel
        draft={draft}
        current={baseline}
        patientName={
          props.context.patient?.display_name ?? "Paciente selecionado"
        }
        disabled={props.reviewDisabled}
      />
    );
  return (
    <section
      className="mt-4 space-y-4"
      aria-label={
        com ? "Operação COM em preparação" : "Conferência pessoal em preparação"
      }
    >
      <CreationDraftPanel
        draft={draft}
        current={{
          ...current,
          fields: com
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
        {com
          ? "Este preenchimento pertence somente a você, a esta COM e a este tipo de operação. Salvar não aprova, adquire, recebe ou movimenta estoque; a confirmação é uma etapa própria."
          : "Este preenchimento pertence somente a você e a esta entrega. Recebimento exige confirmação própria."}
      </p>
      {error ? <Notice error>{error}</Notice> : null}
      {stale ? (
        <Notice>
          Este preenchimento usa a versão {baseline.documentVersion}; a ficha
          vigente está na versão {props.data.version}.
          <button
            type="button"
            className={buttonClass}
            onClick={() => setComparison(true)}
          >
            {com
              ? "Comparar referência da operação"
              : "Comparar referência da conferência"}
          </button>
        </Notice>
      ) : null}
      {comparison ? (
        <section
          className="ui-card"
          aria-label={
            com
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
              : "Pessoa indicada e destino devem ser conferidos nos fatos da expedição. Seus valores preenchidos serão preservados; nenhum recebimento será confirmado aqui."}
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
            {com
              ? "Salvar preenchimento privado"
              : "Salvar conferência privada"}
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
