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
import { materialTransferDirection, materialTransferLabel } from "@/lib/documents/transfer-follow-up";

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
      aria-label="Expedição e histórico da transferência"
    >
      <h2 ref={headerRef} tabIndex={-1}>
        Atos da {materialTransferLabel(facts.declaration.source, facts.declaration.destination).toLocaleLowerCase("pt-BR")}
      </h2>
      <TransferFactsDisplay facts={facts} />
      {facts.originDocumentId ? (
        <RelatedDocument
          id={facts.originDocumentId}
          type="ENT"
          label="Consultar ENT documental de origem"
        />
      ) : (
        <p>{materialTransferDirection(facts.declaration.source, facts.declaration.destination) === "return"
          ? "Sem entrega de origem vinculada. Esta devolução pode ser registrada de forma autônoma."
          : "Sem vínculo documental de origem; esse vínculo é opcional."}</p>
      )}
      <p className="text-sm">
        O vínculo documental preserva a origem conhecida dos materiais.
      </p>
      {message ? <Notice>{message}</Notice> : null}
      <div className="hca-toolbar">
        {(["dispatch", "withdraw"] as const)
          .filter((action) => action === "dispatch" ? facts.canDispatch : facts.canWithdraw)
          .map((action) => (
            <ActionButton
              key={action}
              variant={
                action === "dispatch"
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
            if (result.version >= data.version) onUpdated(result);
            setSelected(null);
            setMessage(
              selected.action === "dispatch"
                ? "Expedição confirmada. Os materiais estão em trânsito até o recebimento pessoal."
                : "Decisão registrada sem movimentar materiais.",
            );
            requestAnimationFrame(() => headerRef.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
