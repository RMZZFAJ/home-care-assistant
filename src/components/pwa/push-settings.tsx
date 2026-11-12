"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/client/api";
import { pushContextReference, pushDevice, pushDevices } from "@/lib/push/subscription";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { SettingsSection } from "@/components/forms/settings-section";
import { Icon } from "@/components/ui/primitives";
import { usePwa } from "./pwa-provider";

const receipt = z
  .object({
    devices: pushDevices,
    userId: z.uuid(),
    contextReference: pushContextReference,
    available: z.boolean(),
    deliveryEnabled: z.boolean(),
    publicKey: z.string().nullable(),
  })
  .strict();
function keyBytes(value: string): Uint8Array<ArrayBuffer> {
  const text = atob(
    value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "="),
  );
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}
async function currentFingerprint() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return null;
  return fingerprintOf(subscription.endpoint);
}
async function fingerprintOf(endpoint: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(endpoint),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export type PushSettingsSections = { consent: ReactNode; devices: ReactNode };
export function PushSettings({ renderSections }: { renderSections?: (sections: PushSettingsSections) => ReactNode } = {}) {
  const userId = useWorkspaceState().data?.userId;
  return userId ? <PersonalPushSettings key={userId} userId={userId} renderSections={renderSections} /> : null;
}
function PersonalPushSettings({ userId, renderSections }: { userId: string; renderSections?: (sections: PushSettingsSections) => ReactNode }) {
  const pwa = usePwa();
  const [data, setData] = useState<z.infer<typeof receipt> | null>(null);
  const [capable, setCapable] = useState<boolean | null>(null),
    [permission, setPermission] = useState<NotificationPermission>("default");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false),
    [reading, setReading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(0);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const generationRef = useRef(0),
    abortRef = useRef<AbortController | null>(null);
  const lifecycleRef = useRef<AbortController | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = ++generationRef.current;
    setReading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const lifecycle = signal ?? lifecycleRef.current?.signal;
    const cancel = () => controller.abort();
    lifecycle?.addEventListener("abort", cancel, { once: true });
    if (lifecycle?.aborted) controller.abort();
    const support =
      isSecureContext &&
      typeof Notification !== "undefined" &&
      typeof PushManager !== "undefined" &&
      !!navigator.serviceWorker;
    try {
      const next = receipt.parse(
        await api("/api/push/devices?context=consent", undefined, controller.signal),
      );
      if (next.userId !== userId) {
        if (generation === generationRef.current && !controller.signal.aborted) { setData(null); setFingerprint(null); }
        throw new Error("A conta ou sessão mudou. Atualize esta página antes de confirmar os avisos.");
      }
      const current = support ? await currentFingerprint() : null;
      if (generation !== generationRef.current || controller.signal.aborted)
        return;
      setCapable(support);
      if (support) setPermission(Notification.permission);
      setError("");
      setCheckedAt(Date.now());
      setData(next);
      setFingerprint(current);
    } catch (reason) {
      if (generation === generationRef.current && !controller.signal.aborted) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) { setData(null); setFingerprint(null); }
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível consultar seus aparelhos.",
        );
      }
    } finally {
      lifecycle?.removeEventListener("abort", cancel);
      if (generation === generationRef.current && !controller.signal.aborted)
        setReading(false);
    }
  }, [userId]);
  useEffect(() => {
    const lifecycle = new AbortController();
    lifecycleRef.current = lifecycle;
    queueMicrotask(() => {
      if (!lifecycle.signal.aborted) void load(lifecycle.signal);
    });
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    navigator.serviceWorker?.addEventListener("message", refresh);
    return () => {
      lifecycle.abort();
      window.removeEventListener("focus", refresh);
      navigator.serviceWorker?.removeEventListener("message", refresh);
    };
  }, [load]);
  const current = data?.devices.find(
    (device) => device.fingerprint === fingerprint,
  );
  const enrolled =
    current?.state === "active" && current.currentSession && current.enabled;
  async function enroll() {
    const registration = pwa.readyRegistration(), lifecycle = lifecycleRef.current?.signal;
    if (busy || reading || !data?.publicKey || !capable || permission === "denied" || !registration || !lifecycle || lifecycle.aborted) return;
    const alive = () => !lifecycle.aborted;
    // Permission request starts synchronously within the user's click gesture.
    const permissionPromise = Notification.permission === "granted"
      ? Promise.resolve("granted" as const) : Notification.requestPermission();
    setBusy(true); setError(""); setMessage("");
    try {
      const granted = await permissionPromise;
      if (!alive()) return;
      setPermission(granted);
      if (granted !== "granted") {
        setMessage("Permissão não concedida. Suas pendências continuam na central de notificações.");
        return;
      }
      if (pwa.readyRegistration() !== registration) throw new Error("A preparação do aplicativo mudou. Consulte o aplicativo neste aparelho antes de tentar novamente.");
      let subscription = await registration.pushManager.getSubscription();
      if (!alive()) return;
      const key = keyBytes(data.publicKey);
      if (subscription?.options.applicationServerKey && Array.from(new Uint8Array(subscription.options.applicationServerKey)).join() !== Array.from(key).join()) {
        await subscription.unsubscribe();
        if (!alive()) return;
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      if (!alive()) return;
      await api("/api/push/devices", {
        subscription: subscription.toJSON(), label: name.trim() || "Este aparelho", consent: true,
        contextReference: data.contextReference,
      }, lifecycle);
      if (!alive()) return;
      setMessage("Avisos vinculados a esta conta neste aparelho. Isso não confirma entrega, ciência ou recebimento físico.");
      await load();
    } catch (reason) {
      if (alive()) setError((reason instanceof Error ? reason.message : "Não foi possível confirmar a inscrição.") + " Consulte os aparelhos antes de tentar novamente.");
    } finally { if (alive()) setBusy(false); }
  }
  async function command(device: z.infer<typeof pushDevice>, action: "revoke" | "pause" | "resume") {
    const lifecycle = lifecycleRef.current?.signal;
    if (busy || reading || !data || !lifecycle || lifecycle.aborted) return;
    const alive = () => !lifecycle.aborted;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/push/devices", { id: device.id, action, contextReference: data.contextReference }, lifecycle, "PATCH");
      if (!alive()) return;
      if (action === "revoke" && device.fingerprint === fingerprint) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (!alive()) return;
        const subscription = await registration?.pushManager?.getSubscription();
        if (!alive()) return;
        const actualFingerprint = subscription ? await fingerprintOf(subscription.endpoint) : null;
        if (!alive()) return;
        if (subscription && actualFingerprint === device.fingerprint) {
          await subscription.unsubscribe();
          if (!alive()) return;
          const notifications = await registration?.getNotifications();
          if (!alive()) return;
          for (const notification of notifications ?? []) notification.close();
        }
      }
      setMessage(action === "revoke"
        ? "Avisos desativados para este aparelho. Mensagens já aceitas pelo serviço podem chegar; suas pendências internas permanecem."
        : action === "pause" ? "Avisos pausados por oito horas. Suas pendências internas permanecem."
        : "Pausa removida para os próximos avisos. Suas pendências internas permanecem.");
      await load();
    } catch (reason) {
      if (alive()) setError((reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração.") + " Consulte o estado atual antes de repetir.");
    } finally { if (alive()) setBusy(false); }
  }
  const feedback = <>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {reading ? <p role="status">Consultando aparelhos…</p> : null}
  </>;
  const consent = (
    <SettingsSection
      title="Avisos neste aparelho"
      summary="Permissão, privacidade e aparelhos da sua conta"
    >
      <p>
        Ative somente em aparelhos de uso autorizado. Avisos podem aparecer na
        tela bloqueada e terão conteúdo genérico, sem dados do paciente. Tocar
        um aviso exige acesso vigente no aplicativo.
      </p>
      <p>
        Desativar ou pausar avisos não remove pendências nem altera ciência,
        decisões ou recebimentos. Ao sair, esta sessão deixa de receber novos
        avisos.
      </p>
      {feedback}
      {capable === false ? (
        <p>
          Este navegador não oferece avisos neste modo. Continue usando a
          central de notificações. No iPhone, confira a disponibilidade no
          aplicativo adicionado à tela inicial.
        </p>
      ) : null}
      {permission === "denied" ? (
        <p>
          O navegador bloqueou os avisos. Para mudar essa escolha, consulte as
          permissões deste site nas configurações do navegador. Não faremos
          novos pedidos automaticamente.
        </p>
      ) : null}
      {data && !data.available ? (
        <p>
          Os avisos neste aparelho ainda não foram disponibilizados. Suas
          pendências continuam na central.
        </p>
      ) : null}
      {data?.available && !data.deliveryEnabled ? (
        <p>
          Inscrições podem ser preparadas, mas o envio externo de avisos ainda
          não foi disponibilizado. Consulte suas pendências diretamente no
          aplicativo.
        </p>
      ) : null}
      {data?.available && capable && !enrolled ? (
        <div className="space-y-3">
          <label className="ui-label">
            Nome do aparelho (opcional)
            <input
              className="ui-input"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Este aparelho"
            />
          </label>
          <button
            type="button"
            className="ui-button ui-button-primary"
            disabled={busy || reading || pwa.offline || permission === "denied" || pwa.worker !== "ready" || pwa.runtime !== "ready"}
            onClick={() => void enroll()}
          >
            {busy ? "Confirmando…" : "Ativar avisos neste aparelho"}
          </button>
          {pwa.worker !== "ready" || pwa.runtime !== "ready" ? <p role="status">Aguarde a preparação do aplicativo neste aparelho antes de ativar avisos. Consulte a seção Aplicativo neste aparelho para verificar ou recuperar essa preparação.</p> : null}
        </div>
      ) : null}
      <button type="button" className="ui-button ui-button-secondary" disabled={reading || busy || pwa.offline} onClick={() => void load()}>
        Consultar aparelhos novamente
      </button>
    </SettingsSection>
  );
  const devices = (
    <SettingsSection title="Aparelhos com avisos" summary="Inscrições da sua conta, pausas e desativação">
      {feedback}
      <button
        type="button"
        className="ui-button ui-button-secondary"
        disabled={reading || busy || pwa.offline}
        onClick={() => void load()}
      >
        Consultar aparelhos novamente
      </button>
      {data?.devices.length === 0 ? (
        <p>Nenhum aparelho vinculado a esta conta.</p>
      ) : null}
      <ul className="hca-profile-devices">
        {data?.devices.map((device) => {
          const paused =
            device.mutedUntil && Date.parse(device.mutedUntil) > checkedAt;
          return (
            <li key={device.id} className="hca-profile-device">
              <Icon name="phone" />
              <div>
              <h3>
                <span>{device.label}</span>
                {device.fingerprint === fingerprint ? " · Este aparelho" : ""}
              </h3>
              <p>
                {device.state === "revoked"
                  ? "Desativado"
                  : device.state === "expired"
                    ? "Inscrição expirada ou sessão encerrada"
                    : paused
                      ? "Pausado por preferência"
                      : "Ativo"}
              </p>
              {device.fingerprint === fingerprint &&
              !device.currentSession &&
              device.state === "active" ? (
                <p>
                  Confirme a ativação para vincular este aparelho à sessão
                  atual.
                </p>
              ) : null}
              </div>
              {device.state === "active" ? (
                <div className="hca-profile-device-actions">
                  <button
                    type="button"
                    className="ui-button ui-button-secondary"
                    disabled={busy || pwa.offline}
                    onClick={() =>
                      void command(device, paused ? "resume" : "pause")
                    }
                  >
                    {paused ? "Remover pausa" : "Pausar por oito horas"}
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button-secondary"
                    disabled={busy || pwa.offline}
                    onClick={() => void command(device, "revoke")}
                  >
                    Desativar avisos de {device.label}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
  return renderSections ? renderSections({ consent, devices }) : <>{consent}{devices}</>;
}
