import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { formData, signInAs } from "@/test/fixtures";
import { deleteLink, updateLink } from "./links";

const idle = { ok: false, error: null };

async function createLink(slug: string, userId: string | null, expiresAt: Date | null = null) {
  return prisma.link.create({
    data: { slug, url: "https://example.com/original", userId, expiresAt },
  });
}

describe("updateLink", () => {
  it("repoints the owner's link and keeps its expiry", async () => {
    const owner = await signInAs("owner@example.test");
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    await createLink("promo", owner.id, expiresAt);

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "example.org/new", expiry: "keep" }),
    );

    expect(result).toEqual({ ok: true, error: null });
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "promo" } });
    expect(stored.url).toBe("https://example.org/new");
    expect(stored.expiresAt).toEqual(expiresAt);
  });

  it("clears the expiry with 'never' and resets it with a number of days", async () => {
    const owner = await signInAs("owner@example.test");
    await createLink("promo", owner.id, new Date("2027-01-01T00:00:00Z"));

    await updateLink(idle, formData({ slug: "promo", url: "https://example.com", expiry: "never" }));
    expect((await prisma.link.findUniqueOrThrow({ where: { slug: "promo" } })).expiresAt).toBeNull();

    const before = Date.now();
    await updateLink(idle, formData({ slug: "promo", url: "https://example.com", expiry: "30" }));
    const { expiresAt } = await prisma.link.findUniqueOrThrow({ where: { slug: "promo" } });
    expect(expiresAt!.getTime() - before).toBeGreaterThanOrEqual(30 * 86_400_000);
  });

  it("refuses when signed out", async () => {
    await createLink("promo", null);

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "https://evil.example", expiry: "keep" }),
    );

    expect(result).toEqual({ ok: false, error: "Sign in to manage this link." });
  });

  it("refuses to edit another user's link", async () => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.test", passwordHash: "not-used" },
    });
    await createLink("promo", owner.id);
    await signInAs("intruder@example.test");

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "https://evil.example", expiry: "keep" }),
    );

    expect(result).toEqual({ ok: false, error: "That link isn't in your account." });
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "promo" } });
    expect(stored.url).toBe("https://example.com/original");
  });

  it("refuses to claim an anonymous link", async () => {
    await createLink("promo", null);
    await signInAs("someone@example.test");

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "https://evil.example", expiry: "keep" }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("That link isn't in your account.");
  });

  it("applies the same destination rules as shortening", async () => {
    const owner = await signInAs("owner@example.test");
    await createLink("promo", owner.id);

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "https://trace.example/other", expiry: "keep" }),
    );

    expect(result).toEqual({ ok: false, error: "That link already points at this shortener." });
    const stored = await prisma.link.findUniqueOrThrow({ where: { slug: "promo" } });
    expect(stored.url).toBe("https://example.com/original");
  });

  it("rejects an expiry that isn't on the list", async () => {
    const owner = await signInAs("owner@example.test");
    await createLink("promo", owner.id);

    const result = await updateLink(
      idle,
      formData({ slug: "promo", url: "https://example.com", expiry: "3" }),
    );

    expect(result).toEqual({ ok: false, error: "Choose an expiry from the list." });
  });
});

describe("deleteLink", () => {
  it("deletes the owner's link", async () => {
    const owner = await signInAs("owner@example.test");
    await createLink("promo", owner.id);

    const result = await deleteLink(idle, formData({ slug: "promo" }));

    expect(result).toEqual({ ok: true, error: null });
    expect(await prisma.link.findUnique({ where: { slug: "promo" } })).toBeNull();
  });

  it("refuses to delete another user's link", async () => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.test", passwordHash: "not-used" },
    });
    await createLink("promo", owner.id);
    await signInAs("intruder@example.test");

    const result = await deleteLink(idle, formData({ slug: "promo" }));

    expect(result).toEqual({ ok: false, error: "That link isn't in your account." });
    expect(await prisma.link.findUnique({ where: { slug: "promo" } })).not.toBeNull();
  });

  it("reports a missing link the same way as someone else's", async () => {
    await signInAs("owner@example.test");

    const result = await deleteLink(idle, formData({ slug: "missing" }));

    expect(result).toEqual({ ok: false, error: "That link isn't in your account." });
  });
});
