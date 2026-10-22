import { AuthenticatedPage } from "@/components/authenticated-page";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return <AuthenticatedPage><Dashboard /></AuthenticatedPage>;
}
