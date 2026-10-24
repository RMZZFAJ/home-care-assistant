"use client";
import { Button } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";

export function WizardActions({ step, total, saving, uncertain, blocked = false, onBack, onDraft, onNext, onFinish, finishLabel = "Confirmar e concluir" }: {
  step: number; total: number; saving: boolean; uncertain: boolean; blocked?: boolean;
  onBack: () => void; onDraft: () => void; onNext: () => void; onFinish: () => void; finishLabel?: string;
}) {
  return <div className="hca-wizard-actions"><Button type="button" disabled={step === 0 || saving || uncertain} onClick={onBack}>Voltar</Button><div><Button type="button" disabled={saving || uncertain} onClick={onDraft}>Salvar rascunho</Button>{step < total - 1 ? <Button type="button" appearance="primary" disabled={saving || uncertain || blocked} icon={<Icon name="arrow" />} iconPosition="after" onClick={onNext}>{step === total - 2 ? "Revisar" : "Avançar"}</Button> : <Button type="button" appearance="primary" disabled={saving || (blocked && !uncertain)} onClick={onFinish}>{saving ? "Registrando…" : uncertain ? "Recuperar esta tentativa" : finishLabel}</Button>}</div></div>;
}
