import type { BalanceDeferral } from "@/types/balances";
export const weekDays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
export type BalanceEditor =
  | { kind: "configure" }
  | { kind: "defer"; family: boolean }
  | { kind: "decide"; deferral: BalanceDeferral; approve: boolean }
  | { kind: "assign"; cycleId: string; allowDeferral: boolean };
