import { NextResponse } from "next/server";
import { z } from "zod";
import type { ContextData } from "@/components/layout/workspace-context";
import {
  api,
  ApiError,
  authenticatedIdentity,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

export async function POST(request: Request) {
  return api("context.select", async () => {
    const input = await readJson(
      request,
      z.strictObject({ careRecipientId: uuid.nullable(), expectedActor: uuid.optional() }),
    );
    const { client, user } = await authenticatedIdentity();
    if (input.expectedActor && input.expectedActor !== user.id) {
      throw new ApiError("VERSION_CONFLICT", "A conta mudou. Entre com a conta convidada para selecionar a residência.");
    }
    return NextResponse.json({
      data: await rpc(client, "select_active_context", {
        p_patient: input.careRecipientId,
      }),
    });
  });
}

export async function GET(request: Request) {
  return api("context.read", async () => {
    const { client } = await authenticatedIdentity();
    const result = (await rpc(client, "my_workspace")) as Omit<ContextData, "avatarUrl" | "documentContext"> & {
      avatarPath: string | null;
    };
    const { avatarPath, ...workspace } = result;
    const params = new URL(request.url).searchParams;
    const documentId = params.get("documentId");
    const document = uuid.safeParse(documentId).success
      ? await rpc(client, "document_navigation_context", { p_id: documentId }) as { patientId: string; displayName: string; type: string } | null
      : null;
    const documentContext = document ? { ...document, id: documentId } : null;
    if (params.get("view") === "entry") {
      const memberships = workspace.patients.filter(patient => patient.hasMembership);
      const activeMemberships = memberships.filter(patient => patient.is_active !== false);
      const requested = params.get("patientId");
      return NextResponse.json({ data: {
        userId: workspace.userId,
        isGlobalAdmin: workspace.isGlobalAdmin,
        activeContext: workspace.activeContext,
        singleMembershipId: activeMemberships.length === 1 ? activeMemberships[0].id : null,
        patients: requested ? memberships.filter(patient => patient.id === requested) : [],
        documentContext,
      } });
    }
    const avatarUrl = avatarPath
      ? ((
          await client.storage
            .from("profile-avatars")
            .createSignedUrl(avatarPath, 900)
        ).data?.signedUrl ?? null)
      : null;
    return NextResponse.json({
      data: { ...workspace, avatarUrl, documentContext },
    });
  });
}
