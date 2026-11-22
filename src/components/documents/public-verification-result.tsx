"use client";

import { useRef, useState, type RefObject } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/overlays";
import type { PublicPdfResult } from "@/lib/documents/public-verification";
import { formatBrazilDate } from "@/lib/receipt";


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

const analysisOutcomes = {
  unsigned: ["Assinatura não encontrada", "Sem assinatura incorporada neste PDF."],
  invalid_signature: ["Assinatura não confirmada", "A assinatura do arquivo não pôde ser validada."],
  invalid_timestamp: ["Carimbo não confirmado", "O carimbo de tempo está ausente ou não pôde ser confirmado."],
  unreadable: ["Não foi possível ler este PDF", "Baixe o arquivo original e tente novamente. Uma falha de leitura não comprova adulteração."],
  unsupported: ["Perfil de PDF não suportado", "Solicite ao remetente um exemplar compatível."],
  processing_limit: ["A análise não foi concluída", "A conferência atingiu um limite de processamento. Não há conclusão sobre alteração do arquivo."],
};

export function VerificationResult({ result, headingRef, code, file, onEdit, onFile }: {
  result: PublicPdfResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  code: string;
  file: File | null;
  onEdit: () => void;
  onFile: () => void;
}) {
  const reference = result.reference;
  const analysis = result.analysis;
  const verified = analysis?.verification;
  const byCode = result.referenceOnly;
  const match = reference.found && reference.bytesMatch === true;
  const fileReference = result.fileReference?.found ? result.fileReference : null;
  const another = reference.found && fileReference && fileReference.verificationCode !== reference.verificationCode;
  const byFile = !reference.found && fileReference?.bytesMatch === true;
  const [details, setDetails] = useState(false);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const analysisOutcome = analysis && analysis.status !== "verified" ? analysisOutcomes[analysis.status] : null;
  const revoked = result.policyStatus === "revoked" || verified?.signerTrust === "revoked" || verified?.timestampTrust === "revoked";
  const recognized = verified?.accepted === true;
  const unknownTrust = verified && (["unknown_chain", "invalid_chain"].includes(verified.signerTrust)
    || ["unknown_chain", "invalid_chain"].includes(verified.timestampTrust));
  const title = byCode
    ? (reference.found ? "Emissão localizada" : "Emissão não localizada")
    : another ? "Este PDF é de outra emissão"
      : revoked ? "Certificado revogado"
        : result.policyStatus === "unavailable" ? "Confiança ainda não conferida"
          : unknownTrust ? "Confiança não reconhecida"
            : analysisOutcome?.[0] ?? (byFile ? "Emissão identificada pelo arquivo" : match ? "Arquivo correspondente" : "O arquivo não corresponde");
  const message = byCode
    ? reference.found
      ? "Este código corresponde a uma emissão do Home Care Assistant. Envie o arquivo para verificar seus bytes."
      : "Nenhuma emissão foi localizada para o código informado."
    : another ? "O PDF corresponde a outra emissão registrada. Confirme com o remetente qual deveria ser utilizada."
      : revoked ? "Um certificado desta emissão consta como revogado na política vigente."
        : result.policyStatus === "unavailable" ? "A conferência do registro e do conteúdo está abaixo. A análise técnica aguarda a política de confiança."
          : unknownTrust ? "A análise conferiu os elementos técnicos, mas a cadeia de confiança não foi reconhecida."
            : analysisOutcome?.[1] ?? (byFile
              ? "O arquivo corresponde a uma emissão registrada. Confira o código recebido com o remetente."
              : match
              ? "Os bytes coincidem com o exemplar registrado."
              : reference.found ? "Os bytes divergem da emissão consultada." : "Nenhum exemplar registrado corresponde aos bytes apresentados.");
  const tone = revoked ? "danger" : byCode && reference.found ? "info" : match && recognized ? "success" : "warning";
  const symbol = tone === "success" ? "check-circle" : tone === "info" ? "file" : "alert";
  const evidence = [
    { label: "Registro da emissão", value: reference.found ? "Localizado" : byFile ? "Código informado sem registro" : "Não localizado", tone: reference.found ? "success" : "warning" },
    { label: "Conteúdo do arquivo", value: byCode ? "Ainda não conferido" : another ? "Exemplar de outra emissão" : byFile || match ? "Correspondência exata" : "Sem correspondência", tone: byCode ? "neutral" : byFile || match ? "success" : "warning" },
    { label: "Assinatura técnica", value: analysis?.documentSignature === "valid" ? "Integridade conferida" : analysis?.documentSignature === "invalid" ? "Não confirmada" : analysis?.documentSignature === "absent" ? "Não encontrada" : "Não avaliada", tone: analysis?.documentSignature === "valid" ? "success" : analysis?.documentSignature === "invalid" ? "danger" : "neutral" },
    { label: "Carimbo de tempo", value: analysis?.timestamp === "valid" ? "Integridade conferida" : analysis?.timestamp === "invalid" ? "Não confirmado" : "Não avaliado", tone: analysis?.timestamp === "valid" ? "success" : analysis?.timestamp === "invalid" ? "warning" : "neutral" },
  ];
  if (result.policyStatus || verified) {
    evidence.push({
      label: "Política de confiança",
      value: revoked ? policyLabels.revoked : result.policyStatus === "unavailable" ? policyLabels.unavailable
        : verified ? (recognized ? "Aceita sob a política configurada" : "Não aceita sob a política configurada")
          : policyLabels[result.policyStatus!],
      tone: revoked ? "danger" : recognized ? "success" : "neutral",
    });
  }
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
        <span className="hca-verify-verdict-icon"><Icon name={symbol} width={28} height={28} /></span>
        <span className="hca-verify-verdict-label">{byCode ? "Consulta do registro" : "Conferência do PDF"}</span>
        <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
        <p>{message}</p>
      </header>
      <ul className="hca-verify-evidence-list">
        {evidence.map(({ label, value, tone: evidenceTone }) => <li className="hca-verify-evidence" data-tone={evidenceTone} key={label}>
          <Icon name={evidenceTone === "success" ? "check" : evidenceTone === "neutral" ? "clock" : "alert"} width={17} height={17} />
          <div><span className="hca-verify-evidence-label">{label}</span><strong className="hca-verify-evidence-value">{value}</strong></div>
        </li>)}
      </ul>
      <div className="hca-verify-result-actions">
        <p>{byCode
          ? reference.found ? "Verifique também o PDF recebido para conferir o conteúdo e os dados técnicos."
            : "Revise o código ou solicite o original ao remetente. A ausência de registro não comprova falsificação."
          : "Use em conjunto a correspondência do arquivo e os resultados de assinatura, carimbo e confiança."}</p>
        <ActionButton variant="primary" onClick={byCode && !reference.found ? onEdit : onFile}>
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
        <p><strong>{title}</strong></p>
        <DefinitionGrid items={[
          { label: source, value: byCode ? sourceHint : source },
          { label: "Registro da emissão", value: reference.found ? formatBrazilDate(reference.registeredAt) : "Não localizado" },
          ...((byFile || another) && fileReference ? [
            { label: "Registro do arquivo enviado", value: formatBrazilDate(fileReference.registeredAt) },
            { label: "Código do arquivo enviado", value: "HCA-" + fileReference.verificationCode.match(/.{4}/g)?.join("-") },
          ] : []),
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
