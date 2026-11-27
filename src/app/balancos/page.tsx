import { AuthenticatedPage } from "@/components/authenticated-page";
import { ShiftBalanceHub } from "@/components/schedules/shift-balance-hub";
export default function Page() { return <AuthenticatedPage><ShiftBalanceHub entry="balances" /></AuthenticatedPage>; }
