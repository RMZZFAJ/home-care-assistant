import { z } from "zod";
import { quantity } from "@/lib/quantity";
export const exactQuantity = z
  .union([
    z
      .string()
      .max(64)
      .regex(/^\d+(?:[.,]\d+)?$/),
    z.number().finite().min(0).max(1_000_000_000),
  ])
  .transform((value) => quantity(value).toFixed())
  .refine(
    (value) =>
      quantity(value).gte(0) &&
      quantity(value).lte(1_000_000_000) &&
      quantity(value).decimalPlaces() <= 6,
    "Informe uma quantidade válida com até seis casas decimais.",
  );
