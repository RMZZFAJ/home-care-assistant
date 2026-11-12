import type { Request } from "@playwright/test";

/** A foreground display report is expected on an issued ficha. It is not an
 * operational command; the access suite independently proves its authorization,
 * grouping and absence of SCI, documentary or stock effects. Other requests,
 * methods, origins and malformed bodies remain counted by read-only tests. */
export function isDocumentAccessReport(request: Request) {
  const url = new URL(request.url());
  if (request.method() !== "POST" || url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !["3000","3100"].includes(url.port)
    || !/^\/api\/documents\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/access$/i.test(url.pathname)) return false;
  try {
    const body = request.postDataJSON() as { key?: unknown; referenceVersion?: unknown };
    return body !== null && typeof body === "object" && Object.keys(body).sort().join(",") === "key,referenceVersion"
      && typeof body.key === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.key)
      && typeof body.referenceVersion === "number" && Number.isInteger(body.referenceVersion) && body.referenceVersion > 0 && body.referenceVersion <= 2147483647;
  } catch { return false; }
}
