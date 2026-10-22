import { getTestEnvironment } from "./test-environment.mjs";

export function getE2EEnvironment() {
  const backend = getTestEnvironment();
  const port = process.env.HCA_E2E_PORT ?? "3100";
  if (!["3000", "3100"].includes(port))
    throw new Error("HCA_E2E_PORT must be 3000 or 3100, matching local Auth redirects.");
  return {
    ...process.env,
    HCA_E2E: "true",
    HCA_E2E_LOCAL: "1",
    HCA_E2E_PORT: port,
    NEXT_PUBLIC_SUPABASE_URL: backend.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: backend.anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: backend.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: backend.serviceKey,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
    CARE_RECIPIENT_ID: "",
    NOTIFICATIONS_EXTERNAL_ENABLED: "false",
    NOTIFICATIONS_WORKER_SECRET: "local-test-worker-only",
    META_FLOWS_ENABLED: "false",
    META_WHATSAPP_ACCESS_TOKEN: "",
    META_APP_SECRET: "",
    META_FLOWS_PRIVATE_KEY: "",
    META_FLOWS_PRIVATE_KEY_PASSPHRASE: "",
    META_WEBHOOK_VERIFY_TOKEN: "",
  };
}
