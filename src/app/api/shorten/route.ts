import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nanoid, RESERVED_SLUGS } from "@/lib/slug";
import { assertSafeUrl, normalizeUrl, shortenSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/base-url";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many links from this address. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = shortenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const baseUrl = await getBaseUrl();
  const user = await getCurrentUser();

  let target: URL;
  try {
    target = assertSafeUrl(normalizeUrl(parsed.data.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL." },
      { status: 400 },
    );
  }

  if (target.host === new URL(baseUrl).host) {
    return NextResponse.json(
      { error: "That link already points at this shortener." },
      { status: 400 },
    );
  }

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
    : null;

  const custom = parsed.data.slug;
  if (custom && RESERVED_SLUGS.has(custom.toLowerCase())) {
    return NextResponse.json({ error: "That alias is reserved." }, { status: 400 });
  }

  // Custom aliases are taken or not; generated ones retry on the rare collision.
  const attempts = custom ? 1 : 5;
  for (let i = 0; i < attempts; i++) {
    const slug = custom ?? nanoid();
    try {
      const link = await prisma.link.create({
        data: { slug, url: target.toString(), expiresAt, userId: user?.id ?? null },
      });
      return NextResponse.json(
        {
          slug: link.slug,
          shortUrl: `${baseUrl}/${link.slug}`,
          url: link.url,
          clicks: link.clicks,
          createdAt: link.createdAt,
          expiresAt: link.expiresAt,
        },
        { status: 201 },
      );
    } catch (error) {
      const taken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!taken) throw error;
      if (custom) {
        return NextResponse.json(
          { error: "That alias is already taken." },
          { status: 409 },
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a short code. Please retry." },
    { status: 503 },
  );
}
