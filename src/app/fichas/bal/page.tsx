import { AuthenticatedPage } from "@/components/authenticated-page";
import { BalanceEntry } from "@/components/balances/balance-count-wizard";
export default function Page() {
  return (
    <AuthenticatedPage>
      <BalanceEntry />
    </AuthenticatedPage>
  );
}
