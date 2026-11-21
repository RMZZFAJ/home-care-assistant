import { DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/role-labels";
import type { WorkspaceContext } from "@/types/workspace";
import { supplyWizardCopy, type SupplyWizardKind } from "./supply-wizard-stages";

export function SupplyWizardIdentity({ context, kind }: { context: WorkspaceContext; kind: SupplyWizardKind }) {
  const patient = context.patient;
  if (!patient) return null;
  const initials = patient.display_name.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join("");
  return <div className="hca-wizard-identity">
    <p className="hca-wizard-intro">O paciente e a pessoa que preenche já estão identificados.</p>
    <div className="hca-wizard-person">
      <span className="hca-wizard-person-avatar" aria-hidden="true">{initials}</span>
      <div><strong>{patient.display_name}</strong><small>Paciente selecionado</small></div>
      <span className="hca-wizard-person-lock"><Icon name="lock" width={12} height={12} />Preenchido pelo sistema</span>
    </div>
    <DefinitionGrid items={[
      { label: "Preenchido por", value: context.fullName },
      { label: "Vínculo", value: roleLabel(patient.role) },
      { label: "Ficha", value: supplyWizardCopy[kind].label },
    ]} />
  </div>;
}

export function SupplyWizardReviewIdentity({ context, kind, destination, additional = [] }: {
  context: WorkspaceContext;
  kind: SupplyWizardKind;
  destination?: string;
  additional?: readonly { label: string; value: string }[];
}) {
  const copy = supplyWizardCopy[kind];
  return <DefinitionGrid className="hca-wizard-review-identity" items={[
    { label: "Paciente", value: context.patient?.display_name },
    { label: "Preenchido por", value: context.fullName },
    { label: "Tipo de ficha", value: copy.label },
    { label: "Destino", value: destination ?? copy.destination },
    ...additional,
  ]} />;
}
