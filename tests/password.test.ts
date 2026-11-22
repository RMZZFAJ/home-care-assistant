import { describe, expect, it } from "vitest";
import { newPasswordSchema } from "@/lib/validation/password";
describe("configured Auth password boundaries", () => {
  it("accepts the full ASCII boundary and rejects an oversized password", () => {
    expect(newPasswordSchema.safeParse("A1!" + "x".repeat(69)).success).toBe(
      true,
    );
    expect(newPasswordSchema.safeParse("A1!" + "x".repeat(70)).success).toBe(
      false,
    );
  });
  it("checks encoded size and minimum length without truncating", () => {
    expect(newPasswordSchema.safeParse("A1!a" + "á".repeat(34)).success).toBe(true);
    expect(newPasswordSchema.safeParse("A1!a" + "á".repeat(35)).success).toBe(false);
    expect(newPasswordSchema.safeParse("Aa1!x").success).toBe(false);
  });
  it("requires every approved group at the six-character boundary", () => {
    expect(newPasswordSchema.safeParse("Aa1!xx").success).toBe(true);
    expect(newPasswordSchema.safeParse("Aa1!xxx").success).toBe(true);
    for (const value of ["aa1!xx", "AA1!XX", "Aa!!xx", "Aa11xx", "á".repeat(12)]) expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });
});
