import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse battery!", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  it("normalises Unicode so visually identical passwords match", async () => {
    const composed = "café";
    const decomposed = "café";
    expect(await verifyPassword(decomposed, await hashPassword(composed))).toBe(true);
  });

  it.each(["", "nocolon", "abcd:", ":abcd", "00:00"])(
    "returns false for the malformed stored value %j",
    async (stored) => {
      expect(await verifyPassword("anything", stored)).toBe(false);
    },
  );
});
