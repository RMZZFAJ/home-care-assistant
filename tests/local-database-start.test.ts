import { expect, it, vi } from "vitest";
import { startLocalWithPortRetry } from "../scripts/local-start-retry.mjs";

const collision = {
  status: 1,
  stderr: 'failed to start docker container "supabase_inbucket_home-care-assistant": Error response from daemon: failed to set up container networking: failed to bind host port 0.0.0.0:54324/tcp: address already in use',
};
const success = { status: 0, stderr: "" };

it("retries a transient local bind collision without changing the start operation", async () => {
  const run = vi.fn().mockReturnValueOnce(collision).mockReturnValue(success);
  const wait = vi.fn().mockResolvedValue(undefined);
  const onRetry = vi.fn();
  expect(await startLocalWithPortRetry(run, { wait, onRetry })).toBe(success);
  expect(run).toHaveBeenCalledTimes(2);
  expect(wait.mock.calls).toEqual([[15_000]]);
  expect(onRetry.mock.calls).toEqual([[2, 15_000]]);
});

it("returns the original final failure after at most three attempts", async () => {
  const run = vi.fn().mockReturnValue(collision);
  const wait = vi.fn().mockResolvedValue(undefined);
  expect(await startLocalWithPortRetry(run, { wait })).toBe(collision);
  expect(run).toHaveBeenCalledTimes(3);
  expect(wait.mock.calls).toEqual([[15_000], [30_000]]);
});

it.each([
  { status: 1, stderr: "Auth configuration is invalid" },
  { status: 1, stderr: "migration failed: permission denied" },
  { status: null, stderr: "", error: new Error("CLI unavailable") },
  { ...collision, stderr: collision.stderr.replace("home-care-assistant", "another-project") },
  { ...collision, stderr: collision.stderr.replace("54324", "54330") },
  { ...collision, stderr: collision.stderr.replace("address already in use", "permission denied") },
  { ...collision, status: 0 },
])("does not retry unrelated failures, other targets, or successful starts: $stderr", async (result) => {
  const run = vi.fn().mockReturnValue(result);
  const wait = vi.fn().mockResolvedValue(undefined);
  expect(await startLocalWithPortRetry(run, { wait })).toBe(result);
  expect(run).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});
