import { AuthenticatedPage } from "@/components/authenticated-page";
import { RequisitionWizard } from "@/components/requisitions/requisition-wizard";
export default function Page() {
  return (
    <AuthenticatedPage>
      <RequisitionWizard />
    </AuthenticatedPage>
  );
}
