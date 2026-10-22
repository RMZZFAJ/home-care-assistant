import { NextResponse } from "next/server";
import { api, authenticate, databaseError, patientContext } from "@/lib/server/api";

export async function GET() {
  return api("context.read", async () => {
    const auth = await authenticate();
    const { data, error } = await auth.client.from("care_recipients").select("id").order("display_name");
    if (error) databaseError(error);
    const patients = await Promise.all((data ?? []).map(({ id }) => patientContext(auth, id)));
    return NextResponse.json({ data: { isGlobalAdmin: auth.isGlobalAdmin, patients, fullName: auth.fullName, userId: auth.userId } });
  });
}
