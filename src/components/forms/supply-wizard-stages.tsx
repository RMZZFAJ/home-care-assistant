import { Icon, type IconName } from "@/components/ui/icon";

export const supplyWizardStages = ["Confirmação", "Materiais", "Extras", "Observações", "Revisão"];
// The private navigation IDs for older categories, notes and review keep their positions.
export const supplyExtrasStep = 6;
export const supplyStageSteps = [0, 1, supplyExtrasStep, 4, 5];

export const materialCategories = [
  { id: "medicamentos", label: "Medicamentos", icon: "pill" },
  { id: "higiene", label: "Higiene", icon: "heart" },
  { id: "dieta", label: "Dieta", icon: "box" },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type WizardMaterialCategory = (typeof materialCategories)[number]["id"];

export function WizardMaterialCategories({ category, selected, onChange }: {
  category: WizardMaterialCategory;
  selected: readonly { category: string }[];
  onChange: (category: WizardMaterialCategory) => void;
}) {
  return (
    <nav className="hca-wizard-categories" aria-label="Tipos de material">
      {materialCategories.map(({ id, label, icon }) => {
        const count = selected.filter(line => line.category === id).length;
        return (
          <button key={id} type="button" aria-pressed={category === id} onClick={event => {
            if (category === id) return;
            onChange(id);
            event.currentTarget.scrollIntoView({ block: "start", inline: "nearest" });
          }}>
            <Icon name={icon} width={15} height={15} />
            <span>{label}</span>
            <small aria-label={`${count} selecionado${count === 1 ? "" : "s"}`}>{count}</small>
          </button>
        );
      })}
    </nav>
  );
}
