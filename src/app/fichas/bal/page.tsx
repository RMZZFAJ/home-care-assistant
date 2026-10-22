import { AuthenticatedPage } from "@/components/authenticated-page";
import { SupplyWizard } from "@/components/documents/supply-wizard";
export default function Page() { return <AuthenticatedPage><SupplyWizard type="BAL" /></AuthenticatedPage>; }
