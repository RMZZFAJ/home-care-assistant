"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/client/api";
import { useWorkspaceState } from "@/components/layout/workspace-context";

const receipt = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unavailable") }).strict(),
  z
    .object({
      state: z.literal("available"),
      careRecipientId: z.string().uuid(),
      careRecipientLabel: z.string().max(1000),
      href: z
        .string()
        .refine(
          (value) =>
            value.startsWith("/") &&
            !value.startsWith("//") &&
            !value.includes("\\"),
        ),
    })
    .strict(),
]);
export function PushArrival() {
  const id = useSearchParams().get("push"),
    userId = useWorkspaceState().data?.userId;
  return id && userId ? <Arrival key={`${userId}:${id}`} id={id} /> : null;
}
function Arrival({ id }: { id: string }) {
  const workspace = useWorkspaceState();
  const [data, setData] = useState<z.infer<typeof receipt> | null>(null);
  const [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setData(null);
      setError("");
      if (!z.string().uuid().safeParse(id).success) {
        setData({ state: "unavailable" });
        return;
      }
      try {
        const result = receipt.parse(
          await api(
            "/api/push/open?id=" + encodeURIComponent(id),
            undefined,
            controller.signal,
          ),
        );
        if (!controller.signal.aborted) setData(result);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar o destino deste aviso.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [id, attempt]);
  const correctContext =
    data?.state === "available" &&
    workspace.data?.activeContext?.mode === "patient" &&
    workspace.data.activeContext.care_recipient_id === data.careRecipientId;
  return (
    <section className="ui-card" aria-label="Aviso aberto neste aparelho">
      <h2>Destino do aviso</h2>
      <p>
        Abrir um aviso não confirma ciência, decisão ou recebimento físico. A
        situação atual será consultada no destino.
      </p>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="ui-button ui-button-secondary"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Consultar destino novamente
          </button>
        </p>
      ) : null}
      {!data && !error ? (
        <p role="status">Consultando destino autorizado…</p>
      ) : null}
      {data?.state === "unavailable" ? (
        <p>
          Este aviso não está disponível para esta conta ou referência. Consulte
          suas notificações atuais.
        </p>
      ) : null}
      {data?.state === "available" && !correctContext ? (
        <>
          <p>
            Selecione seu vínculo com {data.careRecipientLabel} para abrir este
            destino.
          </p>
          <button
            type="button"
            className="ui-button ui-button-secondary"
            disabled={workspace.selecting}
            onClick={() => void workspace.selectProfile(data.careRecipientId)}
          >
            Selecionar vínculo com {data.careRecipientLabel}
          </button>
        </>
      ) : null}
      {data?.state === "available" && correctContext ? (
        <Link className="ui-button ui-button-primary" href={data.href}>
          Abrir destino do aviso
        </Link>
      ) : null}
    </section>
  );
}
