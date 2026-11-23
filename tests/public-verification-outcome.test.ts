import { describe, expect, it } from "vitest";
import { verificationPresentation } from "@/components/documents/public-verification-outcome";
import { publicPdfResultSchema, type PublicPdfResult } from "@/lib/documents/public-verification";

const hash = "a".repeat(64);
const instant = "2026-11-19T14:18:00Z";
const registered = {
  found: true,
  verificationCode: "A".repeat(32),
  registeredAt: instant,
  sha256: hash,
  sizeBytes: 2048,
  bytesMatch: true,
  recordedProfile: "PAdES-B-T",
  recordedTimestamp: instant,
  certificateFingerprint: hash,
  timestampCertificateFingerprint: hash,
  externalTimeIndependence: false,
} as const;
const missing = { found: false } as const;
const technical = {
  profile: "PAdES-B-T",
  accepted: true,
  cryptographicIntegrity: true,
  wholeFile: true,
  signerTrust: "internal",
  timestampTrust: "internal",
  certificateFingerprint: hash,
  timestampCertificateFingerprint: hash,
  timestampAt: instant,
  timestampPolicy: "1.2.3",
  externalTimeIndependence: false,
  revocationEvidence: "configured_internal_denylist_only",
} as const;

function presentation(values: Partial<PublicPdfResult> = {}) {
  return verificationPresentation(publicPdfResultSchema.parse({
    reference: registered, fileReference: registered, fileSha256: hash,
    analysis: { status: "verified", documentSignature: "valid", timestamp: "valid", verification: technical },
    policyStatus: "recognized_internal", referenceOnly: false,
    ...values,
  }));
}

describe("public verification presentation", () => {
  it("locates the register without implying technical analysis", () => {
    const result = presentation({
      referenceOnly: true, fileReference: null, fileSha256: null, analysis: null,
      reference: { ...registered, bytesMatch: null },
    });
    expect(result.title).toBe("Emissão localizada");
    expect(result.evidence.map(row => row.value)).toEqual(["Localizado", "Ainda não conferido", "Aguardando o PDF"]);
  });

  it("distinguishes nonmatching bytes, an absent register, and an exact match under a different code", () => {
    const notMatched = presentation({ reference: { ...registered, bytesMatch: false }, fileReference: missing });
    expect(notMatched.title).toBe("O arquivo não corresponde");
    const noRegister = presentation({ reference: missing, fileReference: missing });
    expect(noRegister.title).toBe("Emissão não localizada pelo arquivo");
    expect(noRegister.evidence).toContainEqual(expect.objectContaining({ value: "Sem exemplar para comparação", tone: "neutral" }));
    const other = presentation({ reference: { ...registered, bytesMatch: false, verificationCode: "B".repeat(32) } });
    expect(other.title).toBe("Este PDF é de outra emissão");
    expect(other.evidence).toContainEqual(expect.objectContaining({ value: "Exemplar de outra emissão", tone: "warning" }));
    expect(presentation({ reference: missing }).title).toBe("Emissão identificada pelo arquivo");
  });

  it.each([
    ["unsigned", "absent", "not_assessed", "Assinatura não encontrada"],
    ["invalid_signature", "invalid", "not_assessed", "Assinatura não confirmada"],
    ["invalid_timestamp", "valid", "invalid", "Carimbo não confirmado"],
    ["unreadable", "not_assessed", "not_assessed", "Não foi possível ler este PDF"],
    ["unsupported", "not_assessed", "not_assessed", "Perfil de PDF não suportado"],
    ["processing_limit", "not_assessed", "not_assessed", "A análise não foi concluída"],
  ] as const)("keeps byte equality independent of the %s result", (status, documentSignature, timestamp, title) => {
    const result = presentation({ analysis: { status, documentSignature, timestamp, verification: null } });
    expect(result.title).toBe(title);
    expect(result.tone).not.toBe("success");
    expect(result.evidence).toContainEqual(expect.objectContaining({ value: "Correspondência exata", tone: "success" }));
    expect(result.evidence).toContainEqual(expect.objectContaining({ value: "Não avaliada para este PDF" }));
  });

  it("preserves evidence when the policy is unavailable", () => {
    const result = presentation({ policyStatus: "unavailable", analysis: null });
    expect(result.title).toBe("Confiança ainda não conferida");
    expect(result.evidence).toContainEqual(expect.objectContaining({ value: "Correspondência exata" }));
    expect(result.evidence).toContainEqual(expect.objectContaining({ label: "Assinatura técnica", value: "Não avaliada" }));
  });

  it.each([
    [{ signerTrust: "revoked" }, "Certificado revogado", "danger"],
    [{ timestampTrust: "expired" }, "Confiança não reconhecida", "warning"],
    [{ signerTrust: "unknown_chain" }, "Confiança não reconhecida", "warning"],
    [{ wholeFile: false }, "Assinatura não cobre todo o PDF", "danger"],
  ] as const)("keeps certificate trust and signature coverage independent of byte equality", (override, title, tone) => {
    const result = presentation({
      analysis: {
        status: "verified", documentSignature: "valid", timestamp: "valid",
        verification: { ...technical, ...override, accepted: false },
      },
    });
    expect(result).toMatchObject({ title, tone });
    expect(result.evidence).toContainEqual(expect.objectContaining({ value: "Correspondência exata" }));
  });
});
