"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/primitives";
import { buttonClass, inputClass, Notice } from "@/components/workspace";

type Detector = {
  detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};
export function BarcodeScanner({
  onRead,
}: {
  onRead: (code: string) => Promise<void> | void;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [lastRead, setLastRead] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const gateRef = useRef({ code: "", at: 0, misses: 0 });
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  const receive = useCallback((value: string) => {
    if (!/^\d{8,14}$/.test(value)) return;
    const state = gateRef.current;
    const now = Date.now();
    if (state.code === value && (now - state.at < 1800 || state.misses < 3))
      return;
    gateRef.current = { code: value, at: now, misses: 0 };
    setLastRead(value);
    void Promise.resolve(onReadRef.current(value)).catch((reason) =>
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível identificar o código.",
      ),
    );
  }, []);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let stopDecoder: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "A câmera exige navegador compatível e uma conexão segura. Use a entrada manual ou uma foto.",
          );
        const Native = (
          window as Window & { BarcodeDetector?: DetectorConstructor }
        ).BarcodeDetector;
        if (Native && (await Native.getSupportedFormats()).includes("ean_13")) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          if (!videoRef.current) return;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const formats = (await Native.getSupportedFormats()).filter(
            (format) =>
              ["ean_13", "ean_8", "upc_a", "upc_e", "itf"].includes(format),
          );
          const detector = new Native({ formats });
          const scan = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const results = await detector.detect(videoRef.current);
              if (results[0]) receive(results[0].rawValue);
              else gateRef.current.misses++;
            } catch {
              /* A transient undecodable frame is not a camera failure. */
            }
            if (!cancelled) timer = setTimeout(() => void scan(), 180);
          };
          void scan();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          if (cancelled || !videoRef.current) return;
          const controls =
            await new BrowserMultiFormatReader().decodeFromConstraints(
              { video: { facingMode: { ideal: "environment" } }, audio: false },
              videoRef.current,
              (result) => {
                if (cancelled) return;
                if (result) receive(result.getText());
                else gateRef.current.misses++;
              },
            );
          stopDecoder = () => controls.stop();
          if (cancelled) controls.stop();
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof DOMException && reason.name === "NotAllowedError"
              ? "Acesso à câmera negado. Você pode permitir nas configurações ou digitar o código."
              : reason instanceof Error
                ? reason.message
                : "Não foi possível abrir a câmera.",
          );
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopDecoder?.();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, receive]);
  async function readImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError("Use uma imagem de até 10 MiB.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(
        url,
      );
      gateRef.current.code = "";
      receive(result.getText());
      setError("");
    } catch {
      setError(
        "Não foi possível ler a imagem. Aproxime o código ou use a entrada manual.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <div className="scanner-panel">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setActive((current) => !current);
            setError("");
          }}
        >
          <Icon name="camera" />
          {active ? "Encerrar câmera" : "Ler código de barras"}
        </button>
        <label className={buttonClass}>
          <Icon name="upload" />
          Ler de uma foto
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void readImage(event.target.files?.[0])}
          />
        </label>
      </div>
      {active ? (
        <div className="mt-3">
          <video
            className="scanner-video"
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Câmera para código de barras"
          />
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              gateRef.current = { code: "", at: 0, misses: 0 };
            }}
          >
            Ler outra embalagem igual
          </button>
        </div>
      ) : null}
      <div className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-semibold">
          Código manual
          <input
            className={inputClass}
            inputMode="numeric"
            value={manual}
            onChange={(event) =>
              setManual(event.target.value.replace(/\D/g, ""))
            }
            placeholder="EAN / GTIN / UPC"
          />
        </label>
        <button
          className={buttonClass}
          type="button"
          disabled={!/^\d{8,14}$/.test(manual)}
          onClick={() => {
            gateRef.current.code = "";
            receive(manual);
          }}
        >
          Identificar
        </button>
      </div>
      {lastRead ? (
        <p className="mt-2 text-xs text-(--muted)" role="status">
          Última leitura: {lastRead}
        </p>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
    </div>
  );
}
