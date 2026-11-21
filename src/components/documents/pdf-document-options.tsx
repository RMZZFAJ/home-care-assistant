"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { ActionButton, CheckboxField, FormField, SelectField, TextInput, TextAreaField } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { pdfDocumentOptionsSchema, pdfSectionLabels, pdfSectionOrder, type PdfDocumentOptions } from "@/lib/documents/pdf-modes";

export function PdfDocumentOptions({ open, onClose, onGenerate, canAudit, canAccess }: {
  open: boolean; onClose: () => void; onGenerate: (value?: PdfDocumentOptions) => void; canAudit: boolean; canAccess: boolean;
}) {
  const [mode, setMode] = useState<"record" | "expanded" | "audit">("expanded");
  const [sections, setSections] = useState<PdfDocumentOptions["sections"]>(["progress"]);
  const [interval, setInterval] = useState(false), [from, setFrom] = useState(""), [through, setThrough] = useState("");
  const [purpose, setPurpose] = useState(""), [error, setError] = useState("");
  const denied = mode === "audit" && !canAudit || mode !== "record" && sections.includes("access") && !canAccess;
  return <Dialog open={open} onClose={onClose} title="Escolher conteúdo do PDF">
    <form className="hca-form" onSubmit={event => {
      event.preventDefault();
      if (denied) return;
      if (mode === "record") { onGenerate(); return; }
      const parsed = pdfDocumentOptionsSchema.safeParse({
        mode, sections, period: { from: interval ? from : null, through: interval ? through : null, timeZone: "America/Sao_Paulo" },
        purpose: mode === "audit" ? purpose.trim() : null,
      });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira as seções e o período."); return; }
      setError(""); onGenerate(parsed.data);
    }}>
      <FormField label="Modalidade documental"><SelectField value={mode} onChange={event => setMode(event.currentTarget.value as typeof mode)}>
        <option value="record">Ficha</option><option value="expanded">Ficha Ampliada</option><option value="audit" disabled={!canAudit}>Relatório de auditoria da ficha</option>
      </SelectField></FormField>
      <p className="hca-field-help">Todas as modalidades preservam integralmente os materiais, as observações e as exceções essenciais da Ficha. Nenhum filtro retira esse conteúdo.</p>
      {!canAudit ? <p className="hca-field-help">O relatório de auditoria exige competência própria de auditoria deste paciente.</p> : null}
      {mode !== "record" ? <>
        <fieldset className="hca-form-stack"><legend>Complementos autorizados</legend>
          {pdfSectionOrder.map(key => <CheckboxField key={key} label={pdfSectionLabels[key]} checked={sections.includes(key)} disabled={key === "access" && !canAccess} onChange={event => {
            const checked = event.currentTarget.checked;
            setSections(current => checked ? [...current, key] : current.filter(value => value !== key));
          }} />)}
        </fieldset>
        {!canAccess ? <p className="hca-field-help">O histórico de acesso exige uma competência própria; as demais seções autorizadas continuam disponíveis.</p> : null}
        <FormField label="Período dos complementos"><SelectField value={interval ? "interval" : "all"} onChange={event => setInterval(event.currentTarget.value === "interval")}>
          <option value="all">Todos os registros até a referência da emissão</option><option value="interval">Escolher intervalo de dias</option>
        </SelectField></FormField>
        {interval ? <div className="hca-compact-grid">
          <FormField label="Dia inicial" required><TextInput type="date" required value={from} onChange={event => setFrom(event.currentTarget.value)} /></FormField>
          <FormField label="Dia final" required><TextInput type="date" required value={through} onChange={event => setThrough(event.currentTarget.value)} /></FormField>
        </div> : null}
        <p className="hca-field-help">Dias completos e inclusivos, no fuso America/Sao_Paulo. O período filtra registros dos complementos; vínculos preservam a versão da ficha. A referência será fixada na reserva e mantida na recuperação do mesmo exemplar.</p>
        {mode === "audit" ? <>
          <FormField label="Finalidade da auditoria" required helpText="Descreva o uso deste relatório, em até 500 caracteres."><TextAreaField required minLength={3} maxLength={500} value={purpose} onChange={event => setPurpose(event.currentTarget.value)} /></FormField>
          <p className="hca-field-help">Relatório preliminar com marca nominativa em todas as páginas. Não é laudo pericial nem comprova a veracidade física dos relatos.</p>
        </> : null}
      </> : null}
      {denied ? <Notice error>Seu acesso atual não permite a seleção indicada. Escolha uma modalidade e seções autorizadas.</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      <div className="hca-toolbar"><ActionButton onClick={onClose}>Voltar</ActionButton><ActionButton type="submit" variant="primary" disabled={denied}>Emitir exemplar selecionado</ActionButton></div>
    </form>
  </Dialog>;
}
