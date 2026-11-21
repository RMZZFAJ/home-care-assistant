import { pendingPurchaseExtras } from "@/lib/validation/pending-purchase-extras";

export function pendingPurchaseItems(payload: { pendingExtras?: unknown }, workflow?: Record<string, unknown>) {
  const items = pendingPurchaseExtras.safeParse(payload.pendingExtras).data ?? [];
  const resolutions = workflow?.purchaseExtraResolutions;
  if (!resolutions || typeof resolutions !== "object") return items;
  return items.filter(item => !Object.hasOwn(resolutions, item.id));
}
