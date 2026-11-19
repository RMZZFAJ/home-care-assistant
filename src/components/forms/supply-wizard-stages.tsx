import { Icon, type IconName } from "@/components/ui/icon";

export const supplyWizardStages = ["Confirmação", "Materiais", "Extras", "Observações", "Revisão"];

export const materialCategories = [
  { id: "medicamentos", label: "Medicamentos", icon: "pill" },
  { id: "higiene", label: "Higiene", icon: "heart" },
  { id: "dieta", label: "Dieta", icon: "box" },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

type Category = (typeof materialCategories)[number]["id"];

export function WizardMaterialCategories({ category, selected, onChange }: {
  category: Category;
  selected: readonly { category: Category }[];
  onChange: (category: Category) => void;
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
