import { afterEach, describe, expect, it, vi } from "vitest";
import { getTestEnvironment } from "../scripts/test-environment.mjs";
import { getE2EEnvironment } from "../scripts/e2e-environment.mjs";

vi.mock("../scripts/test-environment.mjs", () => ({
  getTestEnvironment: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("browser execution environment", () => {
  it("replaces inherited remote credentials and external delivery settings", () => {
    vi.mocked(getTestEnvironment).mockReturnValue({
      url: "http://127.0.0.1:54321",
      anonKey: "verified-local-public-key",
      serviceKey: "verified-local-server-key",
    });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://remote.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "inherited-remote-key");
    vi.stubEnv("NOTIFICATIONS_EXTERNAL_ENABLED", "true");
    vi.stubEnv("META_FLOWS_ENABLED", "true");
    vi.stubEnv("META_WHATSAPP_ACCESS_TOKEN", "inherited-provider-token");
    vi.stubEnv("HCA_E2E_PORT", "3100");
    const env = getE2EEnvironment();
    expect(getTestEnvironment).toHaveBeenCalledOnce();
    expect(env).toMatchObject({
      HCA_E2E: "true",
      HCA_E2E_LOCAL: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "verified-local-public-key",
      SUPABASE_SERVICE_ROLE_KEY: "verified-local-server-key",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      NOTIFICATIONS_EXTERNAL_ENABLED: "false",
      META_FLOWS_ENABLED: "false",
      META_WHATSAPP_ACCESS_TOKEN: "",
      META_APP_SECRET: "",
      META_FLOWS_PRIVATE_KEY: "",
    });
  });

  it("refuses execution when the local project/container verification fails", () => {
    vi.mocked(getTestEnvironment).mockImplementation(() => {
      throw new Error("Refusing an unknown database container");
    });
    expect(getE2EEnvironment).toThrow("Refusing an unknown database container");
  });

  it("refuses a server port outside the local Auth redirects", () => {
    vi.mocked(getTestEnvironment).mockReturnValue({
      url: "http://127.0.0.1:54321",
      anonKey: "local-key",
      serviceKey: "local-service-key",
    });
    vi.stubEnv("HCA_E2E_PORT", "8080");
    expect(getE2EEnvironment).toThrow("HCA_E2E_PORT must be 3000 or 3100");
  });
});
