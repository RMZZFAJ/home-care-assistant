"use client";
import Link from "next/link";
import { PublicHeader } from "@/components/auth/access-frame";
import { Tabs } from "@base-ui/react/tabs";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ActionButton, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { api, errorMessage } from "@/lib/client/api";
import {
  publicPdfLimit,
  publicPdfResultSchema,
  verificationCodeSchema,
  type PublicPdfResult,
} from "@/lib/documents/public-verification";
import { PdfFormatMark } from "@/components/ui/file-record";
import { PrivateVerificationDetails } from "./private-verification-details";
import { safeReturnPath } from "@/lib/safe-return-path";
import { VerificationResult } from "./public-verification-result";
import "./public-verification.css";
export function PublicVerification({
  initialCode = "",
  returnTo,
}: {
  initialCode?: string;
  returnTo?: string;
}) {
  const originReturn = returnTo ? safeReturnPath(returnTo, "https://hca.invalid") : null;
  const codeId = useId(),
    fileId = useId(),
    helpId = useId(),
    errorId = useId();
  const [method, setMethod] = useState<"code" | "file">("code");
  const [fileCodeOpen, setFileCodeOpen] = useState(Boolean(initialCode));
  const [helpOpen, setHelpOpen] = useState(false);
  const [code, setCode] = useState(initialCode),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errorField, setErrorField] = useState<"code" | "file" | "service">(
      "service",
    ),
    [result, setResult] = useState<PublicPdfResult | null>(null);
  useOperationActivity(busy, { title: method === "file" ? "Conferindo o exemplar" : "Consultando a emissão", detail: "Aguarde a conclusão da consulta." });
  const headingRef = useRef<HTMLHeadingElement>(null),
    codeInputRef = useRef<HTMLInputElement>(null),
    fileInputRef = useRef<HTMLInputElement>(null),
    helpButtonRef = useRef<HTMLButtonElement>(null),
    requestRef = useRef<AbortController | null>(null),
    sequenceRef = useRef(0),
    focusFormRef = useRef(false),
    focusResultRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    // Focus only after the matching result and its heading have committed.
    // An animation frame can run before React has attached the new ref.
    if (result && focusResultRef.current === sequenceRef.current) {
      focusResultRef.current = null;
      headingRef.current?.focus();
    }
    if (!result && focusFormRef.current) {
      focusFormRef.current = false;
      (method === "code" ? codeInputRef : fileInputRef).current?.focus();
    }
    if (error && !busy) {
      if (errorField === "code" && (method === "code" || fileCodeOpen)) codeInputRef.current?.focus();
      if (errorField === "file") fileInputRef.current?.focus();
    }
  }, [result, error, errorField, busy, method, fileCodeOpen]);
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
      focusResultRef.current = focus ? sequence : null;
      setResult(parsed.data);
      if (parsed.data.reference.found) {
        const url = new URL(window.location.href);
        url.pathname = "/verificar"; url.search = "?code=" + parsed.data.reference.verificationCode;
        if (originReturn && originReturn !== "/") url.searchParams.set("returnTo", originReturn);
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    },
    [originReturn],
  );
  const query = useCallback(
    async (value: string, focus = true) => {
      const parsed = verificationCodeSchema.safeParse(value);
      if (!parsed.success) {
        codeInputRef.current?.focus();
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
      fileInputRef.current?.focus();
      setError("Selecione um arquivo PDF.");
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      file.size < 100 ||
      file.size > publicPdfLimit
    ) {
      fileInputRef.current?.focus();
      setError("Selecione um PDF entre 100 bytes e 4 MB.");
      return;
    }
    const parsed = code.trim() ? verificationCodeSchema.safeParse(code) : null;
    if (parsed && !parsed.success) {
      setFileCodeOpen(true);
      codeInputRef.current?.focus();
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

  function changeMethod(next: "code" | "file") {
    focusFormRef.current = !!result;
    setMethod(next);
    setError("");
    setResult(null);
    if (next === "file" && code.trim()) setFileCodeOpen(true);
  }
  function resetConsultation() {
    cancel();
    changeMethod("code");
    setBusy(false);
    setCode("");
    setFile(null);
    setFileCodeOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    const url = new URL(window.location.href);
    url.pathname = "/verificar";
    url.searchParams.delete("code");
    url.hash = "";
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  const codeField = (kind: "code" | "file") => <div className="field">
    <label htmlFor={codeId + kind}>{kind === "code" ? "Código do documento" : "Código do documento · opcional"}</label>
    <TextInput ref={method === kind ? codeInputRef : undefined}
      id={codeId + kind} value={code} disabled={busy} required={kind === "code"}
      onChange={event => { setCode(event.target.value); setError(""); }}
      maxLength={64} spellCheck={false} autoComplete="off" autoCapitalize="characters"
      placeholder={kind === "code" ? "HCA-XXXX-XXXX-XXXX-…" : "HCA-…"}
      aria-describedby={helpId + kind + (error && errorField === "code" ? " " + errorId : "")}
      aria-invalid={Boolean(error) && errorField === "code"} />
    <small id={helpId + kind}>{kind === "code"
      ? "Encontre o código no documento, próximo ao QR Code."
      : "Use para conferir se este PDF pertence à emissão esperada."}</small>
  </div>;

  const detailsReference = result?.fileReference?.found ? result.fileReference : result?.reference;
  const detailsCode = detailsReference?.found ? detailsReference.verificationCode : null;
  const loginPath = "/login?next=" + encodeURIComponent("/verificar" + (detailsCode ? "?code=" + detailsCode : ""));
  const fromDocument = originReturn && originReturn !== "/";
  const consultationMethods = [
    { value: "code", label: "Tenho um código", icon: "search" },
    { value: "file", label: "Tenho o PDF", icon: "file" },
  ] as const;

  return <div className="hca-public-access hca-verify-page">
    <PublicHeader verification={{ onStart: resetConsultation, help:
      <ActionButton ref={helpButtonRef} variant="quiet" compact className="hca-verify-help-button"
        onClick={() => setHelpOpen(true)}><Icon name="info" width={17} height={17} /> Ajuda</ActionButton>,
    }} />
    <main id="workspace-content" className="hca-verify-main">
      <header className="hca-verify-hero" data-result={Boolean(result)}>
        <div>
          <span className="hca-verify-eyebrow"><Icon name="shield" width={15} height={15} /> Verificação de documentos</span>
          <h1>{result ? "Resultado da verificação" : <>{"Confira a origem "}<br />do documento recebido.</>}</h1>
          <p>{result ? "Veja o que foi confirmado e o que ainda precisa ser conferido."
            : "Consulte a emissão ou confira o PDF. Você pode fazer a verificação pública sem entrar no sistema."}</p>
          {!result ? <div className="hca-verify-traits">
            <span><Icon name="file" width={14} height={14} /> Código ou PDF</span>
            <span><Icon name="lock" width={14} height={14} /> Dados preservados</span>
          </div> : null}
        </div>
      </header>
      <div className="hca-verify-content">
        {result ? <>
          <VerificationResult result={result} code={code} file={file} headingRef={headingRef}
            onEdit={() => changeMethod(method)}
            onFile={() => { if (method === "file") setFile(null); changeMethod("file"); }} />
          {detailsCode ? <PrivateVerificationDetails key={detailsCode} code={detailsCode} /> : null}
        </> : <Tabs.Root value={method} className="hca-verify-form-card" onValueChange={value => {
          if (value === "code" || value === "file") changeMethod(value);
        }}>
          <Tabs.List className="hca-verify-methods" aria-label="Como deseja verificar?">
            {consultationMethods.map(({ value, label, icon }) => <Tabs.Tab value={value} disabled={busy} key={value}>
              <Icon name={icon} width={18} height={18} />{label}
            </Tabs.Tab>)}
          </Tabs.List>
          {error ? <p id={errorId} role="alert" className="ui-notice ui-notice-error hca-verify-feedback">{error}</p> : null}
          <Tabs.Panel value="code">
            <form className="hca-verify-form" aria-label="Consultar código" noValidate onSubmit={event => {
              event.preventDefault();
              void query(code);
            }}>
              <header><h2>Consulte o código</h2><p>Localize a emissão registrada pelo Home Care Assistant.</p></header>
              {codeField("code")}
              <ActionButton variant="primary" disabled={busy} type="submit"><Icon name="search" /> Consultar código</ActionButton>
              <p className="hca-verify-form-note"><Icon name="info" width={15} height={15} />A consulta do código não confere o conteúdo do PDF recebido.</p>
            </form>
          </Tabs.Panel>
          <Tabs.Panel value="file">
            <form className="hca-verify-form" aria-label="Conferir arquivo PDF" onSubmit={event => {
              event.preventDefault();
              void upload();
            }}>
              <header><h2>Confira o arquivo</h2><p>Compare o PDF recebido com o exemplar registrado e consulte os resultados técnicos.</p></header>
              <label className={file ? "hca-verify-selected-file" : "hca-verify-file-picker"} htmlFor={fileId}>
                {file ? <><PdfFormatMark /><span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></span>
                  <Icon name="edit" /></> : <>
                  <span><Icon name="upload" width={29} height={29} /></span>
                  <strong>Selecione o PDF recebido</strong><small>PDF · até 4 MB</small>
                </>}
                <TextInput ref={fileInputRef} id={fileId} type="file" aria-label="Arquivo PDF para conferir"
                  disabled={busy} accept="application/pdf,.pdf" onChange={event => {
                    setFile(event.target.files?.[0] ?? null); setError("");
                  }}
                  aria-describedby={helpId + "pdf" + (error && errorField === "file" ? " " + errorId : "")}
                  aria-invalid={Boolean(error) && errorField === "file"} />
              </label>
              <details className="hca-verify-optional-code" open={fileCodeOpen} onToggle={event => setFileCodeOpen(event.currentTarget.open)}>
                <summary>Também tenho um código<Icon name="down" width={16} height={16} /></summary>
                {codeField("file")}
              </details>
              <ActionButton variant="primary" disabled={busy} type="submit"><Icon name="shield" /> Verificar arquivo PDF</ActionButton>
              <p className="hca-verify-form-note" id={helpId + "pdf"}><Icon name="lock" width={15} height={15} />O arquivo é usado nesta conferência. O resultado público não expõe dados do paciente.</p>
            </form>
          </Tabs.Panel>
        </Tabs.Root>}
        <section className="hca-verify-guidance" id="verificacao-ajuda" aria-labelledby={helpId + "title"}>
          <h2 id={helpId + "title"}>Entenda a conferência</h2>
          <details><summary>Consultar o código ou enviar o PDF?<Icon name="down" width={16} height={16} /></summary>
            <p>O código localiza uma emissão. Para comparar o conteúdo e analisar assinatura e carimbo, selecione o PDF recebido.</p></details>
          <details><summary>O que significa a assinatura técnica?<Icon name="down" width={16} height={16} /></summary>
            <p>Ela identifica a emissão técnica pelo sistema. A assinatura e o carimbo atuais seguem a política interna do Home Care Assistant. Não representam assinatura pessoal, ICP-Brasil ou horário independente de terceiro.</p></details>
          <details><summary>Quem pode ver os dados da ficha?<Icon name="down" width={16} height={16} /></summary>
            <p>Os detalhes da ficha exigem uma conta com permissão para o paciente. A consulta pública não mostra paciente, materiais ou responsáveis.</p></details>
        </section>
      </div>
      <footer className="hca-verify-footer">
        <strong><Icon name="heart" width={17} height={17} /> Home Care Assistant</strong>
        <Link href={fromDocument ? originReturn : loginPath} className="btn btn-ghost">
          <Icon name={fromDocument ? "back" : "user"} />{fromDocument ? "Voltar à ficha" : "Acessar minha conta"}
        </Link>
      </footer>
    </main>
    <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}
      title="Como verificar um documento" subtitle="Escolha a conferência que você precisa."
      headingIcon="info" finalFocus={helpButtonRef}
      footer={<ActionButton variant="primary" onClick={() => setHelpOpen(false)}>Entendi</ActionButton>}>
      <div className="hca-form-stack">
        <div className="hca-verify-help-option"><Icon name="search" width={22} height={22} /><div>
          <h3>Consultar o código</h3><p>Localiza a emissão registrada. Copie o código completo do documento ou abra o link do QR Code.</p>
        </div></div>
        <div className="hca-verify-help-option"><Icon name="file" width={22} height={22} /><div>
          <h3>Conferir o PDF</h3><p>Compara o arquivo e apresenta os resultados de assinatura, carimbo e confiança. Use o arquivo original recebido.</p>
        </div></div>
        <p>Se a consulta estiver indisponível, tente novamente. Uma falha técnica não confirma nem reprova o documento.</p>
      </div>
    </Dialog>
  </div>;
}
