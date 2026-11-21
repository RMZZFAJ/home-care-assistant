"use client";
import { useEffect, useRef, type ComponentProps } from "react";
import Link from "next/link";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { navigationLabel } from "@/lib/forms/draft-navigation";
import { formatBrazilDate } from "@/lib/receipt";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { StockObservation } from "@/types/requisition";
import { CreationDraftPanel } from "./creation-draft-panel";

function draftStockText(value: string | number | null, mode?: StockObservation, unit?: string) {
  if (mode === "unknown") return "Não sei informar";
  if (value == null || value === "") return "Não informado";
  const typed = unit ? `${value} ${unit}` : String(value);
  return mode === "observed" ? typed : `${typed} · Conferência pendente`;
}

function DraftMaterials({ content }: { content: CreationDraftContent | null }) {
  if (!content) return null;
  const quantity = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : "Quantidade pendente";
  let listed: { id: string; name: string; details: string; urgent?: boolean }[] = [];
  if ("lines" in content) {
    listed = [
      ...content.lines.map(line => ({ id: line.productId, name: line.productName, urgent: line.urgent,
        details: draftStockText(line.currentStock, line.stockObservation, line.unit) })),
      ...content.extraItems.map(line => ({ id: line.id, name: line.name, urgent: line.urgent,
        details: draftStockText(line.currentStock, line.stockObservation, line.identification?.unit) })),
    ];
  } else if ("form" in content) {
    listed = content.materials.filter(material => Object.hasOwn(content.form.quantities, material.id))
      .map(material => ({ id: material.id, name: material.name,
        details: quantity(content.form.quantities[material.id], material.unit) }));
  } else if ("counts" in content) {
    const linked = new Set(content.materialReferences?.map(link => link.productId));
    listed = content.materials.filter(material => content.counts[material.id] || linked.has(material.id))
      .map(material => ({ id: material.id, name: material.name,
        details: quantity(content.counts[material.id], material.unit) }));
  } else if ("fields" in content) {
    listed = content.materials.map(material => ({ id: material.id, name: material.name,
      details: quantity(content.fields[material.id + ":transferQuantity"], material.unit) }));
  }
  const extras = "form" in content ? content.form.pendingExtras : "pendingExtras" in content ? content.pendingExtras : [];
  for (const item of extras ?? []) {
    listed.push({ id: item.id, name: item.name, details: `${quantity(item.quantity, item.unit)} · Cadastro pendente` });
  }
  return <section className="hca-draft-materials">
    <h3>Materiais preenchidos · {listed.length}</h3>
    {listed.length ? <ul className="hca-material-review">
      {listed.map(row => <li key={row.id}>
        <span className="hca-wizard-material-icon"><Icon name="box" /></span>
        <div className="hca-material-review-main">
          <strong>{row.name}</strong>
          {row.urgent ? <span className="ui-badge ui-badge-danger">Urgente</span> : null}
        </div>
        <strong className="hca-draft-material-value">{row.details}</strong>
      </li>)}
    </ul> : <p className="hca-field-help">Nenhum material incluído.</p>}
  </section>;
}

/** One resume choice; exceptional concurrency/recovery retains its real controls. */
export function SimpleDraftPanel({ statusInFooter = false, authorName = "Você", legacy, ...props }: ComponentProps<typeof CreationDraftPanel> & {
  statusInFooter?: boolean;
  authorName?: string;
  legacy?: { content: CreationDraftContent; savedAt: string; resume: () => void; discard: () => void };
}) {
  const { draft, disabled = false, canResume = true, patientName } = props;
  const { acknowledge, consumed, recover } = draft;
  const wizard = draft.kind !== "PROGRESS";
  const acknowledgedRef = useRef<string | null>(null);
  const retriedRef = useRef<string | null>(null);
  const completed = wizard && consumed ? `${consumed.id}:${consumed.revision}` : null;
  const pendingAcknowledgement = wizard && draft.pending?.action === "acknowledge" ? draft.pending.idempotencyKey : null;
  const canFinishAcknowledgement = draft.active && !disabled && !draft.loading && !draft.busy && !draft.backgroundBusy &&
    !draft.loadError && !draft.conflict && !draft.readDenied && !draft.protectedReadPending;
  useEffect(() => {
    if (!canFinishAcknowledgement) return;
    if (pendingAcknowledgement && retriedRef.current !== pendingAcknowledgement) {
      retriedRef.current = pendingAcknowledgement;
      void recover();
      return;
    }
    if (!completed || draft.pending || draft.error || acknowledgedRef.current === completed) return;
    acknowledgedRef.current = completed;
    void acknowledge();
  }, [acknowledge, canFinishAcknowledgement, completed, draft.error, draft.pending, pendingAcknowledgement, recover]);

  if (!draft.active) return null;
  if (wizard && draft.busy && draft.pending?.action === "save" && !draft.error && !draft.conflict) return null;
  if ((completed || pendingAcknowledgement) && !draft.readDenied && !draft.loadError && !draft.conflict) {
    if (draft.loading || draft.busy || draft.protectedReadPending || !draft.error) return null;
    return <Notice error>
      Não foi possível preparar um novo preenchimento.
      <ActionButton disabled={disabled} onClick={() => {
        if (pendingAcknowledgement) void recover();
        else {
          acknowledgedRef.current = null;
          draft.reload();
        }
      }}>Tentar novamente</ActionButton>
    </Notice>;
  }
  if (draft.readDenied || draft.protectedReadPending || draft.loadError || draft.error || draft.pending || draft.conflict || draft.kind === "PROGRESS" && draft.consumed)
    return <CreationDraftPanel {...props} />;
  const offered = draft.offered;
  const local = wizard && !draft.loading && !draft.base && !offered ? legacy : undefined;
  const summary = offered?.state === "active" ? offered : local;
  if (summary) {
    const resume = !local && props.resumeHref ? <Link className="hca-control" href={props.resumeHref}>Continuar rascunho</Link>
      : <ActionButton variant="primary" disabled={draft.busy || disabled || !canResume} onClick={() => local ? local.resume() : draft.resume()}>
        {props.resumeLabel ?? "Continuar rascunho"}{wizard ? <Icon name="arrow" /> : null}
      </ActionButton>;
    const discard = <ActionButton disabled={draft.busy || disabled} onClick={() => {
      if (local) local.discard();
      else void draft.discard();
    }}>
      {wizard ? <Icon name="trash" /> : null}{props.discardLabel ?? "Descartar e começar novamente"}
    </ActionButton>;
    if (wizard) return <Dialog open title="Continuar seu rascunho?" kicker="Rascunho da ficha" popupClassName="hca-wizard-dialog hca-draft-dialog"
      subtitle="Você tem um preenchimento salvo para este paciente." closeDisabled onClose={() => {}}
      keyboardScrollable footer={<>{discard}{resume}</>}>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Paciente", value: patientName },
          { label: "Preenchido por", value: authorName },
          { label: "Última gravação", value: formatBrazilDate(summary.savedAt) },
          { label: "Etapa salva", value: local ? "Etapa não registrada" : navigationLabel(offered?.navigation) },
        ]} />
        <DraftMaterials content={summary.content} />
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
