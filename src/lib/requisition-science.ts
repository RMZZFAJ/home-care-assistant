export type ScienceMode = "manual" | "dialog" | "tacit";
export type SciencePreference = { id: string | null; mode: ScienceMode; version: number; effectiveAt: string | null; consentCopyVersion: string };
export const scienceModeLabels: Record<ScienceMode, string> = { manual: "Confirmação manual expressa", dialog: "Diálogo antes de abrir", tacit: "Ciência tácita na emissão" };
export const scienceConsentCopyVersion = "P02-REQ-1";
export const scienceConsent: Record<Exclude<ScienceMode, "manual">, string> = {
  dialog: "Quero confirmar minha ciência em um diálogo antes de abrir uma requisição elegível, quando a regra do paciente permitir. Voltar não registra ciência. A confirmação não declara leitura integral.",
  tacit: "Autorizo registrar minha ciência na emissão oficial de novas requisições elegíveis, quando eu estiver habilitado e a regra do paciente permitir, mesmo sem abrir o documento. Esta escolha não registra ciência retroativa nem substitui recebimento ou qualquer ato material.",
};
