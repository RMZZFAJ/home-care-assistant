import { z } from "zod";

export const initialNoticeResponse = z.object({
  data: z.array(z.object({ state: z.enum(["pending", "processing", "accepted", "delivered", "read", "sent", "failed", "cancelled", "uncertain"]) })),
  waitSeconds: z.number().int().min(0).max(10),
});
export type InitialNoticeState = { kind: "pending"; count: number } | { kind: "checking" | "settled" | "elapsed" | "manual" | "unavailable" };

/** This window owns only its notice reads, never an issuance or upload. */
export function startInitialNoticeTracking(read: (signal: AbortSignal) => Promise<unknown>, publish: (state: InitialNoticeState) => void) {
  const controller = new AbortController(), started = Date.now();
  let stopped = false;
  let poll: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined;
  function stop() { stopped = true; clearTimeout(poll); clearTimeout(deadline); controller.abort(); }
  function finish(state: InitialNoticeState) { if (stopped) return; stop(); publish(state); }
  async function observe() {
    try {
      const response = await read(controller.signal);
      if (stopped) return;
      const result = initialNoticeResponse.safeParse(response);
      if (!result.success) { finish({ kind: "unavailable" }); return; }
      const pending = result.data.data.filter(row => ["pending", "processing", "uncertain"].includes(row.state)).length;
      if (!pending) { finish({ kind: "settled" }); return; }
      if (!result.data.waitSeconds) { finish({ kind: "manual" }); return; }
      const remaining = result.data.waitSeconds * 1000 - (Date.now() - started);
      if (remaining <= 0) { finish({ kind: "elapsed" }); return; }
      publish({ kind: "pending", count: pending });
      clearTimeout(deadline);
      deadline = setTimeout(() => finish({ kind: "elapsed" }), remaining);
      poll = setTimeout(() => void observe(), 1800);
    } catch { if (!stopped) finish({ kind: "unavailable" }); }
  }
  void observe();
  return stop;
}

export function initialNoticeMessage(state: InitialNoticeState) {
  switch (state.kind) {
    case "checking": return "Documento salvo. Consultando os avisos iniciais…";
    case "pending": return `Documento salvo · ${state.count} aviso(s) aguardando resultado.`;
    case "settled": return "Documento salvo. Consulte os estados individuais dos avisos abaixo.";
    case "manual": return "Documento salvo. Acompanhamento automático desativado; consulte os estados individuais.";
    case "elapsed": return "Documento salvo. Acompanhamento inicial encerrado; consulte os estados atuais dos avisos.";
    case "unavailable": return "Documento salvo. Não foi possível acompanhar os avisos agora. Consulte o acompanhamento.";
  }
}
