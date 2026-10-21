export type PatientPermissions = { canManage: boolean; canRequest: boolean; canManageStock: boolean; canCountStock: boolean };
export type PatientContext = { id: string; display_name: string; is_active: boolean; role: string; permissions: PatientPermissions };
export type OperationError = { error: string; code: string; retryable: boolean; correlationId: string };
