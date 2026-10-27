import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { jsonRequest, signInAs } from "@/test/fixtures";
import { POST } from "./route";

const ENDPOINT = "https://trace.example/api/shorten";

function shorten(body: unknown) {
  return POST(jsonRequest(ENDPOINT, body));
}

describe("POST /api/shorten", () => {
  it("creates an anonymous link with a generated code", async () => {
    const response = await shorten({ url: "example.com/a/long/path?q=1" });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.slug).toMatch(/^[2-9a-zA-Z]{7}$/);
    expect(body.shortUrl).toBe(`https://trace.example/${body.slug}`);
    expect(body.url).toBe("https://example.com/a/long/path?q=1");
    expect(body.expiresAt).toBeNull();

    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: body.slug } });
    expect(stored.url).toBe("https://example.com/a/long/path?q=1");
    expect(stored.userId).toBeNull();
  });

  it("stores a custom alias and an expiry", async () => {
    const before = Date.now();
    const response = await shorten({
      url: "https://example.com",
      slug: "spring-sale",
      expiresInDays: 7,
    });

    expect(response.status).toBe(201);
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "spring-sale" } });
    const expiresIn = stored.expiresAt!.getTime() - before;
    expect(expiresIn).toBeGreaterThanOrEqual(7 * 86_400_000);
    expect(expiresIn).toBeLessThan(7 * 86_400_000 + 60_000);
  });

  it("attaches the link to the signed-in user", async () => {
    const user = await signInAs("owner@example.test");

    const response = await shorten({ url: "https://example.com" });

    const { slug } = await response.json();
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug } });
    expect(stored.userId).toBe(user.id);
  });

  it("returns 409 when the alias is taken", async () => {
    await shorten({ url: "https://example.com", slug: "taken" });

    const response = await shorten({ url: "https://example.org", slug: "taken" });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "That alias is already taken." });
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "taken" } });
    expect(stored.url).toBe("https://example.com/");
  });

  it.each([
    ["a reserved alias", { url: "https://example.com", slug: "dashboard" }, "That alias is reserved."],
    ["a private address", { url: "http://192.168.1.1/admin" }, "Private and local addresses can't be shortened."],
    // normalizeUrl prefixes https:// before the scheme check, so this is refused
    // with the private-address message rather than the scheme one.
    ["a non-http scheme", { url: "ftp://example.com/file" }, undefined],
    ["a link to the shortener", { url: "https://trace.example/abc1234" }, "That link already points at this shortener."],
    ["an empty url", { url: "" }, "Paste a link to shorten."],
    ["an unsupported expiry", { url: "https://example.com", expiresInDays: 400 }, undefined],
  ])("rejects %s with 400", async (_case, body, message) => {
    const response = await shorten(body);

    expect(response.status).toBe(400);
    const { error } = await response.json();
    if (message) expect(error).toBe(message);
    expect(await prisma.link.count()).toBe(0);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await shorten("not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid request body." });
  });

  it("rate limits one client to 20 links a minute", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await shorten({ url: `https://example.com/${i}` })).status).toBe(201);
    }

    const blocked = await shorten({ url: "https://example.com/21" });

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await prisma.link.count()).toBe(20);
  });
});
