import { NextResponse } from "next/server";
import { api, authenticatedIdentity, rpc } from "@/lib/server/api";

export async function GET() {
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
    const avatarUrl = avatarPath
      ? ((
          await client.storage
            .from("profile-avatars")
            .createSignedUrl(avatarPath, 900)
        ).data?.signedUrl ?? null)
      : null;
    return NextResponse.json({ data: { ...workspace, avatarUrl } });
  });
}
