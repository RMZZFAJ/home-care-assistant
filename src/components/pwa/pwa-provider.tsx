"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import contract from "@/lib/pwa/contract.json";
import { setRuntimeCommandsAvailable } from "@/lib/client/api";
import { claimTabUpdate, observeTabCommands, subscribeTabCommands, tabCommandCount } from "@/lib/client/tab-commands";
import { activeWorker, activateWorkerUpdate, workerContract, workerFailure, workerSupports, type WorkerPhase } from "@/lib/pwa/worker";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { PwaPanels, preparationDetail, type PwaPanel } from "./pwa-panels";

type Runtime = "checking" | "ready" | "unavailable" | "incompatible";
type WorkerState = "checking" | "ready" | "unavailable" | "error";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export type PwaState = {
  blocked: boolean;
  notices: ReactNode;
  runtime: Runtime;
  offline: boolean;
  worker: WorkerState;
  workerPhase: WorkerPhase;
  workerIssue: string;
  waiting: boolean;
  installed: boolean;
  canInstall: boolean;
  installing: boolean;
  updating: boolean;
  pushTestReady: boolean;
  checkedAt: number | null;
  checkingUpdates: boolean;
  updated: boolean;
  revision: string;
  openPanel: (panel: PwaPanel, trigger?: HTMLButtonElement) => void;
  install: () => Promise<void>;
  checkUpdates: () => Promise<void>;
  requestUpdate: () => void;
  refresh: () => Promise<void>;
  retryWorker: () => Promise<void>;
  readyRegistration: () => ServiceWorkerRegistration | null;
  previewInstallUrl: string | null;
};
type Feedback = { title: string; text: string; outcome?: "success" | "rejected" | "uncertain" };
const Context = createContext<PwaState | null>(null);
const noServerCommands = () => 0;
export function usePwa() {
  const value = use(Context);
  if (!value) throw new Error("PWA settings require their provider");
  return value;
}
export function PwaProvider({ children, previewOrigin = null }: { children: ReactNode; previewOrigin?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage =
    ["/login", "/recuperar-senha", "/convites/aceitar"].includes(pathname) ||
    pathname === "/verificar" ||
    pathname.startsWith("/verificar/");
  const [runtime, setRuntime] = useState<Runtime>("checking"),
    [offline, setOffline] = useState(false);
  const [origin, setOrigin] = useState("");
  useLayoutEffect(() => {
    setRuntimeCommandsAvailable(
      publicPage || (!offline && runtime === "ready"),
    );
    return () => setRuntimeCommandsAvailable(undefined);
  }, [publicPage, offline, runtime]);
  const [worker, setWorker] = useState<WorkerState>("checking"),
    [waiting, setWaiting] = useState(false);
  const [workerPhase, setWorkerPhase] = useState<WorkerPhase>("registering"),
    [workerIssue, setWorkerIssue] = useState(""),
    [preparationAttempt, setPreparationAttempt] = useState(0);
  const [installed, setInstalled] = useState(false),
    [canInstall, setCanInstall] = useState(false),
    [installing, setInstalling] = useState(false);
  const [revision, setRevision] = useState(""),
    [checkingUpdates, setCheckingUpdates] = useState(false),
    [checkedAt, setCheckedAt] = useState<number | null>(null),
    [updated, setUpdated] = useState(false);
  const [panel, setPanel] = useState<PwaPanel | null>(null);
  const panelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [incompatibilityDismissed, setIncompatibilityDismissed] = useState(false);
  const [sendCheck, setSendCheck] = useState<Awaited<ReturnType<typeof observeTabCommands>> | null>(null);
  const [checkingSend, setCheckingSend] = useState(false);
  const sendCount = useSyncExternalStore(subscribeTabCommands, tabCommandCount, noServerCommands);
  const checkingSendRef = useRef(false);
  const preparationRequestedRef = useRef(false);
  const sendReviewRef = useRef(0);
  const installationConfirmedRef = useRef(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false),
    [updating, setUpdating] = useState(false);
  const [tabNeedsReload, setTabNeedsReload] = useState(false);
  const [pushTestReady, setPushTestReady] = useState(false);
  const tabRevisionRef = useRef<string | null>(null);
  const updateReceiptRef = useRef<{ revision: string; at: number } | null>(null);
  const updateBusyRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null),
    promptRef = useRef<InstallPrompt | null>(null);
  const readyRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const readyWorkerRef = useRef<ServiceWorker | null>(null);
  const sequenceRef = useRef(0),
    requestRef = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => {
    sequenceRef.current++;
    requestRef.current?.abort();
  }, []);
  const refresh = useCallback(async (revalidateAccess = true) => {
    if (!navigator.onLine) return;
    requestRef.current?.abort();
    const controller = new AbortController(),
      own = ++sequenceRef.current;
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setIncompatibilityDismissed(false);
    setRuntime("checking");
    try {
      const response = await fetch("/api/runtime", {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json();
      if (own !== sequenceRef.current) return;
      if (body.state === "incompatible" || response.ok && body.state === "ready" &&
        (body.protocol !== contract.protocol || body.schema !== contract.schema)) {
        setRuntime("incompatible");
      } else if (response.ok && body.state === "ready") {
        if (revalidateAccess) {
          const reads: Promise<void>[] = [];
          window.dispatchEvent(new CustomEvent("hca:revalidate-access", {
            detail: { signal: controller.signal, waitFor: (read: Promise<void>) => reads.push(read) },
          }));
          await Promise.all(reads);
          if (own !== sequenceRef.current) return;
          if (controller.signal.aborted) {
            setRuntime("unavailable");
            return;
          }
        }
        setRuntime("ready");
      } else {
        setRuntime("unavailable");
      }
    } catch {
      if (own === sequenceRef.current) setRuntime("unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }, []);
  useEffect(() => {
    let live = true;
    const online = () => {
      setOffline(false);
      setPreparationAttempt(value => value + 1);
      void refresh();
    };
    const disconnected = () => {
      invalidate();
      setOffline(true);
    };
    const controllerChanged = () => {
      readyRegistrationRef.current = null; readyWorkerRef.current = null;
      setPushTestReady(false);
      setPreparationAttempt(value => value + 1);
    };
    const installPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPrompt;
      setCanInstall(true);
    };
    const appInstalled = () => {
      installationConfirmedRef.current = true;
      setInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
      setFeedback({ title: "Aplicativo instalado", text: "Abra o Home Care Assistant pela tela inicial deste aparelho.", outcome: "success" });
    };
    void Promise.resolve().then(() => {
      if (!live) return;
      setOffline(!navigator.onLine);
      setOrigin(location.origin);
      try {
        const raw = sessionStorage.getItem("hca:pwa-update");
        if (raw) {
          const receipt = JSON.parse(raw);
          if (/^[a-f0-9]{24}$/.test(receipt.revision) && Number.isFinite(receipt.at) && receipt.at <= Date.now() && Date.now() - receipt.at < 600000)
            updateReceiptRef.current = receipt;
          sessionStorage.removeItem("hca:pwa-update");
        }
      } catch { /* Update receipts contain no private fields and never authorize an operation. */ }
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
      if (!("serviceWorker" in navigator) || !window.isSecureContext)
        setWorker("unavailable");
      void refresh(false);
    });
    window.addEventListener("online", online);
    window.addEventListener("offline", disconnected);
    window.addEventListener("beforeinstallprompt", installPrompt);
    window.addEventListener("appinstalled", appInstalled);
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    return () => {
      live = false;
      invalidate();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("beforeinstallprompt", installPrompt);
      window.removeEventListener("appinstalled", appInstalled);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
    };
  }, [refresh, invalidate]);
  useEffect(() => {
    if (
      runtime !== "ready" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    )
      return;
    let live = true;
    const listenerController = new AbortController();
    const registrationDeadline = setTimeout(() => { if (live) setWorkerPhase("pending"); }, 12000);
    let failure = "registration_failed";
    const known = new Set<ServiceWorker>();
    const preparationFailed = (event: MessageEvent) => {
      if (!live || !known.has(event.source as ServiceWorker) || event.data?.type !== "HCA_OFFLINE_PREPARATION_FAILED") return;
      const reason = event.data.reason;
      if (["access_required", "network_or_access", "public_asset_invalid", "storage_unavailable"].includes(reason)) {
        failure = reason; setWorkerIssue(reason);
      }
    };
    navigator.serviceWorker.addEventListener("message", preparationFailed, { signal: listenerController.signal });
    void Promise.resolve().then(() => {
      if (!live) return null;
      setWorker("checking"); setWorkerPhase("registering"); setWorkerIssue("");
      return navigator.serviceWorker
      .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .then(async (current) => {
        if (!live) return;
        clearTimeout(registrationDeadline);
        if (current.scope !== new URL("/", location.origin).href) throw new Error("registration_failed");
        registrationRef.current = current;
        const update = () => {
          if (live) setWaiting(Boolean(current.waiting));
        };
        const observe = () => {
          if (current.active) known.add(current.active);
          if (current.waiting) known.add(current.waiting);
          const incoming = current.installing;
          if (!incoming) return;
          known.add(incoming);
          incoming.addEventListener("statechange", () => {
            if (!live) return;
            if (incoming.state === "redundant") setWorkerIssue(failure === "registration_failed" ? "update_failed" : failure);
            queueMicrotask(update);
          }, {
            signal: listenerController.signal,
          });
        };
        current.addEventListener("updatefound", observe, {
          signal: listenerController.signal,
        });
        observe();
        update();
        failure = "installation_failed";
        const active = await activeWorker(current, listenerController.signal, value => { if (live) setWorkerPhase(value); });
        if (!live) return;
        setWorkerPhase("verifying"); failure = "contract_unconfirmed";
        const version = await workerContract(active);
        if (!live) return;
        if (
          version.protocol !== contract.protocol ||
          version.schema !== contract.schema ||
          typeof version.revision !== "string" ||
          !/^[a-f0-9]{24}$/.test(version.revision)
        ) {
          setRuntime("incompatible");
          return;
        }
        setRevision(version.revision);
        setPushTestReady(workerSupports(version, "push-test"));
        tabRevisionRef.current ??= version.revision;
        if (!updateBusyRef.current) setTabNeedsReload(version.revision !== tabRevisionRef.current);
        if (updateReceiptRef.current) {
          if (updateReceiptRef.current.revision === version.revision) {
            setUpdated(true);
            setFeedback({ title: "Esta aba foi atualizada", text: "Você está usando a versão atual neste acesso.", outcome: "success" });
          } else {
            setFeedback({ title: "Atualização não confirmada", text: "Confira as atualizações para consultar a versão disponível.", outcome: "uncertain" });
          }
          updateReceiptRef.current = null;
        }
        readyRegistrationRef.current = current;
        readyWorkerRef.current = active;
        setWorkerPhase("ready");
        setWorker("ready");
        if (preparationRequestedRef.current) {
          preparationRequestedRef.current = false;
          setCheckedAt(Date.now());
          setFeedback({ title: "Aplicativo preparado", text: "A orientação pública está disponível neste navegador.", outcome: "success" });
        }
        failure = "update_failed";
      })
      .catch((reason) => {
        clearTimeout(registrationDeadline);
        if (!live) return;
        const issue = workerFailure(reason, failure);
        readyRegistrationRef.current = null;
        setWorker("error"); setWorkerPhase("failed"); setWorkerIssue(issue);
        if (preparationRequestedRef.current) {
          preparationRequestedRef.current = false;
          setFeedback({ title: "Falha na preparação", text: preparationDetail(issue), outcome: "rejected" });
        }
      });
    });
    return () => {
      live = false;
      listenerController.abort();
      clearTimeout(registrationDeadline);
      readyRegistrationRef.current = null;
      readyWorkerRef.current = null;
    };
  }, [runtime, preparationAttempt]);
  async function retryWorker() {
    if (offline || !navigator.onLine || worker === "unavailable") return;
    if (runtime !== "ready") {
      await refresh();
      return;
    }
    preparationRequestedRef.current = true;
    setPreparationAttempt(value => value + 1);
  }
  function readyRegistration() {
    const current = readyRegistrationRef.current;
    return runtime === "ready" && !offline && navigator.onLine && worker === "ready" && current?.active?.state === "activated" && current.active === readyWorkerRef.current ? current : null;
  }
  async function install() {
    const invitation = promptRef.current;
    if (!invitation || installing) return;
    promptRef.current = null;
    setCanInstall(false);
    setInstalling(true);
    try {
      await invitation.prompt();
      const choice = await invitation.userChoice;
      if (choice.outcome === "accepted" && !installationConfirmedRef.current) {
        setFeedback({ title: "Instalação solicitada", text: "Confira a instalação na tela inicial deste aparelho." });
      }
    } catch {
      setFeedback({ title: "Instalação indisponível", text: "Confira a opção de instalação no menu do navegador.", outcome: "rejected" });
    } finally {
      setInstalling(false);
    }
  }
  async function checkUpdates() {
    if (checkingUpdates || offline || !navigator.onLine) return;
    const registration = registrationRef.current;
    if (!registration || worker === "error") {
      await retryWorker();
      return;
    }
    setCheckingUpdates(true);
    try {
      const problem = workerIssue;
      setWorkerIssue("");
      await registration.update();
      const candidate = registration.waiting;
      setWaiting(Boolean(candidate));
      if (candidate || tabNeedsReload) {
        setFeedback({ title: "Atualização disponível", text: "Em Conexão e atualização, escolha quando recarregar esta aba." });
      } else if (registration.installing) {
        setFeedback({ title: "Verificação em andamento", text: "O navegador está preparando arquivos da nova versão. Consulte novamente quando a preparação terminar." });
      } else if (problem) {
        setFeedback({ title: "Verificação não concluída", text: preparationDetail(problem), outcome: "rejected" });
      } else if (worker === "ready" && registration.active === readyWorkerRef.current) {
        setCheckedAt(Date.now());
        setFeedback({ title: "Você está na versão atual", text: "A verificação foi concluída neste navegador.", outcome: "success" });
      }
    } catch {
      setFeedback({ title: "Não foi possível verificar atualizações", text: "Confira sua conexão e tente novamente.", outcome: "rejected" });
    } finally {
      setCheckingUpdates(false);
    }
  }
  async function checkSend() {
    if (checkingSendRef.current || !tabCommandCount()) return;
    checkingSendRef.current = true;
    setCheckingSend(true);
    const review = ++sendReviewRef.current;
    const receive = (result: Awaited<ReturnType<typeof observeTabCommands>>) => {
      if (review === sendReviewRef.current) setSendCheck(result);
    };
    try {
      receive(await observeTabCommands(30_000, receive));
    } finally {
      checkingSendRef.current = false;
      setCheckingSend(false);
    }
  }
  function openPanel(next: PwaPanel, trigger?: HTMLButtonElement) {
    panelTriggerRef.current = trigger ?? null;
    setPanel(next);
    if (next === "app" && worker === "error") {
      setFeedback({ title: "Falha na preparação", text: preparationDetail(workerIssue), outcome: "rejected" });
    }
  }
  async function applyUpdate() {
    const registration = registrationRef.current;
    const needsActivation = Boolean(registration?.waiting);
    const candidate = registration?.waiting ?? (tabNeedsReload ? registration?.active : null);
    if (updateBusyRef.current || offline || runtime !== "ready" || sendCheck?.state === "uncertain" || !navigator.onLine || !registration || !candidate) return;
    const release = claimTabUpdate();
    if (!release) {
      setConfirmUpdate(false);
      return;
    }
    updateBusyRef.current = true;
    setUpdating(true);
    try {
      const target = await workerContract(candidate);
      const response = await fetch("/api/runtime", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      const available = await response.json();
      if (!navigator.onLine || !response.ok || available.state !== "ready" || target.protocol !== available.protocol || target.schema !== available.schema || !workerSupports(target, "explicit-update") || !/^[a-f0-9]{24}$/.test(target.revision) || (needsActivation ? registration.waiting : registration.active) !== candidate)
        throw new Error("update_not_compatible");
      sessionStorage.setItem("hca:pwa-update", JSON.stringify({ revision: target.revision, at: Date.now() }));
      const activated = needsActivation ? await activateWorkerUpdate(registration, target.revision, new AbortController().signal) : candidate;
      const actual = await workerContract(activated);
      if (!navigator.onLine || actual.revision !== target.revision || actual.protocol !== target.protocol || actual.schema !== target.schema)
        throw new Error("update_not_confirmed");
      // Only this confirming tab reloads. Other tabs retain their fields and pending intentions.
      window.location.reload();
    } catch {
      try { sessionStorage.removeItem("hca:pwa-update"); } catch { /* No retry or reload loop. */ }
      release();
      setFeedback({ title: "Atualização não concluída", text: "Esta aba continua aberta. Confira as atualizações e tente novamente.", outcome: "uncertain" });
      setConfirmUpdate(false); setUpdating(false); updateBusyRef.current = false;
    }
  }
  const blocked = !publicPage && (offline || runtime !== "ready");
  const status = offline
    ? "Sem conexão. O conteúdo desta aba pode estar desatualizado. Suas edições continuam nesta aba; nenhuma ação será enviada automaticamente."
    : runtime === "incompatible"
      ? "A versão do aplicativo e a atualização do sistema ainda não são compatíveis. Suas edições abertas foram preservadas. Aguarde a atualização e consulte novamente."
      : runtime === "unavailable"
        ? "Não foi possível confirmar a conexão com o sistema. Suas edições abertas foram preservadas. Consulte novamente antes de continuar."
        : "Conferindo conexão e versão do aplicativo…";
  // The shell places notices in its content column, outside the inert command
  // regions. A notice before the shell is covered by its fixed desktop sidebar.
  const notices = offline || runtime !== "ready" ? (
      <section className="ui-notice m-3" aria-label="Conexão e versão do aplicativo" role={runtime === "checking" && !offline ? "status" : "alert"}>
        <p>{status}</p>
        {runtime !== "checking" ? <ActionButton disabled={offline} onClick={() => void refresh()}>Consultar conexão e versão novamente</ActionButton> : null}
        {offline || runtime !== "checking" ? <ActionButton onClick={event => openPanel("connection", event.currentTarget)}>Abrir conexão e atualização</ActionButton> : null}
      </section>
  ) : null;
  const blockedBySend = Boolean(sendCount || checkingSend || sendCheck?.state === "pending" || sendCheck?.state === "uncertain");
  const updateAvailable = waiting || tabNeedsReload;
  const pwa: PwaState = {
    blocked, notices, runtime, offline, worker, workerPhase, workerIssue,
    waiting: updateAvailable, installed, canInstall, installing, updating,
    pushTestReady, checkedAt, checkingUpdates, updated, revision, openPanel, install,
    checkUpdates, requestUpdate: () => { if (!blockedBySend && !offline && runtime === "ready") setConfirmUpdate(true); },
    refresh, retryWorker, readyRegistration,
    previewInstallUrl: previewOrigin && origin && origin !== previewOrigin ? previewOrigin : null,
  };
  const openIncompatibility = !publicPage && !offline && runtime === "incompatible" && !incompatibilityDismissed;
  const dismissIncompatibility = () => setIncompatibilityDismissed(true);
  const overlay = confirmUpdate ? <Dialog open title="Atualizar esta aba?" kicker="Aplicativo" headingIcon="refresh"
    closeDisabled={updating} onClose={() => { if (!updateBusyRef.current) setConfirmUpdate(false); }}
    footer={<>
      <ActionButton disabled={updating} onClick={() => setConfirmUpdate(false)}>Agora não</ActionButton>
      <ActionButton variant="primary" disabled={updating || offline || runtime !== "ready" || blockedBySend || !updateAvailable} onClick={() => void applyUpdate()}>
        <Icon name="refresh" />{updating ? "Atualizando…" : "Atualizar agora"}
      </ActionButton>
    </>}>
    <p>Vamos recarregar esta aba com a versão mais recente. As outras abas permanecem abertas.</p>
    <p className="hca-pwa-copy"><Icon name="shield" /> A atualização não reenvia registros. Termine o preenchimento desta aba antes de continuar.</p>
    {blockedBySend ? <p role="status">Aguarde a confirmação do envio antes de atualizar.</p> : null}
  </Dialog> : openIncompatibility ? <Dialog open title="Versão incompatível" failure="rejected" dismissOnOutsideClick={false}
    popupClassName="hca-operation-result-dialog" onClose={dismissIncompatibility}
    footer={<ActionButton variant="primary" onClick={() => {
      dismissIncompatibility();
      openPanel("connection");
    }}>Abrir conexão e atualização</ActionButton>}>
    <p>Aguarde uma versão compatível e confira a conexão para continuar.</p>
  </Dialog> : feedback && !publicPage ? <Dialog open title={feedback.title} success={feedback.outcome === "success"}
    failure={feedback.outcome === "uncertain" || feedback.outcome === "rejected" ? feedback.outcome : undefined}
    popupClassName={feedback.outcome ? "hca-operation-result-dialog" : undefined} dismissOnOutsideClick={false}
    onClose={() => setFeedback(null)} footer={<ActionButton variant="primary" onClick={() => setFeedback(null)}>Entendi</ActionButton>}>
    <p>{feedback.text}</p>
  </Dialog> : null;
  return (
    <Context value={pwa}>
      {children}
      {panel ? <PwaPanels key={panel} panel={panel} pwa={pwa} finalFocus={panelTriggerRef} overlay={overlay}
        blockedBySend={blockedBySend} sendCount={sendCount} sendCheck={sendCheck} checkingSend={checkingSend}
        onCheckSend={() => void checkSend()} onClose={() => setPanel(null)} onReturnToSend={destination => {
          sendReviewRef.current++;
          setPanel(null);
          setSendCheck(null);
          if (destination !== location.pathname + location.search) router.push(destination);
        }} /> : overlay}
    </Context>
  );
}
