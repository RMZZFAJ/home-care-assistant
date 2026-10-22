import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/safe-return-path";
import { appOrigin } from "@/lib/server/app-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin(request);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = safeReturnPath(requestedNext, origin);
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
    }
  } catch { return NextResponse.redirect(new URL("/login?error=auth_callback", origin)); }

  return NextResponse.redirect(new URL(next, origin));
}
