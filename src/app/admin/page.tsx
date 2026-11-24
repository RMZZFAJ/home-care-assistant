import { AuthenticatedPage } from "@/components/authenticated-page";
import { AdminConsole } from "@/components/admin/admin-console";
import { redirect } from "next/navigation";

type AdminQuery = Promise<{ section?: string | string[]; careRecipientId?: string | string[] }>;

async function Administration({ searchParams }: { searchParams: AdminQuery }) {
  const { section, careRecipientId } = await searchParams;
  if (section === "alerts" || section === "notificationRecipients") {
    const query = new URLSearchParams({ area: section === "alerts" ? "thresholds" : "notifications" });
    if (typeof careRecipientId === "string") query.set("careRecipientId", careRecipientId);
    redirect(`/configuracoes?${query}`);
  }
  return <AdminConsole />;
}

export default function AdminPage({ searchParams }: { searchParams: AdminQuery }) {
  return <AuthenticatedPage><Administration searchParams={searchParams} /></AuthenticatedPage>;
}
