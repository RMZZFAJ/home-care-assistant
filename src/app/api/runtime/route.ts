import { createClient } from "@supabase/supabase-js";
import contract from "@/lib/pwa/contract.json";
import { api } from "@/lib/server/api";

export const dynamic = "force-dynamic";
function unavailable(state: "incompatible" | "unavailable") {
  return Response.json(
    {
      state,
      code:
        state === "incompatible"
          ? "RUNTIME_INCOMPATIBLE"
          : "RUNTIME_UNAVAILABLE",
    },
    { status: 503 },
  );
}
async function readRuntime() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return unavailable("unavailable");
    // Compatibility is public and independent of cookies or an expired account.
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await client
      .rpc("client_schema_contract")
      .abortSignal(AbortSignal.timeout(5000));
    if (error)
      return unavailable(
        ["PGRST202", "42883"].includes(error.code)
          ? "incompatible"
          : "unavailable",
      );
    const compatible =
      data?.protocol === contract.protocol && data?.schema === contract.schema;
    return compatible
      ? Response.json({ state: "ready", ...contract })
      : unavailable("incompatible");
  } catch {
    return unavailable("unavailable");
  }
}
export async function GET() {
  return api("runtime.compatibility", readRuntime);
}
