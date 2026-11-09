import { ApiError, rpc } from "./api";
import type { RequisitionDraftInput } from "@/lib/validation/requisition-decisions";
import type { RequisitionOperationPurpose } from "@/lib/validation/supply-drafts";

export function commitRequisitionDraft(
  client: Parameters<typeof rpc>[0],
  id: string,
  action: RequisitionOperationPurpose,
  input: RequisitionDraftInput,
  body: { reason: string; itemId?: string; productId?: string },
) {
  if (!input.draftCommit || !input.expectedVersion || !input.idempotencyKey)
    throw new ApiError(
      "VALIDATION_ERROR",
      "Confira a revisão privada e a identidade desta tentativa.",
    );
  return rpc(client, "commit_supply_draft", {
    p_id: input.draftCommit.id,
    p_expected: input.draftCommit.revision,
    p_target: id,
    p_key: input.idempotencyKey,
    p_body: { action, expectedVersion: input.expectedVersion, body },
  });
}
