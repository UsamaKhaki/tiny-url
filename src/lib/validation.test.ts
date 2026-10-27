import { describe, expect, it } from "vitest";
import {
  assertSafeUrl,
  InvalidDestinationError,
  normalizeUrl,
  parseDestination,
  shortenSchema,
} from "./validation";

describe("normalizeUrl", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(normalizeUrl("  example.com/path ")).toBe("https://example.com/path");
  });

  it("keeps an existing http or https scheme", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("HTTPS://example.com")).toBe("HTTPS://example.com");
  });
});

describe("assertSafeUrl", () => {
  it("accepts public http and https destinations", () => {
    expect(assertSafeUrl("https://example.com/a?b=1").hostname).toBe("example.com");
    expect(assertSafeUrl("http://sub.example.co.uk").protocol).toBe("http:");
  });

  it.each(["ftp://example.com", "javascript:alert(1)", "data:text/html,hi"])(
    "rejects the non-http scheme in %s",
    (value) => {
      expect(() => assertSafeUrl(value)).toThrow(InvalidDestinationError);
    },
  );

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://intranet/",
  ])("rejects the private or local host in %s", (value) => {
    expect(() => assertSafeUrl(value)).toThrow("Private and local addresses");
  });

  it("does not treat 172.32.x.x as private", () => {
    expect(() => assertSafeUrl("http://172.32.0.1")).not.toThrow();
  });

  it("rejects input that is not a URL at all", () => {
    expect(() => assertSafeUrl("not a url")).toThrow("valid URL");
  });
});

describe("parseDestination", () => {
  it("normalises and returns the destination", () => {
    expect(parseDestination("example.com/x", "trace.test").toString()).toBe(
      "https://example.com/x",
    );
  });

  it("refuses links that point back at the shortener", () => {
    expect(() => parseDestination("https://trace.test/abc1234", "trace.test")).toThrow(
      "already points at this shortener",
    );
  });

  it("compares hosts including the port", () => {
    expect(() => parseDestination("https://trace.test:8443/x", "trace.test")).not.toThrow();
  });
});

describe("shortenSchema", () => {
  it("treats a blank alias as no alias", () => {
    const result = shortenSchema.parse({ url: "example.com", slug: "   " });
    expect(result.slug).toBeUndefined();
  });

  it("accepts a valid custom alias", () => {
    expect(shortenSchema.parse({ url: "example.com", slug: "spring-sale" }).slug).toBe(
      "spring-sale",
    );
  });

  it.each(["ab", "has space", "emoji-✓", "a".repeat(33)])("rejects the alias %s", (slug) => {
    expect(shortenSchema.safeParse({ url: "example.com", slug }).success).toBe(false);
  });

  it("rejects reserved aliases regardless of case", () => {
    const result = shortenSchema.safeParse({ url: "example.com", slug: "Dashboard" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("That alias is reserved.");
  });

  it("coerces expiresInDays from a form string", () => {
    expect(shortenSchema.parse({ url: "example.com", expiresInDays: "7" }).expiresInDays).toBe(7);
  });

  it.each([0, 366, 1.5])("rejects expiresInDays of %s", (expiresInDays) => {
    expect(shortenSchema.safeParse({ url: "example.com", expiresInDays }).success).toBe(false);
  });

  it("requires a url", () => {
    expect(shortenSchema.safeParse({ url: "" }).success).toBe(false);
  });
});
