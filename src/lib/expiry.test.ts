import { describe, expect, it } from "vitest";
import { expiryFromDays, isExpired } from "./expiry";

const now = new Date("2026-01-01T12:00:00Z");

describe("isExpired", () => {
  it("treats a missing expiry as never expiring", () => {
    expect(isExpired(null, now)).toBe(false);
  });

  it("is false before the expiry and true at or after it", () => {
    expect(isExpired(new Date("2026-01-01T12:00:01Z"), now)).toBe(false);
    expect(isExpired(new Date("2026-01-01T12:00:00Z"), now)).toBe(true);
    expect(isExpired(new Date("2025-12-31T00:00:00Z"), now)).toBe(true);
  });
});

describe("expiryFromDays", () => {
  it("adds whole days to the given time", () => {
    expect(expiryFromDays(7, now).toISOString()).toBe("2026-01-08T12:00:00.000Z");
    expect(expiryFromDays(365, now).toISOString()).toBe("2027-01-01T12:00:00.000Z");
  });
});
