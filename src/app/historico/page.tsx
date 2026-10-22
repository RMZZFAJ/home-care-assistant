import { AuthenticatedPage } from "@/components/authenticated-page";
import { RequisitionHistory } from "@/components/requisitions/requisition-history";

export default function HistoryPage() {
  return <AuthenticatedPage><RequisitionHistory /></AuthenticatedPage>;
}
