import { z } from "zod";
import { maximumIssuanceObservations, maximumIssuanceObservationLength } from "@/lib/documents/issuance-observations";

export const issuanceObservationDraft = z.array(z.string().max(maximumIssuanceObservationLength)).max(maximumIssuanceObservations);
export const issuedObservations = z.array(z.string().trim().min(1).max(maximumIssuanceObservationLength)).max(maximumIssuanceObservations);
