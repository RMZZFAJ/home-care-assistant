/** A Preview origin is navigation guidance, never an authorization source. */
export function stablePreviewOrigin(environment: string | undefined, host: string | undefined): string | null {
  if (environment !== "preview" || !host) return null;
  try {
    const url = new URL("https://" + host);
    return url.host === host && url.hostname.endsWith(".vercel.app") && !url.port && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}
