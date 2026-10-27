import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { slugParams } from "@/test/fixtures";
import { GET } from "./route";

function getStats(slug: string) {
  return GET(new Request(`https://trace.example/api/links/${slug}`), slugParams(slug));
}

describe("GET /api/links/[slug]", () => {
  it("returns the link's stats", async () => {
    const lastVisit = new Date("2026-10-01T12:00:00Z");
    await prisma.link.create({
      data: { slug: "report", url: "https://example.com/q3", clicks: 42, lastVisit },
    });

    const response = await getStats("report");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      slug: "report",
      shortUrl: "https://trace.example/report",
      url: "https://example.com/q3",
      clicks: 42,
      expiresAt: null,
      lastVisit: lastVisit.toISOString(),
    });
  });

  it("returns 404 for an unknown code", async () => {
    const response = await getStats("missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Link not found." });
  });
});
