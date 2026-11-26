"use client";

import { useId, useState } from "react";
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
  return <section aria-label="Apresentação do início">
    <ActionButton className="hca-account-setting" onClick={() => { setOutcome(null); setDraft({ baseline: mode, selected: mode }); }}>
      <Icon name="home" /><span><strong>Apresentação do início</strong><small>{mode === "simple" ? "Simples" : "Completa"} neste aparelho</small></span><Icon name="chevron" width={16} height={16} />
    </ActionButton>
    {active && draft ? <Dialog open title="Apresentação do início" kicker="Minha conta" headingIcon="home" onClose={() => setDraft(null)}
      footer={<><ActionButton onClick={() => setDraft(null)}>Voltar</ActionButton><ActionButton variant="primary" onClick={apply}>
        <Icon name="check" />Aplicar apresentação
      </ActionButton></>}>
      <fieldset className="hca-preference-choices"><legend>Como você quer ver o início neste aparelho?</legend>
        {choices.map(choice => {
          const optionId = groupId + "-" + choice.mode;
          const labelId = optionId + "-label";
          const helpId = optionId + "-help";
          return <label key={choice.mode} className="hca-preference-option" htmlFor={optionId}>
            <input id={optionId} type="radio" name={groupId} value={choice.mode} checked={draft.selected === choice.mode}
              aria-labelledby={labelId} aria-describedby={helpId}
              onChange={() => setDraft({ baseline: draft.baseline, selected: choice.mode })} />
            <span><strong id={labelId}>{choice.title}</strong><small id={helpId}>{choice.help}</small></span>
          </label>;
        })}
      </fieldset>
    </Dialog> : null}
    {active && outcome ? <Dialog open success={outcome === "saved"} failure={outcome === "saved" ? undefined : "rejected"}
      title={outcome === "saved" ? "Apresentação aplicada" : outcome === "conflict" ? "Apresentação alterada em outra aba" : "Não foi possível aplicar a apresentação"}
      subtitle={outcome === "saved" ? "A escolha foi salva neste aparelho." : outcome === "conflict"
        ? "A edição foi descartada. Confira a preferência atual antes de escolher novamente."
        : "O navegador não aceitou o salvamento da preferência."}
      onClose={() => setOutcome(null)} footer={<ActionButton variant="primary" onClick={() => setOutcome(null)}>Concluir</ActionButton>}>{null}</Dialog> : null}
  </section>;
}
