import { AuthenticatedPage } from "@/components/authenticated-page";
import { AdminConsole } from "@/components/admin/admin-console";

export default function AdminPage() {
  return <AuthenticatedPage><AdminConsole /></AuthenticatedPage>;
}
