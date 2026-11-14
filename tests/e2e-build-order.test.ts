import { afterEach, beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ spawn: vi.fn(), dispose: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: harness.spawn }));
vi.mock("../scripts/e2e-environment.mjs", () => ({
  getE2EEnvironment: () => ({ CI: "true", HCA_E2E_BUILD_COMPLETE: "true" }),
}));
vi.mock("./support/test-signing-identity.mjs", () => ({
  testSigningIdentity: async () => ({ trustFile: "fixture-trust", secretFile: "fixture-secret", pushFile: "fixture-push", dispose: harness.dispose }),
}));
const originalArgs = process.argv, originalExit = process.exitCode;
beforeEach(() => {
  vi.resetModules(); harness.spawn.mockReset(); harness.dispose.mockReset();
  process.argv = [process.execPath, "scripts/run-e2e.mjs", "tests/e2e/autonomous-return.spec.ts"];
  process.exitCode = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { process.argv = originalArgs; process.exitCode = originalExit; vi.restoreAllMocks(); });

it("a failed production build prevents every browser case and still disposes test custody", async () => {
  harness.spawn.mockReturnValueOnce({ status: 0, stdout: "collection" })
    .mockReturnValueOnce({ status: 1 });
  await import("../scripts/run-e2e.mjs");
  expect(harness.spawn).toHaveBeenCalledTimes(2);
  expect(harness.spawn.mock.calls[1][1]).toEqual(["scripts/build-e2e-application.mjs"]);
  expect(process.exitCode).toBe(1); expect(harness.dispose).toHaveBeenCalledOnce();
});

it("clears inherited build-completion flags and starts browsers only after a fresh successful build", async () => {
  harness.spawn.mockReturnValue({ status: 0, stdout: "collection" });
  await import("../scripts/run-e2e.mjs");
  expect(harness.spawn).toHaveBeenCalledTimes(3);
  expect(harness.spawn.mock.calls[0][1][0]).toBe("node_modules/@playwright/test/cli.js");
  expect(harness.spawn.mock.calls[0][2].env.HCA_E2E_BUILD_COMPLETE).toBe("");
  expect(harness.spawn.mock.calls[1][1]).toEqual(["scripts/build-e2e-application.mjs"]);
  expect(harness.spawn.mock.calls[1][2].env.HCA_E2E_BUILD_COMPLETE).toBe("");
  expect(harness.spawn.mock.calls[2][1][0]).toBe("node_modules/@playwright/test/cli.js");
  expect(harness.spawn.mock.calls[2][2].env.HCA_E2E_BUILD_COMPLETE).toBe("true");
  expect(process.exitCode).toBe(0); expect(harness.dispose).toHaveBeenCalledOnce();
});
