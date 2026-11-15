"use client";
import type { ComponentProps } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { CreationDraftPanel } from "./creation-draft-panel";

/** One resume choice; exceptional concurrency/recovery retains its real controls. */
export function SimpleDraftPanel(props: ComponentProps<typeof CreationDraftPanel>) {
  const { draft, disabled = false, canResume = true, patientName } = props;
  if (!draft.active) return null;
  if (draft.readDenied || draft.protectedReadPending || draft.loadError || draft.error || draft.pending || draft.conflict || draft.kind === "PROGRESS" && draft.consumed)
    return <CreationDraftPanel {...props} />;
  if (draft.consumed) return <Dialog open title="Resultado anterior confirmado" closeDisabled onClose={() => {}}>
    <p>O preenchimento anterior já foi concluído. Nenhuma nova confirmação foi enviada.</p>
    <div className="hca-toolbar">{draft.consumed.consumedDocumentId ? <Link className="hca-control" href={"/fichas/" + draft.consumed.consumedDocumentId}>Ver ficha</Link> : null}<ActionButton disabled={draft.busy || disabled} onClick={() => void draft.acknowledge()}>Começar novo preenchimento</ActionButton></div>
  </Dialog>;
  if (draft.offered?.state === "active") return <Dialog open title="Continuar seu rascunho?" closeDisabled onClose={() => {}}>
    <p>Existe um preenchimento salvo para {patientName}. Você pode continuar o último rascunho ou descartá-lo e começar novamente.</p>
    <div className="hca-toolbar">{props.resumeHref ? <Link className="hca-control" href={props.resumeHref}>Continuar rascunho</Link> : <ActionButton variant="primary" disabled={draft.busy || disabled || !canResume} onClick={() => draft.resume()}>{props.resumeLabel ?? "Continuar rascunho"}</ActionButton>}<ActionButton disabled={draft.busy || disabled} onClick={() => void draft.discard()}>{props.discardLabel ?? "Descartar e começar novamente"}</ActionButton></div>
  </Dialog>;
  return draft.backgroundBusy || draft.busy ? <p className="hca-field-help" role="status">Guardando rascunho…</p> : draft.base?.state === "active" ? <p className="hca-field-help" role="status">Último rascunho salvo.</p> : null;
}
