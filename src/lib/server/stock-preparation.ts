import { ApiError, patientContext } from "./api";

/** Read/recovery may target inactive patients;DB distinguishes new active writes from replay. */
export async function stockPreparationContext(
  auth: Parameters<typeof patientContext>[0],
  patientId: string,
) {
  const patient = await patientContext(auth, patientId);
  if (
    !patient.capabilities["stock.family.read"] &&
    !patient.capabilities["stock.family.manage"]
  )
    throw new ApiError(
      "FORBIDDEN",
      "Você não tem autorização para consultar este preenchimento.",
      403,
    );
  return patient;
}
