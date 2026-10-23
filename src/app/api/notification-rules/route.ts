import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";

export const notificationEvents = ["req.issued","req.registered_author","req.science_satisfied","req.completed","req.reminder","req.archived.manual","req.archived.automatic","com.issued","com.approve","com.receive","com.validate_receipt","ent.issued","ent.receive","ent.resolve","ent.reassign","ent.cancel","ent.reminder","bal.issued","bal.approve","stock.alert","occurrence.received","bal.reminder","shift.reminder"];
export async function GET(request: Request) {
  return api("notifications.rules", async () => {
    const auth = await authenticate();
    const patient = parseUuid(new URL(request.url).searchParams.get("careRecipientId"));
    const data = await rpc(auth.client, "patient_notification_rules", { p_patient: patient });
    const channels = [{ code: "internal", label: "Aplicativo" }];
    if (process.env.NOTIFICATIONS_EXTERNAL_ENABLED === "true" && process.env.META_WHATSAPP_ACCESS_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID) channels.push({ code: "whatsapp", label: "WhatsApp" });
    return NextResponse.json({ rules: data, events: notificationEvents, channels });
  });
}
