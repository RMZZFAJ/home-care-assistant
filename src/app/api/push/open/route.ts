import { z } from "zod";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";
import { notificationHref } from "@/lib/notifications/navigation";
const optionalId = z.string().uuid().nullable();
const target = z
  .object({
    care_recipient_id: z.string().uuid(),
    document_id: optionalId,
    requisition_id: optionalId,
    alert_event_id: optionalId,
    consumption_report_id: optionalId,
    reminder_id: optionalId,
    event_key: z.string().nullable(),
    operational_documents: z
      .object({ type: z.enum(["REQ", "COM", "ENT", "BAL"]) })
      .strict()
      .nullable(),
  })
  .strict();
export async function GET(request: Request) {
  return api("push.open", async () => {
    const id = parseUuid(new URL(request.url).searchParams.get("id"));
    const auth = await authenticate();
    const receipt = z
      .discriminatedUnion("state", [
        z.object({ state: z.literal("unavailable") }).strict(),
        z
          .object({
            state: z.literal("available"),
            noticeId: z.string().uuid(),
            careRecipientId: z.string().uuid(),
            careRecipientLabel: z.string().max(1000),
            target,
          })
          .strict()
          .refine(
            (value) => value.target.care_recipient_id === value.careRecipientId,
          ),
      ])
      .parse(await rpc(auth.client, "resolve_web_push", { p_id: id }));
    return Response.json(
      receipt.state === "unavailable"
        ? receipt
        : {
            state: receipt.state,
            careRecipientId: receipt.careRecipientId,
            careRecipientLabel: receipt.careRecipientLabel,
            href: notificationHref({
              ...receipt.target,
              event_key: receipt.target.event_key ?? undefined,
            }),
          },
    );
  });
}
