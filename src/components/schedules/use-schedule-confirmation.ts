"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import {
  clearSchedulePending,
  parseScheduleConfirmation,
  parseSchedulePending,
  saveSchedulePending,
  schedulePendingKey,
  type ScheduleConfirmation,
  type SchedulePacket,
} from "@/lib/schedules/confirmation";

/** Only an explicit retry may send the original packet. Reading/reloading never replays it. */
export function useScheduleConfirmation(userId: string, patientId: string) {
  const [pending, setPending] = useState<SchedulePacket | null>(null);
  const [receipt, setReceipt] = useState<ScheduleConfirmation | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notFound, setNotFound] = useState(false),
    [readDenied, setReadDenied] = useState(false);
  const inFlightRef = useRef(false);
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      try {
        setPending(
          parseSchedulePending(
            sessionStorage.getItem(schedulePendingKey(userId, patientId)),
            userId,
            patientId,
          ),
        );
        setReady(true);
      } catch {
        setError(
          "Não foi possível recuperar a referência de escala deste aparelho. Nenhuma ação foi enviada; o conteúdo local foi preservado.",
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [userId, patientId]);
  async function lookup(packet: SchedulePacket) {
    return parseScheduleConfirmation(
      await api(
        "/api/schedules/confirmation?" +
          new URLSearchParams({
            careRecipientId: patientId,
            idempotencyKey: packet.idempotencyKey,
          }),
      ),
      userId,
      packet,
    );
  }
  function finish(result: ScheduleConfirmation, packet: SchedulePacket) {
    clearSchedulePending(sessionStorage, userId, packet);
    setPending(null);
    setNotFound(false);
    setReadDenied(false);
    setReceipt(result);
    return result;
  }
  async function execute(
    packet: SchedulePacket,
    send: boolean,
    first: boolean,
  ) {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (send) {
        saveSchedulePending(sessionStorage, userId, packet);
        setPending(packet);
        setNotFound(false);
        setReceipt(null);
        try {
          await api("/api/schedules", packet);
        } catch (reason) {
          // An explicit rejection can still be an obsolete proposal recorded by the native command.
          // A prior uncertain attempt is retained even if a later POST now loses authorization.
          if (
            first &&
            reason instanceof ApiError &&
            [400, 401, 403, 404, 409, 422].includes(reason.status)
          ) {
            const known = await lookup(packet);
            if (known.found) return finish(known, packet);
            clearSchedulePending(sessionStorage, userId, packet);
            setPending(null);
          }
          throw reason;
        }
      } else {
        // Do not clear or replay a different envelope that appeared since rendering.
        saveSchedulePending(sessionStorage, userId, packet);
      }
      const result = await lookup(packet);
      if (result.found) return finish(result, packet);
      setReadDenied(false);
      setNotFound(true);
      setError(
        "A consulta não encontrou a confirmação. Isso não prova que a tentativa anterior falhou. Você pode reenviar explicitamente a mesma tentativa, sem trocar seus dados ou sua chave.",
      );
      return null;
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        [401, 403, 404].includes(reason.status)
      ) {
        setReadDenied(true);
        setReceipt(null);
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível conferir a escala. A mesma tentativa foi preservada.",
      );
      throw reason;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }
  const submit = (packet: SchedulePacket) => execute(packet, true, true);
  const recover = () =>
    pending ? execute(pending, false, false) : Promise.resolve(null);
  const retry = () =>
    pending && notFound && !readDenied
      ? execute(pending, true, false)
      : Promise.resolve(null);
  return {
    pending,
    receipt,
    ready,
    busy,
    error,
    notFound,
    readDenied,
    submit,
    recover,
    retry,
  };
}
export type ScheduleRecovery = ReturnType<typeof useScheduleConfirmation>;
