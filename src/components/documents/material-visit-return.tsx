"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { materialVisitParam, matchesMaterialVisit } from "@/lib/documents/material-visit";

const noSubscription = () => () => {};
const noServerVisit = () => false;

export function MaterialVisitReturn({ targetId, patientId }: { targetId: string; patientId: string }) {
  const router = useRouter();
  const token = useSearchParams().get(materialVisitParam);
  const canReturn = useSyncExternalStore(noSubscription,
    () => Boolean(token && matchesMaterialVisit(targetId, patientId, token)),
    noServerVisit,
  );
  if (!canReturn) return null;
  return <button className="hca-material-panel-back" type="button" onClick={() => router.back()}>
    <Icon name="back" width={14} height={14} />Voltar ao painel
  </button>;
}
