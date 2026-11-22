"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { materialVisitParam, readMaterialVisit } from "@/lib/documents/material-visit";

const noSubscription = () => () => {};
const noServerVisit = (): false => false;

export function useMaterialVisit(targetId: string, patientId: string) {
  const token = useSearchParams().get(materialVisitParam);
  return useSyncExternalStore<string | null | false>(noSubscription,
    () => token ? readMaterialVisit(targetId, patientId, token) : false,
    noServerVisit,
  );
}

export function MaterialVisitReturn({ targetId, patientId }: { targetId: string; patientId: string }) {
  const router = useRouter();
  const visit = useMaterialVisit(targetId, patientId);
  if (visit === false) return null;
  return <button className="hca-material-panel-back" type="button" onClick={() => router.back()}>
    <Icon name="back" width={14} height={14} />Voltar ao painel
  </button>;
}
