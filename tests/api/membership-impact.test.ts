import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/admin/membership-impact/route";
describe("membership consequence query boundary", () => {
  it("rejects missing and malformed target identities before authentication", async () => {
    for (const target of ["", "not-a-uuid", "null"]) {
      const response = await GET(
        new Request(
          "https://care.example/api/admin/membership-impact?careRecipientId=20000000-0000-4000-8000-000000000001&userId=" +
            target,
        ),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});
