"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { api, errorMessage } from "@/lib/client/api";
import {
  publicPdfLimit,
  publicPdfResultSchema,
  verificationCodeSchema,
  type PublicPdfResult,
} from "@/lib/documents/public-verification";
import { formatBrazilDate } from "@/lib/receipt";
const trustLabels = {
  internal: "Cadeia interna reconhecida",
  external: "Cadeia externa reconhecida pela política configurada",
  unknown_chain: "Cadeia desconhecida",
  invalid_chain: "Cadeia inválida",
  revoked: "Certificado revogado na política interna",
  expired: "Certificado expirado na época do carimbo",
};
export function PublicVerification({
  initialCode = "",
}: {
  initialCode?: string;
}) {
  const codeId = useId(),
    fileId = useId(),
    helpId = useId(),
    errorId = useId();
  const [code, setCode] = useState(initialCode),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errorField, setErrorField] = useState<"code" | "file" | "service">(
      "service",
    ),
    [result, setResult] = useState<PublicPdfResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null),
    requestRef = useRef<AbortController | null>(null),
    sequenceRef = useRef(0);
  const cancel = useCallback(() => {
    requestRef.current?.abort();
    sequenceRef.current++;
  }, []);
  const accept = useCallback(
    (value: unknown, sequence: number, focus: boolean) => {
      const parsed = publicPdfResultSchema.safeParse(value);
      if (!parsed.success)
        throw new Error(
          "Não foi possível confirmar a resposta da verificação. Consulte novamente.",
        );
      if (sequence !== sequenceRef.current) return;
      setResult(parsed.data);
      if (focus) requestAnimationFrame(() => headingRef.current?.focus());
    },
    [],
  );
  const query = useCallback(
    async (value: string, focus = true) => {
      const parsed = verificationCodeSchema.safeParse(value);
      if (!parsed.success) {
        setErrorField("code");
        setError(
          "Informe o código de verificação completo, com 32 caracteres após HCA.",
        );
        return;
      }
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const sequence = ++sequenceRef.current;
      setBusy(true);
      setError("");
      setErrorField("service");
      setResult(null);
      try {
        accept(
          await api(
            `/api/verification?code=${parsed.data}`,
            undefined,
            controller.signal,
          ),
          sequence,
          focus,
        );
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Consulta temporariamente indisponível.",
          );
      } finally {
        if (sequence === sequenceRef.current) setBusy(false);
      }
    },
    [accept],
  );
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live && initialCode) void query(initialCode, false);
    });
    return () => {
      live = false;
      cancel();
    };
  }, [initialCode, query, cancel]);
  async function upload() {
    setErrorField("file");
    if (!file) {
      setError("Selecione um arquivo PDF.");
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      file.size < 100 ||
      file.size > publicPdfLimit
    ) {
      setError("Selecione um PDF entre 100 bytes e 4 MB.");
      return;
    }
    const parsed = code.trim() ? verificationCodeSchema.safeParse(code) : null;
    if (parsed && !parsed.success) {
      setErrorField("code");
      setError(
        "Corrija o código completo ou limpe o campo para localizar o exemplar pelo arquivo.",
      );
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = ++sequenceRef.current;
    setBusy(true);
    setError("");
    setErrorField("service");
    setResult(null);
    const deadline = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(
        "/api/verification" + (parsed?.success ? `?code=${parsed.data}` : ""),
        {
          method: "POST",
          headers: { "content-type": "application/pdf" },
          body: file,
          signal: controller.signal,
          cache: "no-store",
        },
      );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error(
          "A resposta da análise não pôde ser confirmada. Tente novamente.",
        );
      }
      if (!response.ok) {
        if ([413, 415].includes(response.status)) setErrorField("file");
        throw new Error(
          errorMessage(body, "A análise está temporariamente indisponível."),
        );
      }
      accept(body, sequence, true);
    } catch (reason) {
      if (sequence === sequenceRef.current)
        setError(
          controller.signal.aborted
            ? "A análise excedeu a espera. Tente novamente; isso não comprova adulteração."
            : reason instanceof Error
              ? reason.message
              : "Não foi possível analisar o arquivo.",
        );
    } finally {
      clearTimeout(deadline);
      if (sequence === sequenceRef.current) setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Verificação de documentos</h1>
      <p>
        Consulte uma emissão pelo código impresso ou envie o PDF para comparar
        os bytes e conferir a assinatura. Você não precisa de conta.
      </p>
      <p id={helpId} className="text-sm">
        O QR ou código isolado consulta um registro; não comprova a integridade
        do arquivo em suas mãos. Dados do paciente, materiais e responsáveis não
        são exibidos.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void query(code);
        }}
        className="space-y-3"
        aria-label="Consultar código"
      >
        <label htmlFor={codeId}>Código de verificação</label>
        <input
          id={codeId}
          className="ui-input w-full"
          value={code}
          disabled={busy}
          onChange={(event) => {
            setCode(event.target.value);
            setError("");
            setResult(null);
          }}
          maxLength={64}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={`${helpId}${error && errorField === "code" ? " " + errorId : ""}`}
          aria-invalid={Boolean(error) && errorField === "code"}
        />
        <button
          className="ui-button ui-button-primary"
          disabled={busy}
          type="submit"
        >
          Consultar código
        </button>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
        className="space-y-3"
        aria-label="Conferir arquivo PDF"
      >
        <label htmlFor={fileId}>Arquivo PDF para conferir</label>
        <input
          id={fileId}
          type="file"
          disabled={busy}
          accept="application/pdf,.pdf"
          className="block w-full min-w-0 text-sm"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError("");
            setResult(null);
          }}
          aria-describedby={`${helpId}${error && errorField === "file" ? " " + errorId : ""}`}
          aria-invalid={Boolean(error) && errorField === "file"}
        />
        <p className="text-sm">
          Até 4 MB. O arquivo é analisado em memória e não é guardado no acervo.
          Limites temporários protegem o serviço contra abuso.
        </p>
        <button
          className="ui-button ui-button-primary"
          disabled={busy}
          type="submit"
        >
          Conferir PDF
        </button>
      </form>
      {busy ? (
        <p role="status">
          Consultando e conferindo as informações disponíveis…
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="ui-notice ui-notice-error">
          {error}
        </p>
      ) : null}
      {result ? (
        <VerificationResult result={result} headingRef={headingRef} />
      ) : null}
      <p className="text-sm">
        Assinatura técnica do Home Care Assistant e TSA internos não representam
        assinatura pessoal, ICP-Brasil ou independência temporal de terceiro.
        Revogação externa por OCSP/CRL não é consultada nesta etapa.
      </p>
      <a className="ui-button ui-button-secondary" href="/login">
        Acessar documento com autorização
      </a>
    </main>
  );
}
function VerificationResult({
  result,
  headingRef,
}: {
  result: PublicPdfResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const ref = result.reference,
    analysis = result.analysis,
    verification = analysis?.verification;
  const statuses = {
    verified: "Análise criptográfica concluída",
    unsigned: "Sem assinatura incorporada",
    invalid_signature: "Assinatura criptográfica inválida",
    invalid_timestamp: "Carimbo temporal ausente ou inválido",
    unreadable: "Não foi possível interpretar a assinatura deste PDF",
    unsupported: "Perfil do PDF não suportado nesta verificação",
    processing_limit: "Análise interrompida pelo limite de processamento",
  };
  return (
    <section
      aria-label="Resultado da verificação"
      className="space-y-3 rounded-lg border border-(--border) p-4"
    >
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">
        {ref.found ? "Emissão localizada" : "Emissão não localizada"}
      </h2>
      {ref.found ? (
        <>
          <p>Registro concluído em {formatBrazilDate(ref.registeredAt)}.</p>
          <p className="break-all">
            Código: HCA-{ref.verificationCode.match(/.{4}/g)?.join("-")}
          </p>
        </>
      ) : (
        <p>
          A ausência de referência não comprova falsificação. Confira o código
          ou consulte quem forneceu o arquivo.
        </p>
      )}
      {result.referenceOnly ? (
        <>
          <p>
            O registro informa assinatura e carimbo conferidos na emissão. Envie
            o arquivo para verificar seus bytes e sua assinatura agora.
          </p>
          {ref.found ? (
            <p>
              {result.policyStatus === "revoked"
                ? "A política interna atual marca um certificado desta emissão como revogado."
                : result.policyStatus === "unavailable"
                  ? "A política atual de confiança está indisponível."
                  : result.policyStatus === "unknown"
                    ? "O certificado registrado não foi reconhecido pela política atual."
                    : "O par de certificados registrado consta na política de confiança atual."}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="font-semibold">
            {ref.found
              ? ref.bytesMatch
                ? "Os bytes coincidem com o exemplar registrado."
                : "Os bytes divergem da emissão consultada."
              : result.legacy?.found
                ? "Arquivo localizado no acervo legado."
                : "Nenhum exemplar registrado corresponde a estes bytes."}
          </p>
          {result.fileReference?.found &&
          ref.found &&
          result.fileReference.issuanceId !== ref.issuanceId ? (
            <p>
              O PDF corresponde a outra emissão registrada. O código consultado
              pertence a outro exemplar.
            </p>
          ) : null}
          {analysis ? (
            <p className="font-semibold">{statuses[analysis.status]}</p>
          ) : null}
          {analysis?.documentSignature === "valid" ? (
            <p>Assinatura do documento: criptograficamente íntegra.</p>
          ) : null}
          {analysis?.status === "unsigned" && result.legacy?.found ? (
            <p>
              Exemplar legado sem assinatura incorporada; o registro de seus
              bytes não cria assinatura retroativa.
            </p>
          ) : null}
          {analysis?.status === "processing_limit" ? (
            <p>
              O limite de análise não permite concluir se o arquivo foi
              adulterado. Solicite outro exemplar ou tente novamente.
            </p>
          ) : null}
          {verification ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt>Cobertura dos bytes</dt>
                <dd>
                  {verification.wholeFile
                    ? "A assinatura cobre o arquivo inteiro."
                    : "Há bytes acrescentados após a assinatura. O arquivo completo não é aceito como exemplar imutável."}
                </dd>
              </div>
              <div>
                <dt>Confiança do assinador</dt>
                <dd>{trustLabels[verification.signerTrust]}</dd>
              </div>
              <div>
                <dt>Carimbo de tempo</dt>
                <dd>
                  Token RFC3161 criptograficamente íntegro ·{" "}
                  {formatBrazilDate(verification.timestampAt)}
                </dd>
              </div>
              <div>
                <dt>Confiança da TSA</dt>
                <dd>{trustLabels[verification.timestampTrust]}</dd>
              </div>
              <div>
                <dt>Aceite técnico sob a política atual</dt>
                <dd>
                  {verification.accepted
                    ? "Aceito para integridade e confiança configurada."
                    : "Não aceito sob a política atual. Consulte os resultados específicos acima."}
                </dd>
              </div>
              <div>
                <dt>Certificado que assinou · SHA-256</dt>
                <dd className="break-all">
                  {verification.certificateFingerprint}
                </dd>
              </div>
              <div>
                <dt>Certificado da TSA · SHA-256</dt>
                <dd className="break-all">
                  {verification.timestampCertificateFingerprint}
                </dd>
              </div>
            </dl>
          ) : null}
          <p className="break-all text-xs">
            SHA-256 do arquivo enviado: {result.fileSha256}
          </p>
        </>
      )}
    </section>
  );
}
