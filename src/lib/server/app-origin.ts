// Only deployment metadata supplied by Vercel can extend the configured origin.
// Forwarded host headers and arbitrary request origins never establish trust.
export function appOrigins(request: Request): Set<string> {
  const origins = new Set([new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin]);
  if (process.env.VERCEL_ENV === "preview") {
    for (const host of [process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL]) {
      if (host && /^[a-z0-9-]+\.vercel\.app$/i.test(host)) origins.add(`https://${host.toLowerCase()}`);
    }
  }
  return origins;
}

export function appOrigin(request: Request): string {
  const allowed=appOrigins(request);
  for (const candidate of [request.headers.get("origin"),request.url]) {
    if (!candidate) continue;
    try { const origin=new URL(candidate).origin; if(allowed.has(origin))return origin; } catch { /* use the configured fallback */ }
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL && allowed.has(`https://${process.env.VERCEL_URL.toLowerCase()}`)) return `https://${process.env.VERCEL_URL.toLowerCase()}`;
  return allowed.values().next().value!;
}
