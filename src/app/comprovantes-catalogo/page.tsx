import { AuthenticatedPage } from "@/components/authenticated-page";
import { CatalogueReceiptConsole } from "@/components/catalog/catalogue-receipt-console";

export default function Page() {
  return <AuthenticatedPage><CatalogueReceiptConsole /></AuthenticatedPage>;
}
