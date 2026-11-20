"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { supplyWizardCopy, type SupplyWizardKind } from "./supply-wizard-stages";

export function SupplyWizardHeading({ kind, patient }: { kind: SupplyWizardKind; patient: string }) {
  const [help, setHelp] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const { title, description } = supplyWizardCopy[kind];
  const confirmation = kind === "ENT" || kind === "DEV" ? "Expedição" : "Emissão";
  return <header className="hca-supply-wizard-heading">
    <nav className="hca-document-breadcrumb" aria-label="Localização da ficha">
      <Link href="/fichas">Fichas</Link><Icon name="chevron" /><span aria-current="page">{title}</span>
    </nav>
    <div className="page-heading">
      <div>
        <div className="eyebrow"><Icon name="home" width={12} height={12} />{patient}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <ActionButton ref={helpButtonRef} variant="quiet" compact className="btn-icon" onClick={() => setHelp(true)} aria-label="Ajuda sobre esta ficha">
        <Icon name="help" width={16} height={16} />
      </ActionButton>
    </div>
    <Dialog open={help} title="Uma ficha, com seu contexto" kicker="Preenchimento" finalFocus={helpButtonRef} onClose={() => setHelp(false)}>
      <DefinitionGrid items={[
        { label: "Paciente e autor", value: "Identificados pelo sistema" },
        { label: "Rascunho", value: "Salvo automaticamente durante o preenchimento" },
        { label: "Materiais", value: "Organizados na mesma lista de cada tipo" },
        { label: confirmation, value: "Confira as informações na revisão final" },
      ]} />
      <div className="hca-toolbar"><ActionButton variant="primary" onClick={() => setHelp(false)}>Entendi</ActionButton></div>
    </Dialog>
  </header>;
}
