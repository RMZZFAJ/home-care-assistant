"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/client/api";
import { pushContextReference, pushDeviceReceipt, pushDevices } from "@/lib/push/subscription";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { SettingsSection } from "@/components/forms/settings-section";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { PersonalPushTest } from "./personal-push-test";
import { DeviceCard, DevicePanel, PushPanel, pushStatusLabel, type DeviceAction, type PushDevice, type PushStatus } from "./push-device-panels";
import { usePwa } from "./pwa-provider";

const path = "/api/push/devices";
const devicesRead = z.object({
  devices: pushDevices,
  userId: z.uuid(),
  contextReference: pushContextReference,
  available: z.boolean(),
  deliveryEnabled: z.boolean(),
  publicKey: z.string().nullable(),
}).strict();
type DeviceRead = z.infer<typeof devicesRead>;
type Change = z.infer<typeof pushDeviceReceipt>;
type Attempt = { key: string; action: Change["action"]; id?: string; checks: number; cause?: unknown };
type View = { kind: "push" } | { kind: "device"; id: string; source: "devices" | "notices"; thisBrowser: boolean };
type Confirmation = { action: "enroll" } | { action: DeviceAction; device: PushDevice; label?: string };

const words: Record<Change["action"], { title: string; explanation: string; button: string; success: string; result: string }> = {
  enroll: {
    title: "Ativar avisos neste aparelho?", explanation: "O navegador poderá pedir permissão. A inscrição será vinculada a esta conta e à sessão atual.",
    button: "Continuar ativação", success: "Inscrição confirmada", result: "Os avisos foram vinculados a esta conta e sessão neste aparelho.",
  },
  rename: {
    title: "Alterar o nome do aparelho", explanation: "O novo nome identifica este aparelho na lista da sua conta.",
    button: "Salvar nome", success: "Nome do aparelho atualizado", result: "O novo nome está registrado na sua lista de aparelhos.",
  },
  pause: {
    title: "Pausar avisos por 8 horas?", explanation: "Os avisos deste aparelho ficam pausados por oito horas. As tarefas e os avisos internos continuam disponíveis.",
    button: "Pausar por 8 horas", success: "Avisos pausados", result: "Você pode retomar os avisos antes do fim da pausa.",
  },
  resume: {
    title: "Retomar os avisos?", explanation: "Os próximos eventos poderão gerar avisos neste aparelho.",
    button: "Retomar avisos", success: "Avisos retomados", result: "A pausa foi removida para os próximos avisos.",
  },
  revoke: {
    title: "Revogar esta inscrição?", explanation: "A inscrição deixa de receber novos avisos. Uma mensagem já aceita pelo serviço ainda pode chegar. Suas tarefas e ciências permanecem.",
    button: "Revogar inscrição", success: "Inscrição revogada", result: "A inscrição foi revogada. A central do sistema continua disponível.",
  },
};

function keyBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

async function fingerprintOf(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function nativeSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return { registration, subscription: await registration?.pushManager?.getSubscription() };
}

function confirmedChange(value: unknown, attempt: Attempt) {
  const result = pushDeviceReceipt.parse(value);
  if (result.action !== attempt.action || attempt.id && attempt.id !== result.id)
    throw new Error("O comprovante recebido não corresponde ao aparelho ou à ação.");
  return result;
}

function errorText(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

type Sections = { consent: (visible: boolean) => ReactNode; devices: (visible: boolean) => ReactNode };
type RenderSections = (sections: Sections) => ReactNode;
export function PushSettings({ renderSections }: { renderSections: RenderSections }) {
  const userId = useWorkspaceState().data?.userId;
  const [ownerId, setOwnerId] = useState(userId ?? null);
  if (userId && ownerId !== userId) setOwnerId(userId);
  const owner = userId ?? ownerId;
  return owner ? <PersonalPushSettings key={owner} userId={owner} active={userId === owner} renderSections={renderSections} /> : null;
}

function PersonalPushSettings({ userId, active, renderSections }: { userId: string; active: boolean; renderSections: RenderSections }) {
  const pwa = usePwa();
  const [data, setData] = useState<DeviceRead>();
  const [capable, setCapable] = useState<boolean>();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [lastFingerprint, setLastFingerprint] = useState<string>();
  const [checkedAt, setCheckedAt] = useState(0);
  const [reading, setReading] = useState(true);
  const [readError, setReadError] = useState("");
  const [view, setView] = useState<View>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [accepted, setAccepted] = useState(false);
  const [enrollmentName, setEnrollmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Attempt>();
  const [feedback, setFeedback] = useState<{ action: Change["action"]; details?: string; uncertain?: false; success?: boolean; cause?: unknown } | { uncertain: true }>();
  const generationRef = useRef(0);
  const readControllerRef = useRef<AbortController | null>(null);
  const lifecycleRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const pushTriggerRef = useRef<HTMLButtonElement>(null);
  const deviceTriggerRef = useRef<HTMLButtonElement>(null);
  const focusPendingRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    readControllerRef.current?.abort();
    const lifecycle = lifecycleRef.current?.signal;
    if (!active || !lifecycle || lifecycle.aborted) return;
    const controller = new AbortController();
    readControllerRef.current = controller;
    const cancel = () => controller.abort();
    lifecycle.addEventListener("abort", cancel, { once: true });
    setReading(true);
    const support = isSecureContext && typeof Notification !== "undefined" &&
      typeof PushManager !== "undefined" && Boolean(navigator.serviceWorker);
    try {
      const next = devicesRead.parse(await api(path + "?context=consent", undefined, controller.signal));
      const alive = () => generation === generationRef.current && !controller.signal.aborted;
      if (!alive()) return;
      if (next.userId !== userId) {
        setData(undefined);
        setFingerprint(null);
        setLastFingerprint(undefined);
        throw new ApiError("A conta ou sessão mudou. Atualize a página e confirme novamente.", 403, "SESSION_EXPIRED");
      }
      const native = support ? (await nativeSubscription()).subscription : null;
      const fp = native ? await fingerprintOf(native.endpoint) : null;
      if (!alive()) return;
      setCapable(support);
      if (support) setPermission(Notification.permission);
      setReadError("");
      setCheckedAt(Date.now());
      setData(next);
      setFingerprint(fp);
      if (fp) setLastFingerprint(fp);
      return { data: next, fingerprint: fp };
    } catch (reason) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
        setData(undefined);
        setFingerprint(null);
        setLastFingerprint(undefined);
      }
      setReadError(errorText(reason, "Não foi possível consultar os aparelhos agora."));
    } finally {
      lifecycle.removeEventListener("abort", cancel);
      if (generation === generationRef.current && !controller.signal.aborted) setReading(false);
    }
  }, [active, userId]);

  useEffect(() => {
    const lifecycle = new AbortController();
    lifecycleRef.current = lifecycle;
    const refresh = () => { if (!lifecycle.signal.aborted) void load(); };
    queueMicrotask(refresh);
    window.addEventListener("focus", refresh);
    navigator.serviceWorker?.addEventListener("message", refresh);
    return () => {
      lifecycle.abort();
      window.removeEventListener("focus", refresh);
      navigator.serviceWorker?.removeEventListener("message", refresh);
    };
  }, [load]);

  useEffect(() => {
    const next = data?.devices.flatMap(device => device.mutedUntil ? [Date.parse(device.mutedUntil)] : [])
      .filter(until => until > checkedAt);
    if (!next?.length) return;
    const timer = setTimeout(() => setCheckedAt(Date.now()), Math.max(1, Math.min(...next) - Date.now() + 20));
    return () => clearTimeout(timer);
  }, [data, checkedAt]);

  const current = data?.devices.find(device => device.fingerprint === fingerprint);
  const selected = view?.kind === "device" ? data?.devices.find(device => device.id === view.id) : undefined;
  const isPaused = (device?: PushDevice) => Boolean(device?.mutedUntil && Date.parse(device.mutedUntil) > checkedAt && device.state === "active");
  const enrolled = current?.state === "active" && current.currentSession && current.enabled;
  const unavailable = Boolean(readError || !data?.available);
  const canAct = Boolean(active && data && !reading && !readError && !pwa.offline && !busy && !pending);
  const canEnroll = canAct && Boolean(data?.available && capable && permission !== "denied") &&
    pwa.worker === "ready" && pwa.runtime === "ready";
  const status: PushStatus = reading && !data ? "loading"
    : capable === false ? "unsupported"
    : permission === "denied" ? "blocked"
    : pending?.action === "enroll" ? "unconfirmed"
    : unavailable ? "unavailable"
    : enrolled && permission === "granted" ? isPaused(current) ? "paused" : data?.deliveryEnabled ? "active" : "prepared"
    : permission === "granted" ? "unconfirmed"
    : "inactive";

  function closeView() {
    if (view?.kind === "device" && view.source === "notices") setView({ kind: "push" });
    else setView(undefined);
  }

  function goToDevices() {
    const url = new URL(window.location.href);
    url.searchParams.set("profileTab", "devices");
    setView(undefined);
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    void load();
  }

  function askEnrollment() {
    if (!canEnroll) return;
    setEnrollmentName(current?.label ?? "");
    setAccepted(false);
    setConfirmation({ action: "enroll" });
  }

  async function settle(change: Change, signal: AbortSignal) {
    let detail = words[change.action].result;
    setPending(undefined);
    const refreshed = await load();
    if (signal.aborted) return;
    const revoked = refreshed?.data.devices.find(device => device.id === change.id);
    if (change.action === "revoke" && revoked?.state === "revoked" && revoked.currentSession && revoked.fingerprint === refreshed?.fingerprint) {
      try {
        const { registration, subscription } = await nativeSubscription();
        if (!signal.aborted && subscription && await fingerprintOf(subscription.endpoint) === revoked.fingerprint) {
          await subscription.unsubscribe();
          for (const notification of await registration?.getNotifications() ?? []) notification.close();
          await load();
        }
      } catch {
        detail = "A revogação no sistema foi confirmada. Confira a permissão do navegador caso o aparelho ainda mostre avisos.";
      }
    }
    if (!signal.aborted) setFeedback({ action: change.action, details: detail, success: true });
  }

  function fail(attempt: Attempt, cause: unknown, requested: boolean) {
    if (!requested || cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && ![408, 429].includes(cause.status)) {
      setFeedback({ action: attempt.action, cause, details: errorText(cause, "A ação não foi concluída. Confira o aparelho antes de continuar.") });
      void load();
    } else {
      setPending({ ...attempt, cause });
      setFeedback({ uncertain: true });
    }
  }

  async function confirmAction(choice = confirmation) {
    const signal = lifecycleRef.current?.signal;
    if (!active || !data || !choice || !canAct || !signal || signal.aborted || busyRef.current) return;
    const action = choice.action;
    const registration = action === "enroll" ? pwa.readyRegistration() : null;
    if (action === "enroll" && (!accepted || !registration || !data.publicKey || !capable || Notification.permission === "denied")) return;
    const attempt: Attempt = { action, key: crypto.randomUUID(), checks: 0, id: "device" in choice ? choice.device.id : undefined };
    const contextReference = data.contextReference;
    let requested = false;
    busyRef.current = true;
    setBusy(true);
    setConfirmation(undefined);
    try {
      let response: { data: unknown };
      if (choice.action === "enroll" && registration && data.publicKey) {
        const granted = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (signal.aborted) return;
        setPermission(granted);
        if (granted !== "granted") return;
        if (pwa.readyRegistration() !== registration) throw new ApiError("A preparação do aplicativo mudou. Confira o aplicativo antes de ativar os avisos.", 400, "CLIENT_RUNTIME_BLOCKED");
        let subscription = await registration.pushManager.getSubscription();
        const key = keyBytes(data.publicKey);
        if (subscription?.options.applicationServerKey &&
          new Uint8Array(subscription.options.applicationServerKey).join() !== key.join()) {
          await subscription.unsubscribe();
          subscription = null;
        }
        if (signal.aborted) return;
        subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        if (signal.aborted) return;
        requested = true;
        response = await api(path, {
          subscription: subscription.toJSON(), label: enrollmentName.trim() || "Este aparelho",
          consent: true, contextReference, idempotencyKey: attempt.key,
        }, signal);
      } else if ("device" in choice) {
        requested = true;
        response = await api(path, {
          id: choice.device.id, action, contextReference,
          expectedVersion: choice.device.updatedAt, idempotencyKey: attempt.key,
          ...(action === "rename" ? { label: choice.label } : {}),
        }, signal, "PATCH");
      } else return;
      if (!signal.aborted) await settle(confirmedChange(response.data, attempt), signal);
    } catch (cause) {
      if (!signal.aborted) fail(attempt, cause, requested);
    } finally {
      busyRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  async function recover() {
    const signal = lifecycleRef.current?.signal;
    if (!active || !pending || !signal || signal.aborted || pwa.offline || busyRef.current || pending.checks >= operationRecoveryLimit) return;
    busyRef.current = true;
    const next = { ...pending, checks: pending.checks + 1 };
    setPending(next);
    setBusy(true);
    try {
      const response = await api<{ data: unknown }>(path + "?attempt=" + next.key, undefined, signal);
      if (signal.aborted) return;
      if (response.data !== null) await settle(confirmedChange(response.data, next), signal);
    } catch (cause) {
      if (!signal.aborted) setPending({ ...next, cause });
    } finally {
      busyRef.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  const showAttempt = <ActionButton ref={focusPendingRef} onClick={() => setFeedback({ uncertain: true })}><Icon name="refresh" />Conferir alteração dos avisos</ActionButton>;
  const closeFeedback = () => setFeedback(undefined);
  const exhausted = Boolean(pending && pending.checks >= operationRecoveryLimit);
  function closeRecovery() {
    closeFeedback();
    if (exhausted) {
      setPending(undefined);
      void load();
    }
  }
  const feedbackDialog = busy ? <Dialog open title="Conferindo os avisos" headingIcon="clock" closeDisabled onClose={() => {}}>
    <p role="status">Aguarde a confirmação do aparelho.</p>
  </Dialog> : feedback?.uncertain && pending ? <DocumentOperationFailureDialog
    title="O resultado dos avisos ainda não foi confirmado"
    description="Consulte a mesma tentativa para verificar se o aparelho foi alterado."
    outcome="uncertain" operation={words[pending.action].title} fallbackCode="PUSH_DEVICE_UNCONFIRMED"
    cause={pending.cause} attempts={pending.checks} attemptReference={pending.key}
    exhaustedMessage={exhausted ? "Copie os detalhes e avise o responsável pelo sistema." : undefined}
    action={!pwa.offline && !exhausted ? { label: "Conferir resultado", onClick: () => void recover() } : undefined}
    onClose={closeRecovery} closeLabel={exhausted ? "Fechar e atualizar aparelhos" : "Voltar"} finalFocus={focusPendingRef}
  /> : feedback && "action" in feedback ? feedback.success
    ? <Dialog open title={words[feedback.action].success} subtitle={feedback.details} success onClose={closeFeedback}
      footer={<ActionButton variant="primary" onClick={closeFeedback}>Concluir</ActionButton>}>{null}</Dialog>
    : <DocumentOperationFailureDialog title="Não foi possível concluir a alteração dos avisos"
      description={feedback.details ?? "Confira novamente a situação do aparelho."} outcome="rejected"
      operation={words[feedback.action].title} fallbackCode="PUSH_DEVICE_REJECTED" cause={feedback.cause}
      attempts={0} onClose={closeFeedback} closeLabel="Voltar" />
    : null;
  const confirmDialog = confirmation ? <Dialog open title={words[confirmation.action].title} kicker="Avisos e aplicativo"
    subtitle={words[confirmation.action].explanation} headingIcon="bell" onClose={() => setConfirmation(undefined)}
    footer={<>
      <ActionButton onClick={() => setConfirmation(undefined)}>Agora não</ActionButton>
      <ActionButton variant={confirmation.action === "revoke" ? "danger" : "primary"}
        disabled={!canAct || confirmation.action === "enroll" && !accepted} onClick={() => void confirmAction()}>
        {words[confirmation.action].button}
      </ActionButton>
    </>}>
    {confirmation.action === "enroll" ? <div className="hca-push-confirm-fields">
      <FormField label="Nome do aparelho (opcional)">
        <TextInput value={enrollmentName} maxLength={80} placeholder="Este aparelho" onChange={event => setEnrollmentName(event.target.value)} />
      </FormField>
      <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> Quero receber avisos do Home Care Assistant neste aparelho.</label>
      <p>A tela bloqueada recebe avisos genéricos. Abrir um aviso exige acesso vigente.</p>
    </div> : "device" in confirmation ? <p>{confirmation.device.label}</p> : null}
  </Dialog> : null;

  const renderView = (source: "notices" | "devices") => {
    if (!active) return null;
    const viewSource = view?.kind === "device" ? view.source : "notices";
    if (view ? viewSource !== source : source !== "devices") return null;
    const panel = view?.kind === "push"
      ? <PushPanel status={status} activationAvailable={!pending && Boolean(data?.available)} readError={readError}
        pausedUntil={current?.mutedUntil ?? undefined} disabled={reading || busy || pwa.offline ||
          (status === "inactive" || status === "unconfirmed" && !pending) && !canEnroll}
        needsPreparation={pwa.worker !== "ready" || pwa.runtime !== "ready"}
        recovery={pending && pending.action !== "enroll" ? showAttempt : undefined}
        onClose={closeView} finalFocus={pushTriggerRef} onConfirm={askEnrollment}
        onRead={() => pending ? setFeedback({ uncertain: true }) : void load()}
        onOpenTest={() => { if (current) setView({ kind: "device", id: current.id, source: "notices", thisBrowser: true }); }}
        onDevices={goToDevices} />
      : view?.kind === "device" && selected
        ? <DevicePanel device={selected} current={view.thisBrowser} paused={isPaused(selected)}
          readyForRename={selected.currentSession} busy={!canAct} canReactivate={canEnroll} onClose={closeView}
          recovery={pending ? showAttempt : undefined}
          finalFocus={source === "notices" ? pushTriggerRef : deviceTriggerRef}
          onAction={(action, label) => {
            const choice = { action, device: selected, label };
            if (action === "rename") void confirmAction(choice);
            else setConfirmation(choice);
          }}
          onReactivate={() => { if (canEnroll) askEnrollment(); }}
          test={view.thisBrowser ? <PersonalPushTest key={selected.id} deviceId={selected.id}
            shown={Boolean(selected.state === "active" && selected.currentSession && selected.enabled && !isPaused(selected))}
            contextReference={data?.contextReference}
            eligible={Boolean(canAct && enrolled && current?.id === selected.id && !isPaused(selected) && permission === "granted" && data?.deliveryEnabled && pwa.pushTestReady)}
            active offline={pwa.offline} readyRegistration={pwa.readyRegistration} refreshDevice={() => { void load(); }} /> : undefined}
        /> : null;
    return <>{panel}{confirmDialog}{feedbackDialog}</>;
  };

  const consent = (visible: boolean) => active && <section aria-label="Avisos neste aparelho">
    <button type="button" className="hca-push-entry" ref={pushTriggerRef} onClick={() => setView({ kind: "push" })}>
      <span className="hca-push-glyph"><Icon name="bell" /></span>
      <span><strong>Avisos do aplicativo</strong><small>{pushStatusLabel(status)}</small></span>
      <Icon name="chevron" />
    </button>
    {visible && pending && !view ? showAttempt : null}
    {visible ? renderView("notices") : null}
  </section>;

  const devices = (visible: boolean) => active && <SettingsSection title="Aparelhos com avisos" summary="Gerencie os aparelhos que recebem os avisos da sua conta.">
    {readError ? <p role="alert">{readError}</p> : null}
    {reading ? <p role="status">Consultando aparelhos…</p> : null}
    {visible && pending && !view ? showAttempt : null}
    {data?.devices.length === 0 ? <p>Nenhum aparelho vinculado a esta conta.</p> : null}
    {data?.devices.length ? <ul className="hca-push-device-list">
      {[...data.devices].sort((first, second) => Number(second.id === current?.id) - Number(first.id === current?.id)).map(device => {
        const thisBrowser = device.fingerprint === fingerprint ||
          device.fingerprint === lastFingerprint && device.currentSession && device.state !== "active";
        return <li key={device.id}><DeviceCard device={device} current={thisBrowser} paused={isPaused(device)} onClick={button => {
          deviceTriggerRef.current = button;
          setView({ kind: "device", id: device.id, source: "devices", thisBrowser });
        }} /></li>;
      })}
    </ul> : null}
    <p><Icon name="shield" width={16} height={16} /> Pausar os avisos mantém suas tarefas e os registros de ciência.</p>
    <ActionButton compact disabled={reading || pwa.offline} onClick={() => void load()}><Icon name="refresh" />Atualizar dispositivos</ActionButton>
    {visible ? renderView("devices") : null}
  </SettingsSection>;

  return renderSections({ consent, devices });
}
