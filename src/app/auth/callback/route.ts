import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/safe-return-path";
import { appOrigin } from "@/lib/server/app-origin";
import { randomUUID } from "node:crypto";

function failed(origin: string, reason = "AUTH_CALLBACK_FAILED") {
  const correlationId = randomUUID();
  console.warn(
    JSON.stringify({ operation: "auth.callback", code: reason, correlationId }),
  );
  const response = NextResponse.redirect(
    new URL("/login?error=auth_callback", origin),
  );
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("x-correlation-id", correlationId);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin(request);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = safeReturnPath(requestedNext, origin);
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) return failed(origin);
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const safeCodes = [
        "flow_state_not_found",
        "flow_state_expired",
        "bad_code_verifier",
        "pkce_verifier_not_found",
      ];
      return failed(
        origin,
        safeCodes.includes(error.code ?? "")
          ? error.code!.toUpperCase()
          : "AUTH_CALLBACK_REJECTED",
      );
    }
  } catch {
    return failed(origin);
  }

  const response = NextResponse.redirect(new URL(next, origin));
  response.headers.set("cache-control", "private, no-store");
  return response;
}
