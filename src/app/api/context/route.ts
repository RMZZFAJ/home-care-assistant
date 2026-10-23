import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticatedIdentity, readJson, rpc, uuid } from "@/lib/server/api";

export async function POST(request: Request) {
  return api("context.select", async () => {
    const input = await readJson(request, z.object({ careRecipientId: uuid.nullable() }).strict());
    const { client } = await authenticatedIdentity();
    return NextResponse.json({ data: await rpc(client, "select_active_context", { p_patient: input.careRecipientId }) });
  });
}

export async function GET(request: Request) {
  return api("context.read", async () => {
    const { client } = await authenticatedIdentity();
    const result = (await rpc(client, "my_workspace")) as {
      userId: string;
      fullName: string;
      isGlobalAdmin: boolean;
      patients: unknown[];
      avatarPath: string | null;
    };
    const { avatarPath, ...workspace } = result;
    const documentId = new URL(request.url).searchParams.get("documentId");
    const documentContext = uuid.safeParse(documentId).success ? await rpc(client, "document_navigation_context", { p_id: documentId }) : null;
    const avatarUrl = avatarPath
      ? ((
          await client.storage
            .from("profile-avatars")
            .createSignedUrl(avatarPath, 900)
        ).data?.signedUrl ?? null)
      : null;
    return NextResponse.json({ data: { ...workspace, avatarUrl, documentContext } });
  });
}
