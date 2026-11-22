import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatQuantity } from "@/lib/quantity";

export function PurchaseArrivalLinks({ linkedPurchase, priorPlanning, unit }: {
  linkedPurchase?: { documentId: string; code: string };
  priorPlanning?: { documentId: string; code: string; quantity: string };
  unit: string;
}) {
  if (!linkedPurchase && !priorPlanning) return null;
  return <div className="space-y-1">
    {linkedPurchase ? <p className="hca-arrival-summary"><Icon name="link" />Compra associada
      <Link href={`/fichas/${linkedPurchase.documentId}`}>{linkedPurchase.code}</Link></p> : null}
    {priorPlanning ? <p className="hca-arrival-summary"><Icon name="link" />
      <span>{formatQuantity(priorPlanning.quantity, unit)} para o planejamento da{" "}
        <Link href={`/fichas/${priorPlanning.documentId}`}>{priorPlanning.code}</Link></span></p> : null}
  </div>;
}
