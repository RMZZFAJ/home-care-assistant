"use client";

import { useRef, useState, type RefObject } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import type { PublicPdfResult } from "@/lib/documents/public-verification";
import { formatBrazilDate } from "@/lib/receipt";
import { verificationPresentation } from "./public-verification-outcome";


const trustLabels = {
  internal: "Cadeia interna reconhecida",
  external: "Cadeia externa reconhecida pela política configurada",
  unknown_chain: "Cadeia desconhecida",
  invalid_chain: "Cadeia inválida",
  revoked: "Certificado revogado na política interna",
  expired: "Certificado expirado na época do carimbo",
};

const policyLabels = {
  recognized_internal: "Reconhecida na política interna",
  recognized_external: "Reconhecida na política configurada",
  revoked: "Certificado revogado",
  unknown: "Confiança não reconhecida",
  unavailable: "Política temporariamente indisponível",
};

export function VerificationResult({ result, headingRef, code, file, onEdit, onFile, onRetry }: {
  result: PublicPdfResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  code: string;
  file: File | null;
  onEdit: () => void;
  onFile: () => void;
  onRetry: () => void;
}) {
  const { reference, analysis, policyStatus, referenceOnly: byCode } = result;
  const verified = analysis?.verification;
  const { title, message, note, tone, icon, evidence, fileReference } = verificationPresentation(result);
  const alternateReference = fileReference && (!reference.found || fileReference.verificationCode !== reference.verificationCode)
    ? fileReference : null;
  const canRetry = !byCode && Boolean(file) && (policyStatus === "unavailable" || analysis?.status === "processing_limit");
  const [details, setDetails] = useState(false);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const sourceCode = (reference.found ? reference.verificationCode : code).trim();
  const source = byCode ? "Código consultado" : file?.name ?? "Arquivo PDF";
  const sourceHint = byCode
    ? (reference.found ? "HCA-" + sourceCode.match(/.{1,4}/g)?.join("-") : sourceCode)
    : file ? Math.ceil(file.size / 1024) + " KB" : "";

  return <section aria-label="Resultado da verificação">
    <div className="hca-verify-source">
      <Icon name={byCode ? "file" : "upload"} />
      <div><strong>{source}</strong><small>{sourceHint}</small></div>
      <ActionButton variant="quiet" compact onClick={onEdit}>Alterar</ActionButton>
    </div>
    <article className="hca-verify-verdict" data-tone={tone}>
      <header>
        <span className="hca-verify-verdict-icon"><Icon name={icon} width={28} height={28} /></span>
        <span className="hca-verify-verdict-label">{byCode ? "Consulta do registro" : "Conferência do PDF"}</span>
        <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
        <p>{message}</p>
      </header>
      <ul className="hca-verify-evidence-list" data-explained={byCode}>
        {evidence.map(({ label, value, help, tone: evidenceTone }) => <li className="hca-verify-evidence" data-tone={evidenceTone} key={label}>
          <Icon name={evidenceTone === "success" ? "check" : evidenceTone === "neutral" ? "clock" : "alert"} width={17} height={17} />
          <div><span className="hca-verify-evidence-label">{label}</span><strong className="hca-verify-evidence-value">{value}</strong>
            {help ? <p className="hca-verify-evidence-help">{help}</p> : null}
          </div>
        </li>)}
      </ul>
      <div className="hca-verify-result-actions">
        <p>{note}</p>
        {canRetry ? <ActionButton variant="primary" onClick={onRetry}><Icon name="refresh" /> Tentar análise novamente</ActionButton> : null}
        <ActionButton variant={canRetry ? "secondary" : "primary"} onClick={byCode && !reference.found ? onEdit : onFile}>
          <Icon name={byCode ? reference.found ? "shield" : "edit" : "upload"} />
          {byCode ? reference.found ? "Verificar o PDF recebido" : "Revisar código" : "Verificar outro PDF"}
        </ActionButton>
        <ActionButton ref={detailsButtonRef} variant="quiet" compact onClick={() => setDetails(true)}>
          <Icon name="info" /> Ver detalhes da conferência
        </ActionButton>
      </div>
    </article>
    <Drawer open={details} onClose={() => setDetails(false)} title="Detalhes da conferência"
      subtitle={byCode ? "Consulta do registro por código" : "Conferência do arquivo recebido"}
      headingIcon="shield" finalFocus={detailsButtonRef} keyboardScrollable
      footer={<ActionButton onClick={() => setDetails(false)}>Fechar</ActionButton>}>
      <div className="hca-form-stack">
        <div className="hca-verify-sheet-status" data-tone={tone}><Icon name={icon} width={21} height={21} /><strong>{title}</strong></div>
        <DefinitionGrid items={[
          { label: source, value: byCode ? sourceHint : source },
          { label: "Registro da emissão", value: reference.found ? formatBrazilDate(reference.registeredAt) : "Não localizado" },
          ...(alternateReference ? [
            { label: "Registro do arquivo enviado", value: formatBrazilDate(alternateReference.registeredAt) },
            { label: "Código do arquivo enviado", value: "HCA-" + alternateReference.verificationCode.match(/.{4}/g)?.join("-") },
          ] : []),
          ...(byCode && policyStatus ? [{ label: "Política para os certificados registrados", value: policyLabels[policyStatus], wide: true }] : []),
          ...(result.fileSha256 ? [{ label: "SHA-256 do arquivo enviado", value: result.fileSha256, wide: true }] : []),
        ]} />
        {verified ? <DefinitionGrid items={[
          { label: "Cobertura dos bytes", value: verified.wholeFile ? "A assinatura cobre o arquivo inteiro." : "Há bytes acrescentados após a assinatura.", wide: true },
          { label: "Confiança do assinador", value: trustLabels[verified.signerTrust] },
          { label: "Carimbo de tempo", value: "Token RFC3161 criptograficamente íntegro · " + formatBrazilDate(verified.timestampAt) },
          { label: "Confiança da TSA", value: trustLabels[verified.timestampTrust] },
          { label: "Certificado que assinou · SHA-256", value: verified.certificateFingerprint, wide: true },
          { label: "Certificado da TSA · SHA-256", value: verified.timestampCertificateFingerprint, wide: true },
        ]} /> : null}
        <p>A assinatura técnica do sistema e o carimbo interno não representam assinatura pessoal, ICP-Brasil ou tempo independente de terceiro. A consulta não verifica revogação externa por OCSP ou CRL.</p>
      </div>
    </Drawer>
  </section>;
}
