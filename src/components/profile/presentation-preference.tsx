"use client";

import { useId, useState } from "react";
import { SettingsSection } from "@/components/forms/settings-section";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { usePresentationMode } from "@/lib/ui/presentation-mode";
import "./preference-settings.css";

const choices = [
  { mode: "simple", title: "Simples", help: "Áreas complementares começam recolhidas e continuam disponíveis para abrir." },
  { mode: "complete", title: "Completa", help: "Áreas complementares começam abertas no início." },
] as const;
type Mode = typeof choices[number]["mode"];

export function PresentationPreference({ active }: { active: boolean }) {
  const { data } = useWorkspaceState();
  return data ? <Preference key={data.userId} userId={data.userId} active={active} /> : null;
}

function Preference({ userId, active }: { userId: string; active: boolean }) {
  const { mode, setMode } = usePresentationMode(userId);
  const groupId = useId();
  const [draft, setDraft] = useState<{ baseline: Mode; selected: Mode } | null>(null);
  const [outcome, setOutcome] = useState<"saved" | "failed" | "conflict" | null>(null);
  if (!active && draft) setDraft(null);
  if (active && draft && draft.baseline !== mode) {
    setDraft(null);
    setOutcome("conflict");
  }
  function apply() {
    if (!draft) return;
    setDraft(null);
    setOutcome(setMode(draft.selected) ? "saved" : "failed");
  }
  return <SettingsSection title="Apresentação do início" summary={(mode === "simple" ? "Simples" : "Completa") + " neste aparelho"}>
    <ActionButton onClick={() => { setOutcome(null); setDraft({ baseline: mode, selected: mode }); }}>
      Editar apresentação<Icon name="chevron" width={16} height={16} />
    </ActionButton>
    {active && draft ? <Dialog open title="Apresentação do início" kicker="Minha conta" headingIcon="home" onClose={() => setDraft(null)}
      footer={<><ActionButton onClick={() => setDraft(null)}>Voltar</ActionButton><ActionButton variant="primary" onClick={apply}>
        <Icon name="check" />Aplicar apresentação
      </ActionButton></>}>
      <fieldset className="hca-preference-choices"><legend>Como você quer ver o início neste aparelho?</legend>
        {choices.map(choice => <label key={choice.mode} className="hca-preference-option">
          <input type="radio" name={groupId} value={choice.mode} checked={draft.selected === choice.mode}
            onChange={() => setDraft({ baseline: draft.baseline, selected: choice.mode })} />
          <span><strong>{choice.title}</strong><small>{choice.help}</small></span>
        </label>)}
      </fieldset>
    </Dialog> : null}
    {active && outcome ? <Dialog open success={outcome === "saved"} failure={outcome === "saved" ? undefined : "rejected"}
      title={outcome === "saved" ? "Apresentação aplicada" : outcome === "conflict" ? "Apresentação alterada em outra aba" : "Não foi possível aplicar a apresentação"}
      subtitle={outcome === "saved" ? "A escolha foi salva neste aparelho." : outcome === "conflict"
        ? "A edição foi descartada. Confira a preferência atual antes de escolher novamente."
        : "O navegador não aceitou o salvamento da preferência."}
      onClose={() => setOutcome(null)} footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </SettingsSection>;
}
