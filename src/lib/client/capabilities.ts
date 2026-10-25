import type { WorkspaceContext } from "@/types/workspace";

export function can(context: WorkspaceContext, capability: string) {
  return context.patient?.capabilities?.[capability] === true;
}
export function may(
  context: WorkspaceContext,
  operation: "request" | "manage" | "manageStock" | "countStock",
) {
  if (
    !context.patient ||
    ((context.patient.active === false ||
      context.patient.is_active === false) &&
      operation !== "manage")
  )
    return false;
  const capability = {
    request: "req.create",
    manage: "access.manage",
    manageStock: "stock.family.manage",
    countStock: "bal.count",
  }[operation];
  if (context.patient.capabilities) return can(context, capability);
  return (
    context.patient.permissions?.[
      {
        request: "canRequest",
        manage: "canManage",
        manageStock: "canManageStock",
        countStock: "canCountStock",
      }[operation]
    ] === true
  );
}

