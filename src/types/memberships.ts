export type ImpactSet<T> = {
  available: boolean;
  total: number | null;
  items: T[];
};
export type MembershipImpactData = {
  careRecipientId: string;
  userId: string;
  checkedAt: string;
  member: { name: string; role: string; status: string };
  deliveries: ImpactSet<{
    id: string;
    code: string;
    status: string;
    lineCount: number;
    lines: {
      id: string;
      name: string;
      unit: string;
      acceptedQuantity: string;
      pendingQuantity: string;
    }[];
  }>;
  regularizations: ImpactSet<{
    id: string;
    documentId: string;
    code: string;
    state: string;
    responsibilities: ("proposal" | "review" | "follow_up")[];
  }>;
  balances: ImpactSet<{
    id: string;
    shiftId: string;
    status: string;
    kind: string;
    startsAt: string;
    endsAt: string;
  }>;
  deferrals: ImpactSet<{
    id: string;
    assignmentId: string;
    status: string;
    startsAt: string;
    endsAt: string;
  }>;
  shifts: ImpactSet<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
  }>;
  shiftChanges: ImpactSet<{
    id: string;
    shiftId: string;
    status: string;
    startsAt: string;
    endsAt: string;
  }>;
};
