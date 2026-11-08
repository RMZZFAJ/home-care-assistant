export type WorkerPhase = "registering" | "installing" | "activating" | "verifying" | "pending" | "ready" | "failed";

/** Observe this registration's actual lifecycle; a deadline is uncertainty,
 * not proof of failure. An unsuccessful install becomes redundant explicitly.
 */
export function activeWorker(registration: ServiceWorkerRegistration, signal: AbortSignal, phase: (value: WorkerPhase) => void) {
  return new Promise<ServiceWorker>((resolve, reject) => {
    const observed = new Set<ServiceWorker>();
    let activationStarted = false;
    const timer = setTimeout(() => phase("pending"), 12000);
    function cleanup() {
      clearTimeout(timer);
      registration.removeEventListener("updatefound", changed);
      signal.removeEventListener("abort", aborted);
      for (const worker of observed) worker.removeEventListener("statechange", changed);
    }
    function aborted() { cleanup(); reject(new DOMException("Preparation cancelled", "AbortError")); }
    function changed() {
      const active = registration.active;
      if (active?.state === "activated") { cleanup(); resolve(active); return; }
      const incoming = registration.installing ?? registration.waiting ?? active;
      if (!incoming || incoming.state === "redundant") { cleanup(); reject(new Error(activationStarted ? "activation_failed" : "installation_failed")); return; }
      if (!observed.has(incoming)) { observed.add(incoming); incoming.addEventListener("statechange", changed); }
      if (incoming.state === "activating") activationStarted = true;
      phase(incoming.state === "activating" || incoming.state === "installed" ? "activating" : "installing");
    }
    registration.addEventListener("updatefound", changed);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted(); else changed();
  });
}

export function workerFailure(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message === "activation_failed" ? "activation_failed" : fallback;
}

export function workerContract(worker: ServiceWorker) {
  return new Promise<{ protocol: number; schema: number; revision: string }>((resolve, reject) => {
    const channel = new MessageChannel();
    const close = () => { channel.port1.close(); channel.port2.close(); };
    const timer = setTimeout(() => { close(); reject(new Error("contract_unconfirmed")); }, 5000);
    channel.port1.onmessage = event => { clearTimeout(timer); close(); resolve(event.data); };
    worker.postMessage({ type: "HCA_RUNTIME" }, [channel.port2]);
  });
}
