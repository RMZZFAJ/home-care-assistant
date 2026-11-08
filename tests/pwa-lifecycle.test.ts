import { afterEach, expect, it, vi } from "vitest";
import { activeWorker, workerFailure, type WorkerPhase } from "@/lib/pwa/worker";
import { stablePreviewOrigin } from "@/lib/pwa/preview-origin";

class WorkerFixture extends EventTarget {
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
it("a redundant install rejects immediately without waiting for the global ready promise", async () => {
  const r = new RegistrationFixture(), incoming = r.installing!, phases: WorkerPhase[] = [];
  const result = activeWorker(r.asRegistration(), new AbortController().signal, p => phases.push(p)).catch(e => e);
  r.installing = null; incoming.transition("redundant");
  expect((await result).message).toBe("installation_failed"); expect(phases).toEqual(["installing"]);
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
