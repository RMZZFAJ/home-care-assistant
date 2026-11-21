"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/primitives";
export function MetricCard({ label, value, href, icon, action }: { label: string; value: number; href: string; icon: IconName; action: string }) {
  return <Link href={href} className="card av-metric" prefetch={false}><div><span className="metric-icon"><Icon name={icon} width={18} height={18} /></span><span>{label}</span><strong>{value}</strong></div><span className="metric-link">{action}<Icon name="arrow" width={15} height={15} /></span></Link>;
}
