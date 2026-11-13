import { afterEach, expect, it, vi } from "vitest";
import { activeWorker, activateWorkerUpdate, workerFailure, workerSupports, type WorkerPhase } from "@/lib/pwa/worker";
import { stablePreviewOrigin } from "@/lib/pwa/preview-origin";

class WorkerFixture extends EventTarget {
  postMessage = vi.fn();
  constructor(public state: ServiceWorkerState) { super(); }
  transition(state: ServiceWorkerState) { this.state = state; this.dispatchEvent(new Event("statechange")); }
}
class RegistrationFixture extends EventTarget {
  active: WorkerFixture | null = null;
  waiting: WorkerFixture | null = null;
  installing: WorkerFixture | null = new WorkerFixture("installing");
  asRegistration() { return this as unknown as ServiceWorkerRegistration; }
}
afterEach(() => vi.useRealTimers());
it("legacy workers remain usable but cannot promise a new Push test or explicit activation", () => {
  for (const value of [null, {}, { protocol: 1 }, { capabilities: "push-test" }, { capabilities: ["unrelated"] }]) {
    expect(workerSupports(value, "push-test")).toBe(false);
    expect(workerSupports(value, "explicit-update")).toBe(false);
  }
  expect(workerSupports({ capabilities: ["push-test", "explicit-update"] }, "push-test")).toBe(true);
  expect(workerSupports({ capabilities: ["push-test", "explicit-update"] }, "explicit-update")).toBe(true);
});
it("a redundant install rejects immediately without waiting for the global ready promise", async () => {
  const r = new RegistrationFixture(), incoming = r.installing!, phases: WorkerPhase[] = [];
  const result = activeWorker(r.asRegistration(), new AbortController().signal, p => phases.push(p)).catch(e => e);
  r.installing = null; incoming.transition("redundant");
  expect((await result).message).toBe("installation_failed"); expect(phases).toEqual(["installing"]);
});
it("explicit activation waits for that exact candidate, and refuses a missing or failed candidate", async () => {
  const r = new RegistrationFixture(), candidate = new WorkerFixture("installed");
  r.waiting = candidate;
  const result = activateWorkerUpdate(r.asRegistration(), "requested-revision", new AbortController().signal);
  expect(candidate.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "HCA_ACTIVATE_UPDATE", revision: "requested-revision", confirmed: true });
  r.waiting = null; r.active = candidate; candidate.transition("activated");
  expect(await result).toBe(candidate);
  await expect(activateWorkerUpdate(r.asRegistration(), "missing", new AbortController().signal)).rejects.toThrow("candidate_changed");
  const failed = new WorkerFixture("installed"); r.waiting = failed;
  const failure = activateWorkerUpdate(r.asRegistration(), "requested-revision", new AbortController().signal);
  failed.transition("redundant");
  await expect(failure).rejects.toThrow("activation_failed");
});
it("explicit update cancellation and deadline reject without reload or sending twice", async () => {
  vi.useFakeTimers();
  const r = new RegistrationFixture(), candidate = new WorkerFixture("installed"), abort = new AbortController();
  r.waiting = candidate;
  const first = activateWorkerUpdate(r.asRegistration(), "requested", abort.signal).catch(error => error);
  abort.abort(); expect((await first).name).toBe("AbortError");
  const second = activateWorkerUpdate(r.asRegistration(), "requested", new AbortController().signal).catch(error => error);
  await vi.advanceTimersByTimeAsync(15000);
  expect((await second).message).toBe("update_activation_unconfirmed");
  expect(candidate.postMessage).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
});
it("an observation deadline is pending and actual late activation remains recoverable", async () => {
  vi.useFakeTimers();
  const r = new RegistrationFixture(), incoming = r.installing!, phases: WorkerPhase[] = [];
  const result = activeWorker(r.asRegistration(), new AbortController().signal, p => phases.push(p));
  await vi.advanceTimersByTimeAsync(12000); expect(phases.at(-1)).toBe("pending");
  r.installing = null; r.active = incoming; incoming.transition("activating"); incoming.transition("activated");
  expect(await result).toBe(incoming); expect(phases.at(-1)).toBe("activating"); expect(vi.getTimerCount()).toBe(0);
});
it("cancellation removes lifecycle listeners and cannot publish a later readiness result", async () => {
  vi.useFakeTimers();
  const r = new RegistrationFixture(), incoming = r.installing!, abort = new AbortController(), phase = vi.fn();
  const result = activeWorker(r.asRegistration(), abort.signal, phase).catch(e => e);
  abort.abort(); expect((await result).name).toBe("AbortError");
  r.active = incoming; incoming.transition("activated"); await vi.advanceTimersByTimeAsync(12000);
  expect(phase).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});
it("an existing activated registration remains usable while a different candidate updates", async () => {
  const r = new RegistrationFixture(); r.active = new WorkerFixture("activated");
  expect(await activeWorker(r.asRegistration(), new AbortController().signal, vi.fn())).toBe(r.active);
});
it("activation failure is distinct and raw browser exceptions cannot become a public diagnostic", async () => {
  const r = new RegistrationFixture(), incoming = r.installing!, phase = vi.fn();
  const result = activeWorker(r.asRegistration(), new AbortController().signal, phase).catch(e => e);
  r.installing = null; r.active = incoming; incoming.transition("activating"); r.active = null; incoming.transition("redundant");
  const error = await result; expect(error.message).toBe("activation_failed");
  expect(workerFailure(error, "installation_failed")).toBe("activation_failed");
  expect(workerFailure(new Error("Private browser exception contents"), "registration_failed")).toBe("registration_failed");
});
it("only a server-provided Preview branch origin is offered, with no private path, token or production redirect", () => {
  expect(stablePreviewOrigin("preview", "home-git-feature-team.vercel.app")).toBe("https://home-git-feature-team.vercel.app");
  for (const env of ["production", "development", undefined]) expect(stablePreviewOrigin(env, "home-git-feature-team.vercel.app")).toBeNull();
  for (const host of ["evil.test", "home.vercel.app/privado", "user@home.vercel.app", "home.vercel.app?token=x", "home.vercel.app:443", undefined]) expect(stablePreviewOrigin("preview", host)).toBeNull();
});
