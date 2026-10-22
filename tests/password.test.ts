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
    expect(newPasswordSchema.safeParse("á".repeat(36)).success).toBe(true);
    expect(newPasswordSchema.safeParse("á".repeat(37)).success).toBe(false);
    expect(newPasswordSchema.safeParse("short1!").success).toBe(false);
  });
});
