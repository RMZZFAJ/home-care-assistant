import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initialNoticeMessage, startInitialNoticeTracking, type InitialNoticeState } from "@/lib/notifications/initial-tracking";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-07T15:00:00Z")); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
const response = (waitSeconds: number, states = ["pending"]) => ({ waitSeconds, data: states.map(state => ({ state })) });

it.each([0, 5, 10])("a completed read never regresses at the %i-second deadline", async seconds => {
  const states: InitialNoticeState[] = [], read = vi.fn(async () => response(seconds, ["sent", "failed", "cancelled"]));
  const dispose = startInitialNoticeTracking(read, state => states.push(state));
  await vi.advanceTimersByTimeAsync(0); expect(states).toEqual([{ kind: "settled" }]);
  await vi.advanceTimersByTimeAsync(30000); expect(states).toEqual([{ kind: "settled" }]); expect(read).toHaveBeenCalledTimes(1);
  dispose(); expect(vi.getTimerCount()).toBe(0);
});

it("zero observes the policy once and leaves manual follow-up without a poll or false completion", async () => {
  const states: InitialNoticeState[] = [], read = vi.fn(async () => response(0, ["uncertain"]));
  startInitialNoticeTracking(read, state => states.push(state));
  await vi.advanceTimersByTimeAsync(60000); expect(states).toEqual([{ kind: "manual" }]); expect(read).toHaveBeenCalledTimes(1);
  expect(initialNoticeMessage(states[0])).toContain("desativado"); expect(vi.getTimerCount()).toBe(0);
});

it.each([5, 10])("pending remains an observation and closes at the configured %i-second absolute bound", async seconds => {
  const states: InitialNoticeState[] = [], read = vi.fn(async () => response(seconds));
  startInitialNoticeTracking(read, state => states.push(state));
  await vi.advanceTimersByTimeAsync(seconds * 1000 - 1); expect(states.at(-1)).toEqual({ kind: "pending", count: 1 });
  await vi.advanceTimersByTimeAsync(1); expect(states.at(-1)).toEqual({ kind: "elapsed" });
  const calls = read.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(read).toHaveBeenCalledTimes(calls);
  expect(initialNoticeMessage(states.at(-1)!)).not.toContain("continuam sendo processados"); expect(vi.getTimerCount()).toBe(0);
});

it("completion in an early poll cancels its deadline", async () => {
  const states: InitialNoticeState[] = [], read = vi.fn().mockResolvedValueOnce(response(10)).mockResolvedValue(response(10, []));
  startInitialNoticeTracking(read, state => states.push(state));
  await vi.advanceTimersByTimeAsync(1800); expect(states.at(-1)?.kind).toBe("settled");
  const count = states.length; await vi.advanceTimersByTimeAsync(30000); expect(states).toHaveLength(count); expect(vi.getTimerCount()).toBe(0);
});

it("a late first response consumes the elapsed window instead of restarting it", async () => {
  let release!: (value: unknown) => void; const pending = new Promise(resolve => { release = resolve; });
  const states: InitialNoticeState[] = [];
  startInitialNoticeTracking(() => pending, state => states.push(state));
  await vi.advanceTimersByTimeAsync(6000); release(response(5)); await vi.advanceTimersByTimeAsync(0);
  expect(states).toEqual([{ kind: "elapsed" }]); expect(vi.getTimerCount()).toBe(0);
});

it("a poll resolving after expiration cannot change the closed state", async () => {
  let release!: (value: unknown) => void; const pending = new Promise(resolve => { release = resolve; });
  const states: InitialNoticeState[] = [], read = vi.fn().mockResolvedValueOnce(response(5)).mockImplementation(() => pending);
  startInitialNoticeTracking(read, state => states.push(state));
  await vi.advanceTimersByTimeAsync(5000); expect(states.at(-1)?.kind).toBe("elapsed");
  const count = states.length; release(response(5, [])); await vi.advanceTimersByTimeAsync(0); expect(states).toHaveLength(count);
});

it("unmount aborts its own read and ignores late results even when the transport ignores the abort", async () => {
  let release!: (value: unknown) => void, signal!: AbortSignal;
  const pending = new Promise(resolve => { release = resolve; }), states: InitialNoticeState[] = [];
  const dispose = startInitialNoticeTracking(value => { signal = value; return pending; }, state => states.push(state));
  dispose(); expect(signal.aborted).toBe(true); release(response(10, [])); await vi.advanceTimersByTimeAsync(30000);
  expect(states).toEqual([]); expect(vi.getTimerCount()).toBe(0);
});

it.each([{}, response(11), response(5, ["invented"]), { waitSeconds: 5, data: null }])("invalid responses are not zero pending or completed", async value => {
  const states: InitialNoticeState[] = [];
  startInitialNoticeTracking(async () => value, state => states.push(state)); await vi.advanceTimersByTimeAsync(30000);
  expect(states).toEqual([{ kind: "unavailable" }]);
});

it("read failure ends observation without claiming provider state", async () => {
  const states: InitialNoticeState[] = [];
  startInitialNoticeTracking(async () => { throw new Error("controlled read failure"); }, state => states.push(state)); await vi.advanceTimersByTimeAsync(30000);
  expect(states).toEqual([{ kind: "unavailable" }]); expect(initialNoticeMessage(states[0])).not.toMatch(/entregue|ciência|concluído/);
});
