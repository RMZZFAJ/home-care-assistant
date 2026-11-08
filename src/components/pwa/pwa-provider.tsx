"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import contract from "@/lib/pwa/contract.json";
import { setRuntimeCommandsAvailable } from "@/lib/client/api";
import { activeWorker, workerContract, workerFailure, type WorkerPhase } from "@/lib/pwa/worker";

type Runtime = "checking" | "ready" | "unavailable" | "incompatible";
type WorkerState = "checking" | "ready" | "unavailable" | "error";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type State = {
  runtime: Runtime;
  offline: boolean;
  worker: WorkerState;
  workerPhase: WorkerPhase;
  workerIssue: string;
  waiting: boolean;
  installed: boolean;
  canInstall: boolean;
  installing: boolean;
  message: string;
  error: string;
  revision: string;
  install: () => Promise<void>;
  checkUpdates: () => Promise<void>;
  refresh: () => Promise<void>;
  retryWorker: () => Promise<void>;
  readyRegistration: () => ServiceWorkerRegistration | null;
  previewInstallUrl: string | null;
};
const Context = createContext<State | null>(null);
export function usePwa() {
  const value = use(Context);
  if (!value) throw new Error("PWA settings require their provider");
  return value;
}
export function PwaProvider({ children, previewOrigin = null }: { children: ReactNode; previewOrigin?: string | null }) {
  const pathname = usePathname();
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
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [revision, setRevision] = useState("");
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
  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController(),
      own = ++sequenceRef.current;
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setRuntime("checking");
    try {
      const response = await fetch("/api/runtime", {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json();
      if (own !== sequenceRef.current) return;
      setRuntime(
        body.state === "incompatible" ||
          (response.ok &&
            body.state === "ready" &&
            (body.protocol !== contract.protocol ||
              body.schema !== contract.schema))
          ? "incompatible"
          : response.ok &&
              body.state === "ready" &&
              body.protocol === contract.protocol &&
              body.schema === contract.schema
            ? "ready"
            : "unavailable",
      );
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
    const disconnected = () => setOffline(true);
    const controllerChanged = () => {
      readyRegistrationRef.current = null; readyWorkerRef.current = null;
      setPreparationAttempt(value => value + 1);
    };
    const installPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPrompt;
      setCanInstall(true);
    };
    const appInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
      setMessage("Aplicativo instalado neste aparelho.");
    };
    void Promise.resolve().then(() => {
      if (!live) return;
      setOffline(!navigator.onLine);
      setOrigin(location.origin);
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
      if (!("serviceWorker" in navigator) || !window.isSecureContext)
        setWorker("unavailable");
      void refresh();
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
        readyRegistrationRef.current = current;
        readyWorkerRef.current = active;
        setWorkerPhase("ready");
        setWorker("ready");
        failure = "update_failed";
      })
      .catch((reason) => {
        clearTimeout(registrationDeadline);
        if (live) { readyRegistrationRef.current = null; setWorker("error"); setWorkerPhase("failed"); setWorkerIssue(workerFailure(reason, failure)); }
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
    setError(""); setMessage("");
    if (runtime !== "ready") await refresh();
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
    setError("");
    try {
      await invitation.prompt();
      const choice = await invitation.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Pedido aceito. Confira a instalação no navegador."
          : "Instalação adiada. O aplicativo web continua disponível.",
      );
    } catch {
      setError("Não foi possível abrir a instalação. Use o menu do navegador.");
    } finally {
      setInstalling(false);
    }
  }
  async function checkUpdates() {
    setError("");
    setWorkerIssue("");
    try {
      if (!registrationRef.current || worker === "error") {
        await retryWorker();
        return;
      }
      await registrationRef.current.update();
      setWaiting(Boolean(registrationRef.current.waiting));
      setMessage(
        registrationRef.current.installing ? "Preparando uma atualização. A versão atual continua disponível enquanto o navegador verifica os arquivos públicos." : "Verificação concluída. Uma versão nova aguardará o encerramento das abas antigas.",
      );
    } catch {
      setError(
        "Não foi possível consultar atualizações. Verifique a conexão e tente novamente.",
      );
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
  return (
    <Context
      value={{
        runtime,
        offline,
        worker,
        workerPhase,
        workerIssue,
        waiting,
        installed,
        canInstall,
        installing,
        message,
        error,
        revision,
        install,
        checkUpdates,
        refresh,
        retryWorker,
        readyRegistration,
        previewInstallUrl: previewOrigin && origin && origin !== previewOrigin ? previewOrigin : null,
      }}
    >
      {offline || runtime !== "ready" ? (
        <section
          className="ui-notice m-3"
          aria-label="Conexão e versão do aplicativo"
          role={runtime === "checking" && !offline ? "status" : "alert"}
        >
          <p>{status}</p>
          {runtime !== "checking" ? (
            <button
              className="ui-button ui-button-secondary"
              type="button"
              onClick={() => void refresh()}
            >
              Consultar conexão e versão novamente
            </button>
          ) : null}
        </section>
      ) : null}
      {waiting && runtime === "ready" && !offline ? (
        <aside className="ui-notice m-3" role="status">
          Atualização pronta. Salve seus rascunhos e encerre todas as abas do
          aplicativo para usar a nova versão. Esta aba não será recarregada
          automaticamente.
        </aside>
      ) : null}
      <div inert={blocked}>{children}</div>
    </Context>
  );
}
