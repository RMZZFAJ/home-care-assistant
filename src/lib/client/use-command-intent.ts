"use client";

import { useRef, useState } from "react";
import { api, ApiError, TransportError } from "./api";

// Holds one immutable command while its outcome is unknown. A read failure
// after a successful command is handled by the caller, outside this boundary.
export function useCommandIntent<Packet extends object, Result>(confirmed: (value: unknown) => boolean) {
  const currentRef = useRef<{ url: string; packet: Packet } | null>(null);
  const sendingRef = useRef(false);
  const unresolvedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  async function transmit(intent: { url: string; packet: Packet }) {
    if (sendingRef.current) throw new Error("Aguarde a resposta da tentativa em andamento.");
    sendingRef.current = true;
    setBusy(true);
    currentRef.current = intent;
    try {
      const result = await api<Result>(intent.url, intent.packet);
      if (!confirmed(result)) throw new TransportError("A resposta não contém uma confirmação reconhecível. Recupere a mesma tentativa para verificar o resultado.", "command", "INVALID_CONFIRMATION", undefined);
      currentRef.current = null;
      unresolvedRef.current = false;
      setUncertain(false);
      return result;
    } catch (reason) {
      const unknown = unresolvedRef.current || !(reason instanceof ApiError) || reason.status === 0 || reason.status >= 500;
      setUncertain(unknown);
      const recovering = unresolvedRef.current;
      unresolvedRef.current = unknown;
      if (!unknown) currentRef.current = null;
      if (recovering) {
        const unavailable = new ApiError("Não foi possível recuperar a confirmação. O resultado da primeira tentativa continua incerto. Preserve a referência e consulte novamente quando o acesso estiver disponível.", 0, "RECOVERY_UNAVAILABLE");
        unavailable.cause = reason;
        throw unavailable;
      }
      throw reason;
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    uncertain,
    send(url: string, packet: Packet) {
      if (currentRef.current) return Promise.reject(new Error("Recupere a tentativa anterior antes de enviar outra alteração."));
      return transmit({ url, packet: structuredClone(packet) });
    },
    recover() {
      if (!currentRef.current) return Promise.reject(new Error("Nenhuma tentativa incerta para recuperar."));
      return transmit(currentRef.current);
    },
  };
}
