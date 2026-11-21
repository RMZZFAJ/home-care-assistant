import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, readJson } from "@/lib/server/api";
import { commandMyAvatar, readMyAvatar, uploadMyAvatar } from "@/lib/server/avatar";
import { avatarCommandSchema } from "@/lib/validation/avatar";

export const maxDuration = 60;
export async function GET(request: Request) {
  return api("profile.avatar.read", async () => {
    const key = new URL(request.url).searchParams.get("key");
    return NextResponse.json(await readMyAvatar(await authenticate(), key === null ? null : parseUuid(key)));
  });
}
export async function POST(request: Request) {
  return api("profile.avatar.write", async () => {
    const auth = await authenticate();
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) return uploadMyAvatar(request, auth);
    const input = await readJson(request, avatarCommandSchema);
    return commandMyAvatar(auth, input.action, input.key);
  });
}
