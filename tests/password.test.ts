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
    expect(newPasswordSchema.safeParse("short1!").success).toBe(false);
  });
  it("requires every approved group at the eight-character boundary", () => {
    expect(newPasswordSchema.safeParse("Aa1!xxxx").success).toBe(true);
    for (const value of ["aa1!xxxx", "AA1!XXXX", "Aa!!xxxx", "Aa11xxxx", "á".repeat(12)]) expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });
});
