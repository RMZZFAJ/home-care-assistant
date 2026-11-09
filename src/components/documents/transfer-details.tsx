"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState } from "react";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import type { SupplyDocument } from "@/types/documents";
import {
  transferActionLabels as actionLabels,
  type TransferAction,
} from "@/lib/forms/transfer-decision-draft";
import { TransferDecisionEditor } from "./transfer-decision-editor";
import { RelatedDocument } from "./related-document";
import { TransferFactsDisplay } from "./transfer-facts";

export function TransferDetails({
  data,
  context,
  onUpdated,
  onEditingChange,
}: {
  data: SupplyDocument;
  context: WorkspaceContext;
  onUpdated: (document: SupplyDocument) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [selected, setSelected] = useState<{
    action: TransferAction;
    consulting: boolean;
    trigger: HTMLElement;
  } | null>(null);
  const [message, setMessage] = useState("");
  const headerRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    onEditingChange(!!selected);
    return () => onEditingChange(false);
  }, [selected, onEditingChange]);
  const facts = data.transfer;
  if (!facts) return null;
  return (
    <section
      className="ui-card hca-form-stack"
      aria-label="Declaração e concordância da transferência"
    >
      <h2 ref={headerRef} tabIndex={-1}>
        Atos da transferência física
      </h2>
      <TransferFactsDisplay facts={facts} />
      {facts.originDocumentId ? (
        <RelatedDocument
          id={facts.originDocumentId}
          type="ENT"
          label="Consultar ENT documental de origem"
        />
      ) : (
        <p>Origem documental não informada.</p>
      )}
      <p className="text-sm">
        O vínculo documental preserva a origem conhecida. Não individualiza
        lotes e não transforma concordância em recebimento.
      </p>
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        {(Object.keys(actionLabels) as TransferAction[])
          .filter((action) =>
            action === "dispatch"
              ? facts.canDispatch
              : action === "withdraw"
                ? facts.canWithdraw
                : facts.canAgree,
          )
          .map((action) => (
            <ActionButton
              key={action}
              variant={
                action === "agree" || action === "dispatch"
                  ? "primary"
                  : "secondary"
              }
              onClick={(event) =>
                setSelected({
                  action,
                  consulting: false,
                  trigger: event.currentTarget,
                })
              }
            >
              {actionLabels[action]}
            </ActionButton>
          ))}
      </div>
      <details className="hca-form-stack">
        <summary>Meus preenchimentos da transferência</summary>
        <p>
          Consulte somente seus preenchimentos e resultados, inclusive quando o
          ato não estiver mais disponível.
        </p>
        <div className="hca-form-stack">
          {(Object.keys(actionLabels) as TransferAction[]).map((action) => (
            <ActionButton
              key={action}
              onClick={(event) =>
                setSelected({
                  action,
                  consulting: true,
                  trigger: event.currentTarget,
                })
              }
            >
              Consultar preenchimento: {actionLabels[action]}
            </ActionButton>
          ))}
        </div>
      </details>
      {selected ? (
        <TransferDecisionEditor
          key={selected.action + ":" + selected.consulting}
          original={data}
          context={context}
          action={selected.action}
          consulting={selected.consulting}
          restoreFocusTo={selected.trigger}
          onClose={() => setSelected(null)}
          onSaved={(result) => {
            onUpdated(result);
            setSelected(null);
            setMessage(
              selected.action === "dispatch"
                ? "Expedição confirmada. Os materiais estão em trânsito até o recebimento pessoal."
                : selected.action === "agree"
                  ? "Concordância registrada com sua autoria. Ainda não houve expedição nem recebimento."
                  : "Decisão registrada sem movimentar materiais.",
            );
            requestAnimationFrame(() => headerRef.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
