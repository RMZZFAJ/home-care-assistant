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
};
const Context = createContext<State | null>(null);
export function usePwa() {
  const value = use(Context);
  if (!value) throw new Error("PWA settings require their provider");
  return value;
}
function workerContract(worker: ServiceWorker) {
  return new Promise<{ protocol: number; schema: number; revision: string }>(
    (resolve, reject) => {
      const channel = new MessageChannel();
      const close = () => {
        channel.port1.close();
        channel.port2.close();
      };
      const timer = setTimeout(() => {
        close();
        reject(new Error("Worker did not confirm its version"));
      }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        close();
        resolve(event.data);
      };
      worker.postMessage({ type: "HCA_RUNTIME" }, [channel.port2]);
    },
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicPage =
    ["/login", "/recuperar-senha", "/convites/aceitar"].includes(pathname) ||
    pathname === "/verificar" ||
    pathname.startsWith("/verificar/");
  const [runtime, setRuntime] = useState<Runtime>("checking"),
    [offline, setOffline] = useState(false);
  useLayoutEffect(() => {
    setRuntimeCommandsAvailable(
      publicPage || (!offline && runtime === "ready"),
    );
    return () => setRuntimeCommandsAvailable(undefined);
  }, [publicPage, offline, runtime]);
  const [worker, setWorker] = useState<WorkerState>("checking"),
    [waiting, setWaiting] = useState(false);
  const [installed, setInstalled] = useState(false),
    [canInstall, setCanInstall] = useState(false),
    [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [revision, setRevision] = useState("");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null),
    promptRef = useRef<InstallPrompt | null>(null);
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
      void refresh();
    };
    const disconnected = () => setOffline(true);
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
    return () => {
      live = false;
      invalidate();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("beforeinstallprompt", installPrompt);
      window.removeEventListener("appinstalled", appInstalled);
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
    const preparationDeadline = setTimeout(() => {
      if (live) setWorker("error");
    }, 12000);
    void navigator.serviceWorker
      .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .then(async (current) => {
        if (!live) return;
        registrationRef.current = current;
        const update = () => {
          if (live) setWaiting(Boolean(current.waiting));
        };
        const observe = () => {
          const incoming = current.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", update, {
            signal: listenerController.signal,
          });
        };
        current.addEventListener("updatefound", observe, {
          signal: listenerController.signal,
        });
        observe();
        update();
        const ready = await new Promise<ServiceWorkerRegistration>(
          (resolve, reject) => {
            const deadline = setTimeout(
              () => reject(new Error("Offline worker did not become ready")),
              10000,
            );
            void navigator.serviceWorker.ready.then((value) => {
              clearTimeout(deadline);
              resolve(value);
            });
          },
        );
        if (!live || !ready.active) return;
        const version = await workerContract(ready.active);
        clearTimeout(preparationDeadline);
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
        setWorker("ready");
      })
      .catch(() => {
        clearTimeout(preparationDeadline);
        if (live) setWorker("error");
      });
    return () => {
      live = false;
      listenerController.abort();
      clearTimeout(preparationDeadline);
    };
  }, [runtime]);
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
    try {
      if (!registrationRef.current) {
        await refresh();
        return;
      }
      await registrationRef.current.update();
      if (worker === "error" || worker === "checking") await refresh();
      setWaiting(Boolean(registrationRef.current.waiting));
      setMessage(
        "Verificação concluída. Uma versão nova aguardará o encerramento das abas antigas.",
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
