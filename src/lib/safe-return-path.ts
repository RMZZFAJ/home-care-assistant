/** Resolve first: backslashes and encoded authority must never become an external redirect. */
export function safeReturnPath(value: string | null, origin: string): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return "/";
  try {
    const target = new URL(value, origin);
    if (target.origin !== new URL(origin).origin) return "/";
    const allowed = ["/", "/historico", "/admin", "/estoque", "/inventarios", "/recuperar-senha", "/convites/aceitar"];
    if (!allowed.some((path) => target.pathname === path || (path !== "/" && target.pathname.startsWith(`${path}/`)))) return "/";
    return `${target.pathname}${target.search}`;
  } catch { return "/"; }
}
