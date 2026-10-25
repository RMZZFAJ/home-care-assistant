import { AuthenticatedPage } from "@/components/authenticated-page";
import { BalanceConsole } from "@/components/balances/balance-console";
export default function Page() { return <AuthenticatedPage><BalanceConsole /></AuthenticatedPage>; }
