import { afterEach, expect, it, vi } from "vitest";
import { dirname } from "node:path";

const mocks = vi.hoisted(() => ({ run: vi.fn(), guard: vi.fn(), environment: vi.fn(), wait: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: mocks.run }));
vi.mock("node:fs", () => ({ mkdirSync: vi.fn() }));
vi.mock("node:timers/promises", () => ({ setTimeout: mocks.wait }));
vi.mock("../scripts/trusted-executable.mjs", () => ({ trustedExecutable: (name: string) => "/fixed/" + name + "/" + name }));
vi.mock("../scripts/test-environment.mjs", () => ({
  testRoot: "/verified/home-care-assistant", testDataRoot: "/verified/home-care-assistant/supabase/.temp",
  testProject: "home-care-assistant", assertLocalProject: mocks.guard, getTestEnvironment: mocks.environment,
}));
const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.clearAllMocks();
});

async function prepare({ restart = false, collision = false, failed = false } = {}) {
  vi.resetModules();
  process.argv = [process.execPath, "prepare-test-database.mjs", ...(restart ? ["--restart"] : [])];
  vi.stubEnv("PATH", "/untrusted/path-first");
  mocks.wait.mockResolvedValue(undefined);
  mocks.run.mockReturnValue({ status: 0, stdout: "SYNTHETIC_CREDENTIAL_SENTINEL", stderr: "" });
  if (collision) mocks.run.mockReturnValueOnce({ status: 1, stderr: 'failed to start docker container "supabase_inbucket_home-care-assistant": failed to bind host port 0.0.0.0:54324/tcp: address already in use' });
  if (failed) mocks.run.mockReturnValueOnce({ status: 2, stderr: "configuration rejected" });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await import("../scripts/prepare-test-database.mjs");
}

it.each([false, true])("fixes Supabase and descendant Docker resolution for every process, including restart=%s", async restart => {
  await prepare({ restart });
  expect(mocks.guard).toHaveBeenCalledWith({ running: false });
  expect(mocks.run.mock.calls.map(call => call[1][0])).toEqual(restart ? ["stop", "start", "migration"] : ["start", "migration"]);
  for (const [executable, args, options] of mocks.run.mock.calls) {
    expect(executable).toBe("/fixed/supabase/supabase");
    expect(options.env.PATH).toBe(dirname("/fixed/docker/docker"));
    expect(args.slice(args.indexOf("--workdir") + 1)).toContain("/verified/home-care-assistant");
  }
  expect(mocks.run.mock.calls.at(-1)![1]).toContain("--local");
  expect(mocks.environment).toHaveBeenCalledTimes(2);
  if (restart) expect(mocks.guard).toHaveBeenCalledWith();
  expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain("SYNTHETIC_CREDENTIAL_SENTINEL");
});

it("keeps the trusted executable and restricted PATH across a retry, then migrates once", async () => {
  await prepare({ collision: true });
  expect(mocks.run.mock.calls.map(call => call[1][0])).toEqual(["start", "start", "migration"]);
  for (const [executable, , options] of mocks.run.mock.calls) {
    expect(executable).toBe("/fixed/supabase/supabase");
    expect(options.env.PATH).toBe(dirname("/fixed/docker/docker"));
  }
  expect(mocks.wait).toHaveBeenCalledWith(15_000);
});

it("propagates an unrelated start failure before any migration", async () => {
  const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("controlled exit"); });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  await expect(prepare({ failed: true })).rejects.toThrow("controlled exit");
  expect(exit).toHaveBeenCalledWith(2);
  expect(mocks.run).toHaveBeenCalledTimes(1);
  expect(mocks.environment).not.toHaveBeenCalled();
  expect(mocks.wait).not.toHaveBeenCalled();
});
