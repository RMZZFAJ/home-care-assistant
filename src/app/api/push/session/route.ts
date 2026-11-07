import {
  api,
  authenticate,
  rpc,
  validateMutationRequest,
} from "@/lib/server/api";
export async function POST(request: Request) {
  return api("push.session.revoke", async () => {
    validateMutationRequest(request, false);
    const auth = await authenticate();
    await rpc(auth.client, "revoke_web_push_session");
    return Response.json({ ok: true });
  });
}
