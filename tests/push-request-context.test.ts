import { it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pushRequestContext, requirePushRequestContext } from "@/lib/server/push-request-context";
const user = "94000000-0000-4000-8000-000000000001", session = "94000000-0000-4000-8000-000000000002";
const configuration = { keyVersion: "key-v1", publicKey: "public-key-v1" };
function auth(claims: Record<string, unknown> | null = { sub: user, session_id: session }, error: unknown = null) {
  return { userId: user, client: { auth: { getClaims: vi.fn(async () => ({ data: claims ? { claims } : null, error })) } } as unknown as SupabaseClient };
}
it("pins the verified account, session and key pair while ordinary JWT refresh and metadata changes preserve the same reference", async () => {
  const first = await pushRequestContext(auth(), configuration);
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  expect(await pushRequestContext(auth({ sub: user, session_id: session, exp: 9999999999, user_metadata: { administrator: true } }), configuration)).toBe(first);
  for (const changed of [auth({ sub: user, session_id: "94000000-0000-4000-8000-000000000003" }), { ...auth({ sub: "94000000-0000-4000-8000-000000000004", session_id: session }), userId: "94000000-0000-4000-8000-000000000004" }])
    expect(await pushRequestContext(changed, configuration)).not.toBe(first);
  expect(await pushRequestContext(auth(), { ...configuration, keyVersion: "key-v2" })).not.toBe(first);
  expect(await pushRequestContext(auth(), { ...configuration, publicKey: "replacement-key" })).not.toBe(first);
});
it("rejects absent, invalid or differently owned verified sessions instead of deriving authority from a supplied browser reference", async () => {
  for (const invalid of [auth(null), auth({ sub: user }), auth({ sub: user, session_id: "invalid" }), auth({ sub: "another-user", session_id: session }), auth({ sub: user, session_id: session }, new Error("private provider diagnostic"))])
    await expect(pushRequestContext(invalid, configuration)).rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 401 });
});
it("requires a fresh matching precondition for every mutation, including same-account reauthentication and key replacement", async () => {
  const current = auth(), reference = await pushRequestContext(current, configuration);
  await expect(requirePushRequestContext(current, reference, configuration)).resolves.toBeUndefined();
  for (const stale of [undefined, "0".repeat(64)])
    await expect(requirePushRequestContext(current, stale, configuration)).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
  await expect(requirePushRequestContext(auth({ sub: user, session_id: "94000000-0000-4000-8000-000000000003" }), reference, configuration)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await expect(requirePushRequestContext(current, reference, { ...configuration, publicKey: "replacement-key" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
});
it("keeps preferences and revocation available without a signing configuration while refusing an old configured reference", async () => {
  const current = auth(), unavailable = await pushRequestContext(current, null);
  await expect(requirePushRequestContext(current, unavailable, null)).resolves.toBeUndefined();
  await expect(requirePushRequestContext(current, await pushRequestContext(current, configuration), null)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
});
