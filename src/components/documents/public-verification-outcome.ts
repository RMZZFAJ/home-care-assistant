import type { IconName } from "@/components/ui/icon";
import type { PublicPdfResult } from "@/lib/documents/public-verification";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type Evidence = { label: string; value: string; tone: Tone; help?: string };
type Outcome = { title: string; message: string; note: string; icon: IconName; tone: Tone };

const analysisOutcomes = {
  unsigned: {
    title: "Assinatura não encontrada", message: "Sem assinatura incorporada neste PDF.",
    note: "Peça ao remetente o PDF original emitido pelo sistema.", icon: "file", tone: "warning",
  },
  invalid_signature: {
    title: "Assinatura não confirmada", message: "A assinatura do arquivo não pôde ser validada.",
    note: "Solicite o exemplar original antes de usar este documento.", icon: "alert", tone: "danger",
  },
  invalid_timestamp: {
    title: "Carimbo não confirmado", message: "O carimbo de tempo está ausente ou não pôde ser confirmado.",
    note: "Solicite ao remetente outro exemplar para concluir a conferência.", icon: "clock", tone: "warning",
  },
  unreadable: {
    title: "Não foi possível ler este PDF", message: "O arquivo não pôde ser interpretado para realizar a conferência.",
    note: "Baixe novamente o original e tente outra vez. Uma falha de leitura não comprova adulteração.", icon: "file", tone: "warning",
  },
  unsupported: {
    title: "Perfil de PDF não suportado", message: "O verificador não consegue analisar a estrutura deste PDF.",
    note: "Solicite um exemplar compatível ao remetente.", icon: "file", tone: "warning",
  },
  processing_limit: {
    title: "A análise não foi concluída", message: "A conferência atingiu um limite de processamento.",
    note: "Tente novamente mais tarde ou solicite outro exemplar. Não há conclusão sobre alteração do arquivo.", icon: "clock", tone: "warning",
  },
} satisfies Record<string, Outcome>;

const signatures = {
  valid: { value: "Integridade conferida", tone: "success" },
  invalid: { value: "Não confirmada", tone: "danger" },
  absent: { value: "Não encontrada", tone: "warning" },
  not_assessed: { value: "Não avaliada", tone: "neutral" },
} satisfies Record<string, Omit<Evidence, "label">>;
const timestamps = {
  valid: { value: "Integridade conferida", tone: "success" },
  invalid: { value: "Não confirmado", tone: "warning" },
  not_assessed: { value: "Não avaliado", tone: "neutral" },
} satisfies Record<string, Omit<Evidence, "label">>;

type ByteComparison = "match" | "mismatch" | "another" | "foundByFile" | "unavailable";
type LocatedReference = Extract<PublicPdfResult["reference"], { found: true }>;
type Presentation = Outcome & { evidence: Evidence[]; fileReference: LocatedReference | null };

function compareBytes(reference: PublicPdfResult["reference"], fileReference: LocatedReference | null): ByteComparison {
  if (!reference.found) return fileReference ? "foundByFile" : "unavailable";
  if (reference.bytesMatch === true) return "match";
  if (reference.bytesMatch !== false) return "unavailable";
  return fileReference && reference.verificationCode !== fileReference.verificationCode ? "another" : "mismatch";
}

const byteEvidence = {
  match: { value: "Correspondência exata", tone: "success" },
  foundByFile: { value: "Correspondência exata", tone: "success" },
  mismatch: { value: "Sem correspondência", tone: "warning" },
  another: { value: "Exemplar de outra emissão", tone: "warning" },
  unavailable: { value: "Sem exemplar para comparação", tone: "neutral" },
} satisfies Record<ByteComparison, Omit<Evidence, "label">>;

function codePresentation(located: boolean, revoked: boolean): Presentation {
  if (located) return {
    title: "Emissão localizada",
    message: "Este código corresponde a uma emissão do Home Care Assistant. Envie o arquivo para verificar seus bytes.",
    note: "Para concluir a conferência do documento recebido, verifique também o PDF.",
    tone: revoked ? "danger" : "info", icon: "file",
    evidence: [
      { label: "Registro da emissão", value: "Localizado", tone: "success", help: "A referência existe no sistema." },
      { label: "Arquivo PDF", value: "Ainda não conferido", tone: "neutral", help: "Selecione o arquivo para comparar seu conteúdo." },
      { label: "Assinatura e carimbo", value: "Aguardando o PDF", tone: "neutral", help: "A consulta por código localiza o registro." },
      ...(revoked ? [{ label: "Política de confiança", value: "Certificado registrado revogado", tone: "danger" as const }] : []),
    ],
    fileReference: null,
  };
  return {
    title: "Emissão não localizada", message: "Nenhuma emissão foi localizada para o código informado.",
    note: "Revise o código ou solicite o original ao remetente. A ausência de registro não comprova falsificação.",
    tone: "warning", icon: "search",
    evidence: [
      { label: "Registro da emissão", value: "Não localizado", tone: "warning", help: "Confira se todos os caracteres foram informados." },
      { label: "Arquivo PDF", value: "Não conferido", tone: "neutral", help: "Nenhum arquivo foi analisado nesta consulta." },
    ],
    fileReference: null,
  };
}

function technicalOutcome(result: PublicPdfResult, revoked: boolean, unrecognized: boolean): Outcome | null {
  const { analysis, policyStatus } = result;
  const verified = analysis?.verification;
  if (revoked) return {
    title: "Certificado revogado", message: "Um certificado deste PDF consta como revogado na política vigente.",
    note: "Consulte o responsável pelo documento antes de usar o arquivo.", tone: "danger", icon: "shield",
  };
  if (policyStatus === "unavailable") return {
    title: "Confiança ainda não conferida", message: "A análise técnica aguarda a política de confiança.",
    note: "Tente novamente mais tarde para conferir a assinatura, o carimbo e a confiança.", tone: "warning", icon: "clock",
  };
  if (analysis && analysis.status !== "verified") return analysisOutcomes[analysis.status];
  if (unrecognized) return {
    title: "Confiança não reconhecida", message: "A cadeia de confiança deste PDF não foi reconhecida.",
    note: "Solicite ao remetente um PDF cuja assinatura e carimbo possam ser confirmados.", tone: "warning", icon: "shield",
  };
  if (verified && !verified.wholeFile) return {
    title: "Assinatura não cobre todo o PDF", message: "Há bytes acrescentados após a assinatura.",
    note: "Solicite ao remetente o PDF original.", tone: "danger", icon: "alert",
  };
  return null;
}

function comparisonOutcome(comparison: ByteComparison, recognized: boolean, technical: Outcome | null): Outcome {
  if (comparison === "another") return {
    title: "Este PDF é de outra emissão", message: "O PDF corresponde a outra emissão registrada.",
    note: "Confirme com o remetente qual emissão deveria ser utilizada.",
    tone: technical?.tone === "danger" ? "danger" : "warning", icon: "file",
  };
  if (technical) return technical;
  if (comparison === "match") return {
    title: "Arquivo correspondente", message: "Os bytes coincidem com o exemplar registrado.",
    note: recognized ? "A assinatura e o carimbo foram aceitos pela política de confiança configurada."
      : "Consulte os resultados de assinatura, carimbo e confiança.",
    tone: recognized ? "success" : "warning", icon: recognized ? "check-circle" : "alert",
  };
  if (comparison === "foundByFile") return {
    title: "Emissão identificada pelo arquivo", message: "Os bytes coincidem com o exemplar registrado.",
    note: "Confira o código recebido com o remetente.", tone: "warning", icon: "alert",
  };
  if (comparison === "mismatch") return {
    title: "O arquivo não corresponde", message: "Os bytes divergem da emissão consultada.",
    note: "Solicite ao remetente o exemplar original desta emissão.", tone: "warning", icon: "alert",
  };
  return {
    title: "Emissão não localizada pelo arquivo", message: "Nenhum exemplar registrado corresponde aos bytes apresentados.",
    note: "Confira o código junto ao QR Code ou solicite o exemplar original ao remetente.", tone: "warning", icon: "search",
  };
}

function trustEvidence(result: PublicPdfResult, revoked: boolean, unrecognized: boolean): Omit<Evidence, "label"> | null {
  const { analysis, policyStatus } = result;
  if (revoked) return { value: "Certificado revogado", tone: "danger" };
  if (policyStatus === "unavailable") return { value: "Política temporariamente indisponível", tone: "warning" };
  if (analysis?.verification?.accepted) return { value: "Aceita sob a política configurada", tone: "success" };
  if (analysis?.verification) return { value: unrecognized ? "Cadeia não reconhecida" : "Não aceita sob a política configurada", tone: "warning" };
  return policyStatus ? { value: "Não avaliada para este PDF", tone: "neutral" } : null;
}

export function verificationPresentation(result: PublicPdfResult): Presentation {
  const { reference, analysis, policyStatus, referenceOnly } = result;
  const verified = analysis?.verification;
  const trustStatuses = [verified?.signerTrust, verified?.timestampTrust];
  const revoked = policyStatus === "revoked" || trustStatuses.includes("revoked");
  if (referenceOnly) return codePresentation(reference.found, revoked);

  const fileReference = result.fileReference?.found && result.fileReference.bytesMatch === true ? result.fileReference : null;
  const comparison = compareBytes(reference, fileReference);
  const unrecognized = trustStatuses.some(trust => trust === "unknown_chain" || trust === "invalid_chain" || trust === "expired");
  const technical = technicalOutcome(result, revoked, unrecognized);
  const trust = trustEvidence(result, revoked, unrecognized);
  const evidence: Evidence[] = [
    { label: "Registro da emissão", value: reference.found ? "Localizado" : comparison === "foundByFile" ? "Código informado sem registro" : "Não localizado",
      tone: reference.found ? "success" : "warning" },
    { label: "Conteúdo do arquivo", ...byteEvidence[comparison] },
    { label: "Assinatura técnica", ...(verified && !verified.wholeFile
      ? { value: "Válida para os bytes assinados", tone: "warning" }
      : signatures[analysis?.documentSignature ?? "not_assessed"]) },
    { label: "Carimbo de tempo", ...timestamps[analysis?.timestamp ?? "not_assessed"] },
  ];
  if (trust) evidence.push({ label: "Política de confiança", ...trust });
  return { ...comparisonOutcome(comparison, verified?.accepted === true, technical), evidence, fileReference };
}
