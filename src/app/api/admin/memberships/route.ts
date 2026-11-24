import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseQuery, readJson, rpc } from "@/lib/server/api";
import {
  reviewedMembershipCommand,
  reviewedMembershipQuery,
  reviewedMembershipReference,
  verifyReviewedMembership,
} from "@/lib/validation/reviewed-membership";

const headers = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  return api("membership.review.read", async () => {
    const params = new URL(request.url).searchParams;
    const read = (key: string) => params.getAll(key).length === 1 ? params.get(key) : null;
    const query = parseQuery(reviewedMembershipQuery, {
      patientId: read("patientId"), mode: read("mode"), purpose: read("purpose"),
      targetId: read("targetId"), selection: read("selection"),
    });
    const { client } = await authenticate();
    const reference = await rpc(client, "reviewed_membership_reference", {
      p_patient: query.patientId, p_mode: query.mode, p_purpose: query.purpose,
      p_target: query.targetId, p_selection: query.selection,
    });
    return NextResponse.json(reviewedMembershipReference.parse(reference), { headers });
  });
}

export async function POST(request: Request) {
  return api("membership.review.command", async () => {
    const command = await readJson(request, reviewedMembershipCommand);
    const { client } = await authenticate();
    const { data, error } = await client.rpc("reviewed_membership_command", {
      p_patient: command.patientId, p_mode: command.mode, p_purpose: command.purpose,
      p_target: command.targetId, p_key: command.key,
      p_fields: command.intent?.fields ?? null, p_reference_hash: command.intent?.referenceHash ?? null,
    });
    if (error?.code === "PT409" && error.message === "stale administrative preparation reference") {
      throw new ApiError("VERSION_CONFLICT", "O vínculo mudou durante a revisão. Reabra a edição para conferir os dados atuais.");
    }
    if (error) databaseError(error);
    return NextResponse.json(verifyReviewedMembership(command, data), { headers });
  });
}
