"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { PdfFormatMark } from "@/components/ui/file-record";
import { Icon } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlays";
import type { PdfIssuance } from "@/lib/documents/pdf-issuance";
import { documentModeLabel, pdfSectionLabels } from "@/lib/documents/pdf-modes";
import { formatBrazilDate } from "@/lib/receipt";

export function PdfFileDetails({ file, documentCode, open, status, previous, onClose, finalFocus }: {
  file: PdfIssuance;
  documentCode: string;
  open: boolean;
  status: string;
  previous: boolean;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const mode = documentModeLabel(file.documentOptions);
  const options = file.documentOptions;
  const verification = "HCA-" + file.verificationCode.match(/.{4}/g)?.join("-");
  const date = (day: string) => day.split("-").reverse().join("/");
  const period = options?.period.from && options.period.through
    ? `${date(options.period.from)} a ${date(options.period.through)}`
    : options ? "Todos os registros até a emissão" : "Conteúdo essencial da ficha";

  async function copyVerification() {
    try {
      await navigator.clipboard.writeText(verification);
      setCopyStatus("Código copiado.");
    } catch {
      setCopyStatus("Não foi possível copiar. Selecione o código exibido.");
    }
  }

  function close() {
    setCopyStatus("");
    onClose();
  }

  return <Drawer open={open} title={mode} subtitle={`${documentCode} · ${status}`} headingIcon="file"
    onClose={close} finalFocus={finalFocus} closeLabel="Fechar identificação do exemplar"
    keyboardScrollable footer={<ActionButton onClick={close}>Voltar aos arquivos</ActionButton>}>
    <div className="hca-form-stack">
      <div className="hca-file-details-lead"><PdfFormatMark /><div><strong>{documentCode} · {mode}</strong>
        <div>{file.sizeBytes ? `${file.sizeBytes.toLocaleString("pt-BR")} bytes` : "Aguardando conclusão"}</div></div></div>
      {previous ? <p>Este exemplar preserva o conteúdo de uma revisão anterior. Atualizações posteriores mantêm o conteúdo desta emissão.</p> : null}
      <dl className="hca-definition-grid">
        <div><dt>Solicitado por</dt><dd>{file.requestedName}</dd></div>
        <div><dt>Solicitação</dt><dd>{formatBrazilDate(file.requestedAt)}</dd></div>
        <div><dt>Emissão</dt><dd>{file.readyAt ? formatBrazilDate(file.readyAt) : "Aguardando conclusão"}</dd></div>
        <div><dt>Origem</dt><dd>{file.representation === "derived" ? "Nova representação de versão histórica" : "Emissão operacional"}</dd></div>
        <div><dt>Conteúdo preservado</dt><dd>Conteúdo da revisão {file.version}</dd></div>
        <div><dt>Período</dt><dd>{period}</dd></div>
        {file.validation?.accepted ? <div><dt>Assinatura e carimbo</dt><dd>{file.validation.profile} · validados</dd></div> : null}
        <div><dt>Identificador</dt><dd className="break-all">{file.id}</dd></div>
      </dl>
      {options ? <section><h3>Complementos incluídos</h3><ul className="hca-form-stack">
        {options.sections.map(section => <li key={section}>{pdfSectionLabels[section]}</li>)}
      </ul></section> : null}
      <details className="doc-help-details"><summary>Código de verificação</summary>
        <p className="break-all">{verification}</p>
        <ActionButton onClick={() => void copyVerification()}><Icon name="copy" />Copiar código</ActionButton>
        {copyStatus ? <p role="status">{copyStatus}</p> : null}
      </details>
    </div>
  </Drawer>;
}
