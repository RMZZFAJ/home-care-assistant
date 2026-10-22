import { createClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/server/api";

/** Server-only privileged client. Every caller first verifies a session, worker secret or signed webhook and uses narrowly scoped RPCs. */
export function createWorkerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(
      "WORKER_NOT_CONFIGURED",
      "O processamento externo ainda não foi configurado.",
      503,
    );
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
