import { AuthenticatedPage } from "@/components/authenticated-page";
import { TransferConsole } from "@/components/documents/transfer-console";

export default function Page() {
  return <AuthenticatedPage><TransferConsole source="CARE_TEAM" /></AuthenticatedPage>;
}
