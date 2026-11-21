import type {
  CreationDraft,
  CreationDraftContent,
} from "@/types/creation-drafts";
import type { CreationDraftController } from "@/components/forms/use-creation-draft";

function visibleContent(
  content: CreationDraftContent | null,
): CreationDraftContent | null {
  if (!content || !("movement" in content)) return content;
  const movement = { ...content.movement };
  delete movement.observedBalance;
  delete movement.referenceLabel;
  return { ...content, movement };
}
function visibleRow(row: CreationDraft | null): CreationDraft | null {
  if (!row) return null;
  const receipt = row.consumedResult;
  if (!receipt || !("preparedMovement" in receipt))
    return { ...row, content: visibleContent(row.content) };
  const preparedMovement = { ...receipt.preparedMovement };
  delete preparedMovement.observedBalance;
  delete preparedMovement.referenceLabel;
  return {
    ...row,
    content: visibleContent(row.content),
    consumedResult: { ...receipt, preparedMovement },
  };
}
/** Display masking never edits the original journal packet or its recovery methods. */
export function stockPreparationDisplay(
  draft: CreationDraftController,
  canReadBalance: boolean,
): CreationDraftController {
  if (canReadBalance) return draft;
  return {
    ...draft,
    base: visibleRow(draft.base),
    offered: visibleRow(draft.offered),
    comparison: visibleRow(draft.comparison),
    consumed: visibleRow(draft.consumed),
    pending: draft.pending?.content
      ? { ...draft.pending, content: visibleContent(draft.pending.content)! }
      : draft.pending,
  };
}
