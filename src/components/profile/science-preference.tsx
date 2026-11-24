"use client";

import { useId, useState } from "react";
import { z } from "zod";
import { ActionButton, CheckboxField } from "@/components/ui/controls";
import { Dialog, Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { scienceConsent, scienceConsentCopyVersion, scienceModeLabels, type ScienceMode } from "@/lib/requisition-science";
import { PreferenceSettings, type PreferenceEditorProps } from "./preference-settings";
import "./preference-settings.css";

const result = z.object({ data: z.object({
  mode: z.enum(["manual", "dialog", "tacit"]), version: z.number().int().nonnegative(),
  consentCopyVersion: z.literal(scienceConsentCopyVersion),
  attemptId: z.uuid().nullish(), savedVersion: z.number().int().nonnegative().nullish(),
}) });
const decode = (raw: unknown) => result.parse(raw).data;

const choices: { mode: ScienceMode; label: string; help: string }[] = [
  { mode: "manual", label: "Confirmação manual", help: "Você registra sua ciência expressamente na requisição." },
  { mode: "dialog", label: "Diálogo antes de abrir", help: "Uma confirmação aparece antes de abrir a requisição elegível." },
  { mode: "tacit", label: "Ciência na emissão", help: "A ciência poderá ser registrada quando uma requisição elegível for emitida." },
];

export function SciencePreferenceSettings({ active, patientSelected }: { active: boolean; patientSelected: boolean }) {
  return <PreferenceSettings active={active} title="Ciência de requisições" url="/api/profile/science"
    unavailable={patientSelected ? undefined : "Selecione um vínculo com paciente para configurar sua ciência."}
    summary={value => scienceModeLabels[value.mode]}
    editLabel="Editar preferência de ciência" successTitle="Preferência salva"
    successText="A escolha vale para próximas requisições elegíveis. As ciências anteriores permanecem no histórico."
    decode={decode} Editor={ScienceEditor} details={undefined} />;
}

function ScienceEditor({ value, discard, save }: PreferenceEditorProps<{ mode: ScienceMode }>) {
  const groupId = useId();
  const [mode, setMode] = useState(value.mode);
  const [review, setReview] = useState(false);
  const [consent, setConsent] = useState(false);
  if (review && mode !== "manual") return <Dialog open title="Confirmar minha preferência" kicker="Ciência de requisições"
    headingIcon="checklist" onClose={() => { setConsent(false); setReview(false); }}
    footer={<>
      <ActionButton onClick={() => { setConsent(false); setReview(false); }}>Voltar</ActionButton>
      <ActionButton variant="primary" disabled={!consent} onClick={() => save({ mode, consent })}>
        <Icon name="check" />Confirmar preferência
      </ActionButton>
    </>}>
    <div className="hca-preference-body">
      <strong>{scienceModeLabels[mode]}</strong>
      <p>{scienceConsent[mode]}</p>
      <CheckboxField checked={consent} onChange={event => setConsent(event.currentTarget.checked)}
        label="Compreendi e concordo com esta forma de registrar minha ciência." />
      <p className="hca-preference-hint">Você poderá alterar a preferência para as próximas requisições. O histórico anterior será preservado.</p>
    </div>
  </Dialog>;
  return <Drawer open title="Ciência de requisições" kicker="Preferência pessoal" headingIcon="checklist" popupClassName="hca-preference-sheet" onClose={discard}
    footer={<>
      <ActionButton onClick={discard}>Voltar</ActionButton>
      <ActionButton variant="primary" onClick={() => {
        if (mode === "manual") save({ mode, consent: false });
        else setReview(true);
      }}><Icon name="check" />{mode === "manual" ? "Salvar preferência" : "Revisar consentimento"}</ActionButton>
    </>}>
    <div className="hca-preference-body">
      <fieldset className="hca-preference-choices"><legend>Escolha como registrar sua ciência nas próximas requisições.</legend>
        {choices.map(choice => <label key={choice.mode} className="hca-preference-option">
          <input type="radio" name={groupId} value={choice.mode} checked={mode === choice.mode} onChange={() => setMode(choice.mode)} />
          <span><strong>{choice.label}</strong><small>{choice.help}</small></span>
        </label>)}
      </fieldset>
      <p className="hca-preference-hint"><Icon name="clock" width={17} height={17} />Vale para novas requisições, quando o paciente permitir. O histórico de ciências anteriores permanece.</p>
      <details className="hca-preference-details"><summary>O que esta ciência registra?</summary>
        <p>Registra ciência da requisição. A leitura integral, o recebimento e o consumo têm registros próprios. A confirmação manual permanece disponível.</p>
      </details>
    </div>
  </Drawer>;
}
