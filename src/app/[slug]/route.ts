import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const link = await prisma.link.findUnique({ where: { slug } });
  const origin = new URL(request.url).origin;

  if (!link) {
    return NextResponse.redirect(`${origin}/link-not-found?slug=${encodeURIComponent(slug)}`, 302);
  }

  if (isExpired(link.expiresAt)) {
    return NextResponse.redirect(`${origin}/link-not-found?slug=${encodeURIComponent(slug)}&expired=1`, 302);
  }

  // Best-effort analytics: a counting failure must never break the redirect.
  await prisma.link
    .update({
      where: { slug },
      data: { clicks: { increment: 1 }, lastVisit: new Date() },
    })
    .catch(() => {});

  return NextResponse.redirect(link.url, {
    status: 307,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
