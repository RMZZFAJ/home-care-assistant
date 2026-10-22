import { AuthenticatedPage } from "@/components/authenticated-page";
import { DocumentHistory } from "@/components/documents/document-history";

export default function HistoryPage() {
  return <AuthenticatedPage><DocumentHistory /></AuthenticatedPage>;
}
