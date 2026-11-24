type Completion = "confirmed" | "uncertain";
type Send = { destination: string; outcome: Promise<Completion> };
const sends = new Set<Send>();
const listeners = new Set<() => void>();
let updating = false;

export function subscribeTabCommands(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function tabCommandCount() {
  return sends.size;
}

export function tabUpdateLocked() {
  return updating;
}

// Only requests actually dispatched by this tab enter this set. It stores
// a return destination, never a form, payload, attachment or request key.
export function beginTabCommand() {
  if (typeof window === "undefined") return undefined;
  let finish!: (result: Completion) => void;
  const outcome = new Promise<Completion>(resolve => { finish = resolve; });
  const path = window.location.pathname;
  const destination = path.startsWith("//") ? "/" : path + window.location.search;
  const send = { destination, outcome };
  sends.add(send);
  listeners.forEach(listener => listener());
  return (result: Completion) => {
    if (!sends.delete(send)) return;
    finish(result);
    listeners.forEach(listener => listener());
  };
}

export function claimTabUpdate() {
  if (updating || sends.size) return undefined;
  updating = true;
  return () => { updating = false; };
}

type Settled = { state: "uncertain"; destination: string } | { state: "confirmed" };

export async function observeTabCommands(timeoutMs = 30_000, onSettled?: (result: Settled) => void) {
  const cohort = [...sends];
  if (!cohort.length) return { state: "idle" as const };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.all(cohort.map(async send => ({
    destination: send.destination, outcome: await send.outcome,
  }))).then((results): Settled => {
    const unresolved = results.find(result => result.outcome === "uncertain");
    return unresolved ? { state: "uncertain", destination: unresolved.destination } : { state: "confirmed" };
  });
  try {
    const result = await Promise.race([
      settled,
      new Promise<{ state: "pending"; destination: string }>(resolve => {
        timer = setTimeout(() => resolve({ state: "pending", destination: cohort[0].destination }), timeoutMs);
      }),
    ]);
    if (result.state === "pending" && onSettled) void settled.then(onSettled);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
