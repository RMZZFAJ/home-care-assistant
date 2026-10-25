export type PatientContext = {
  id: string;
  display_name: string;
  active?: boolean;
  is_active?: boolean;
  is_development?: boolean;
  role: string;
  hasMembership?: boolean;
  permissions?: Record<string, boolean>;
  capabilities?: Record<string, boolean>;
  can_manage_stock?: boolean;
  can_count_stock?: boolean;
};
export type WorkspaceContext = {
  userId: string;
  fullName: string;
  isGlobalAdmin: boolean;
  globalAdministrationAllowed?: boolean;
  activeContext?: {
    mode: "global" | "patient";
    care_recipient_id: string | null;
    revision: number;
  } | null;
  patients: PatientContext[];
  patient?: PatientContext;
  refresh: () => Promise<void>;
};

