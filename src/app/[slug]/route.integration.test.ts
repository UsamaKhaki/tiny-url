import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { slugParams } from "@/test/fixtures";
import { GET } from "./route";

function visit(slug: string) {
  return GET(new Request(`https://trace.example/${slug}`), slugParams(slug));
}

describe("GET /[slug]", () => {
  it("redirects with 307, disables caching and counts the visit", async () => {
    await prisma.link.create({ data: { slug: "docs", url: "https://example.com/docs" } });

    const first = await visit("docs");
    await visit("docs");

    expect(first.status).toBe(307);
    expect(first.headers.get("location")).toBe("https://example.com/docs");
    expect(first.headers.get("cache-control")).toContain("no-store");

    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "docs" } });
    expect(stored.clicks).toBe(2);
    expect(stored.lastVisit).toBeInstanceOf(Date);
  });

  it("sends an unknown code to the not-found page", async () => {
    const response = await visit("missing");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://trace.example/link-not-found?slug=missing",
    );
  });

  it("does not follow or count an expired link", async () => {
    await prisma.link.create({
      data: {
        slug: "old-sale",
        url: "https://example.com/sale",
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await visit("old-sale");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://trace.example/link-not-found?slug=old-sale&expired=1",
    );
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "old-sale" } });
    expect(stored.clicks).toBe(0);
  });
});
