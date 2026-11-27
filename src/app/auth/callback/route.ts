import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/safe-return-path";
import { contactEmailIntent, contactReviewPath } from "@/lib/auth/contact";
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

function redirectPrivate(origin: string, destination: string) {
  const response = NextResponse.redirect(new URL(destination, origin));
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin(request);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = safeReturnPath(requestedNext, origin);
  const contactEmail = url.searchParams.get("intent") === contactEmailIntent && next === contactReviewPath;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return failed(origin);

  const reviewContact = async () => {
    // The return parameters only select the screen. The account's authenticated
    // read decides whether the address is pending or has already changed.
    const { data: { user } } = await supabase.auth.getUser();
    return redirectPrivate(origin, user ? contactReviewPath : "/login?next=" + encodeURIComponent(contactReviewPath));
  };

  if (!code) {
    if (contactEmail && url.searchParams.has("message") && !url.searchParams.has("error"))
      return reviewContact();
    return failed(origin);
  }
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const safeCodes = [
        "flow_state_not_found",
        "flow_state_expired",
        "bad_code_verifier",
        "pkce_verifier_not_found",
      ];
      if (contactEmail && safeCodes.includes(error.code ?? "")) return reviewContact();
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

  return redirectPrivate(origin, contactEmail ? "/acesso/continuar?next=" + encodeURIComponent(next) : next);
}
