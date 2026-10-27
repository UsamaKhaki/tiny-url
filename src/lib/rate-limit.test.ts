import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within one window, then blocks", () => {
    const key = "test:burst";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { max: 3 }).ok).toBe(true);
    }
    const blocked = rateLimit(key, { max: 3 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBe(60);
  });

  it("opens a fresh window once the previous one has passed", () => {
    const key = "test:window";
    rateLimit(key, { max: 1 });
    expect(rateLimit(key, { max: 1 }).ok).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(rateLimit(key, { max: 1 }).ok).toBe(true);
  });

  it("counts keys independently", () => {
    rateLimit("test:a", { max: 1 });
    expect(rateLimit("test:a", { max: 1 }).ok).toBe(false);
    expect(rateLimit("test:b", { max: 1 }).ok).toBe(true);
  });

  it("defaults to 20 requests per window", () => {
    const key = "test:default";
    for (let i = 0; i < 20; i++) rateLimit(key);
    expect(rateLimit(key).ok).toBe(false);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared local key", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBe("local");
    expect(clientIp(new Headers())).toBe("local");
  });
});
