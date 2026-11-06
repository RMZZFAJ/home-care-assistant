import type { ScheduledShift, ShiftType } from "./schedules";
import type { BalanceCounter, SupplyPayload } from "./documents";
export type BalanceRecountContext = {
  documentId: string; patientId: string; code: string; documentVersion: number; status: string;
  counter: BalanceCounter; countVersion: number | null; notes: string;
  countWindow: SupplyPayload["balanceContext"] | null; isScheduled: boolean; hasRecountCycle: boolean;
  canAssign: boolean; requiresDesignation: boolean; referenceHash: string;
  activeAssignment: (BalanceAssignment & { professionalName: string | null; timezone: string | null }) | null;
  lastAssignment: BalanceAssignment | null; targets?: ScheduledShift[];
};
export type BalanceRecountResult = {
  assignmentId: string; documentId: string; documentVersion: number; code: string;
  counter: BalanceCounter; countVersion: number | null; professionalId: string; professionalName: string;
  startsAt: string; endsAt: string; timezone: string; shiftId: string; shiftVersion: number;
  reason: string; designerId: string; designerName: string; recordedAt: string;
};
export type BalanceAssignment = { id: string; cycle_id: string; shift_id: string; professional_id: string; starts_at: string; ends_at: string; status: string; version: number; kind: string; missed_at: string | null; professional_name?: string; type_name?: string };
export type BalanceRegime = { enabled: boolean; activated_at: string | null; weekday: number; timezone: string; shift_type_id: string; designated_professional_id: string | null; starts_on: string; version: number };
export type BalanceObligation = { id: string; cycle_id: string; week_start: string; original_start: string; original_due: string; effective_due: string; state: string; missed_at: string | null; count_document_id: string | null; regularized_by: string | null; actual_count_at: string | null };
export type BalanceDeferral = { id: string; assignment_id: string | null; target_shift_id: string; target_shift_version: number; target_snapshot: {starts_at:string;ends_at:string;professional_name:string;type_name:string}; reason: string; requested_by: string; status: string; decided_by: string | null; decision_reason: string | null; created_at: string; decided_at: string | null; decision_snapshot: null | {actor:{id:string;name:string};recordedAt:string;outcome:"approved"|"rejected";reason:string;deadlineChanged:boolean}; decisionContext: {canApprove:boolean;canReject:boolean;sourceCurrent:boolean;sourceDeadline:string|null;targetState:"unchanged"|"changed"|"ineligible"|"unavailable";proposedVersion:number;currentTarget:null|{version:number;status:string;starts_at:string;ends_at:string;professional_name:string;type_name:string}} };
export type BalanceWorkspace = { recountRecovery: { total: number; items: BalanceRecountContext[] }; enabled: boolean; referenceRevision: string; regime: BalanceRegime | null; types: ShiftType[]; professionals: { id: string; name: string }[]; eligibility: { available: boolean; assignment: BalanceAssignment | null; documentId: string | null; href: string; dueAt: string | null }; obligations: BalanceObligation[]; assignments: BalanceAssignment[]; deferrals: BalanceDeferral[]; targets: ScheduledShift[]; events: { id: string; action: string; reason: string; created_at: string; details: Record<string, unknown> }[] };
