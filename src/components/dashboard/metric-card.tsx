"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/primitives";
export function MetricCard({ label, value, href, icon }: { label: string; value: number; href: string; icon: IconName }) {
  return <Link href={href} className="hca-metric-card" prefetch={false}><span><span className="hca-metric-label">{label}</span><strong>{value}</strong></span><span className="hca-task-icon"><Icon name={icon} /></span></Link>;
}
