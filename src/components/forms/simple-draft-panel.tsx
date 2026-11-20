"use client";
import { useEffect, useRef, type ComponentProps } from "react";
import Link from "next/link";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { MaterialReview } from "@/components/documents/material-review";
import { navigationLabel } from "@/lib/forms/draft-navigation";
import { formatBrazilDate } from "@/lib/receipt";
import type { CreationDraft } from "@/types/creation-drafts";
import type { StockObservation } from "@/types/requisition";
import { CreationDraftPanel } from "./creation-draft-panel";

function draftStockText(value: string | number | null, mode?: StockObservation, unit?: string) {
  if (mode === "unknown") return "Não sei informar";
  if (value == null || value === "") return "Não informado";
  const typed = unit ? `${value} ${unit}` : String(value);
  return mode === "observed" ? typed : `${typed} · Conferência pendente`;
}

function DraftMaterials({ draft }: { draft: CreationDraft }) {
  const content = draft.content;
  if (!content) return null;
  const quantity = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : "Quantidade pendente";
  const listed = "lines" in content ? [
    ...content.lines.map(line => ({ id: line.productId, name: line.productName, urgent: line.urgent,
      details: <small>{draftStockText(line.currentStock, line.stockObservation, line.unit)}</small> })),
    ...content.extraItems.map(line => ({ id: line.id, name: line.name, urgent: line.urgent,
      details: <small>{draftStockText(line.currentStock, line.stockObservation, line.identification?.unit)}</small> })),
  ] : "form" in content ? content.materials
    .filter(material => Object.hasOwn(content.form.quantities, material.id))
    .map(material => ({ id: material.id, name: material.name,
      details: <small>{quantity(content.form.quantities[material.id], material.unit)}</small> }))
    : "fields" in content ? content.materials.map(material => ({ id: material.id, name: material.name,
      details: <small>{quantity(content.fields[material.id + ":transferQuantity"], material.unit)}</small> })) : [];
  const extras = "form" in content ? content.form.pendingExtras : "pendingExtras" in content ? content.pendingExtras : [];
  const rows = [...listed, ...(extras ?? []).map(item => ({ id: item.id, name: item.name,
    details: <small>{quantity(item.quantity, item.unit)} · Cadastro pendente</small> }))];
  return <section>
    <h3>Materiais preenchidos · {rows.length}</h3>
    {rows.length ? <MaterialReview rows={rows} /> : <p className="hca-field-help">Nenhum material incluído.</p>}
  </section>;
}

/** One resume choice; exceptional concurrency/recovery retains its real controls. */
export function SimpleDraftPanel({ statusInFooter = false, ...props }: ComponentProps<typeof CreationDraftPanel> & { statusInFooter?: boolean }) {
  const { draft, disabled = false, canResume = true, patientName } = props;
  const { acknowledge, consumed } = draft;
  const wizard = draft.kind !== "PROGRESS";
  const acknowledgedRef = useRef<string | null>(null);
  const completed = wizard && consumed ? `${consumed.id}:${consumed.revision}` : null;
  const canAcknowledge = draft.active && !disabled && !draft.loading && !draft.busy && !draft.backgroundBusy && !draft.pending &&
    !draft.error && !draft.loadError && !draft.conflict && !draft.readDenied && !draft.protectedReadPending;
  useEffect(() => {
    if (!completed || !canAcknowledge || acknowledgedRef.current === completed) return;
    acknowledgedRef.current = completed;
    void acknowledge();
  }, [acknowledge, canAcknowledge, completed]);

  if (!draft.active) return null;
  if (wizard && draft.busy && draft.pending?.action === "save" && !draft.error && !draft.conflict) return null;
  if (wizard && draft.busy && draft.pending?.action === "acknowledge" && !draft.error && !draft.conflict) return null;
  if (draft.readDenied || draft.protectedReadPending || draft.loadError || draft.error || draft.pending || draft.conflict || draft.kind === "PROGRESS" && draft.consumed)
    return <CreationDraftPanel {...props} />;
  if (completed) return null;
  const offered = draft.offered;
  if (offered?.state === "active") {
    const resume = props.resumeHref ? <Link className="hca-control" href={props.resumeHref}>Continuar rascunho</Link>
      : <ActionButton variant="primary" disabled={draft.busy || disabled || !canResume} onClick={() => draft.resume()}>
        {props.resumeLabel ?? "Continuar rascunho"}{wizard ? <Icon name="arrow" /> : null}
      </ActionButton>;
    const discard = <ActionButton disabled={draft.busy || disabled} onClick={() => void draft.discard()}>
      {wizard ? <Icon name="trash" /> : null}{props.discardLabel ?? "Descartar e começar novamente"}
    </ActionButton>;
    if (wizard) return <Dialog open title="Continuar seu rascunho?" kicker="Rascunho da ficha" popupClassName="hca-wizard-dialog"
      subtitle="Você tem um preenchimento salvo para este paciente." closeDisabled onClose={() => {}}
      keyboardScrollable footer={<>{discard}{resume}</>}>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Paciente", value: patientName },
          { label: "Preenchido por", value: "Você" },
          { label: "Última gravação", value: formatBrazilDate(offered.savedAt) },
          { label: "Etapa salva", value: navigationLabel(offered.navigation) },
        ]} />
        <DraftMaterials draft={offered} />
      </div>
    </Dialog>;
    return <Dialog open title="Continuar seu rascunho?" closeDisabled onClose={() => {}}>
      <p>Existe um preenchimento salvo para {patientName}. Você pode continuar o último rascunho ou descartá-lo e começar novamente.</p>
      <div className="hca-toolbar">{resume}{discard}</div>
    </Dialog>;
  }
  if (statusInFooter) return null;
  return draft.backgroundBusy || draft.busy ? <p className="hca-field-help" role="status">Guardando rascunho…</p> : draft.base?.state === "active" ? <p className="hca-field-help" role="status">Último rascunho salvo.</p> : null;
}
