"use client";

import { useState } from "react";
import { ActionButton, ActionLink, Pill, type PillTone } from "@/components/ui/controls";
import { PdfFormatMark } from "@/components/ui/file-record";
import { Icon } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlays";
import type { PdfIssuance } from "@/lib/documents/pdf-issuance";
import { pdfSectionLabels } from "@/lib/documents/pdf-modes";
import { formatBrazilDate } from "@/lib/receipt";

export function PdfFileDetails({ file, documentCode, open, title, origin, status, tone, previous, href, onShare, onClose, finalFocus }: {
  file: PdfIssuance;
  documentCode: string;
  open: boolean;
  title: string;
  origin: string;
  status: string;
  tone: PillTone;
  previous: boolean;
  href: string;
  onShare: () => Promise<string | undefined>;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareError, setShareError] = useState("");
  const ready = file.state === "ready";
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
    setShareMessage("");
    setShareError("");
    onClose();
  }

  async function share() {
    if (sharing) return;
    setSharing(true);
    setShareMessage("");
    setShareError("");
    try {
      setShareMessage(await onShare() ?? "");
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError"))
        setShareError(reason instanceof Error ? reason.message : "Não foi possível compartilhar este exemplar.");
    } finally {
      setSharing(false);
    }
  }

  return <Drawer open={open} title={title} subtitle={`${documentCode} · Exemplar preservado`} headingIcon="file"
    onClose={close} finalFocus={finalFocus} closeLabel="Fechar identificação do exemplar"
    keyboardScrollable popupClassName="hca-pdf-exemplar" footer={<>
      <ActionButton onClick={close}>Voltar aos arquivos</ActionButton>
      {ready ? <ActionLink href={href} variant="primary" target="_blank" rel="noopener"><Icon name="eye" />Visualizar</ActionLink> : null}
    </>}>
    <div className="hca-form-stack">
      <div className="hca-file-details-lead"><PdfFormatMark /><div><strong>{documentCode} · {title}</strong>
        <div>{file.sizeBytes ? `${file.sizeBytes.toLocaleString("pt-BR")} bytes` : "Aguardando conclusão"}</div></div></div>
      <div><Pill tone={tone}>{status}</Pill></div>
      {previous ? <p className="hca-exemplar-version-note">Este exemplar preserva o conteúdo de uma revisão anterior. Atualizações posteriores mantêm o conteúdo desta emissão.</p> : null}
      <dl className="hca-definition-grid">
        <div><dt>Solicitado por</dt><dd>{file.requestedName}</dd></div>
        <div><dt>Solicitação</dt><dd>{formatBrazilDate(file.requestedAt)}</dd></div>
        <div><dt>Emissão</dt><dd>{file.readyAt ? formatBrazilDate(file.readyAt) : "Aguardando conclusão"}</dd></div>
        <div><dt>Origem</dt><dd>{origin}</dd></div>
        <div><dt>Conteúdo preservado</dt><dd>Conteúdo da revisão {file.version}</dd></div>
        <div><dt>Período</dt><dd>{period}</dd></div>
        {file.validation?.accepted ? <div><dt>Assinatura e carimbo</dt><dd>{file.validation.profile} · validados</dd></div> : null}
        <div><dt>Identificador</dt><dd className="break-all">{file.id}</dd></div>
      </dl>
      {options?.sections.length ? <section><h3>Complementos incluídos</h3><ul className="hca-exemplar-complements">
        {options.sections.map(section => <li key={section}><Icon name="check" width={15} height={15} />{pdfSectionLabels[section]}</li>)}
      </ul></section> : null}
      <details className="doc-help-details"><summary>Código de verificação</summary>
        <p className="break-all">{verification}</p>
        <ActionButton onClick={() => void copyVerification()}><Icon name="copy" />Copiar código</ActionButton>
        {copyStatus ? <p role="status">{copyStatus}</p> : null}
      </details>
      {ready ? <section aria-label="Compartilhamento do exemplar">
        <ActionButton aria-label="Compartilhar PDF" disabled={sharing} onClick={() => void share()}><Icon name="upload" />{sharing ? "Preparando PDF…" : "Compartilhar"}</ActionButton>
        {shareMessage ? <p role="status">{shareMessage}</p> : null}
        {shareError ? <p role="alert" className="hca-field-error">{shareError}</p> : null}
      </section> : null}
    </div>
  </Drawer>;
}
