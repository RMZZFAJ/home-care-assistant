import { AuthenticatedPage } from "@/components/authenticated-page";
import { UnitConsole } from "@/components/catalog/unit-console";
export default function Page() {
  return (
    <AuthenticatedPage>
      <UnitConsole />
    </AuthenticatedPage>
  );
}
