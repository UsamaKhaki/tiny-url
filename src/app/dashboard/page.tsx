import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { isExpired } from "@/lib/expiry";
import { Footer, Masthead } from "@/components/site-chrome";
import { LinkRow, type DashboardLink } from "@/components/link-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your links — Trace" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [links, baseUrl] = await Promise.all([
    prisma.link.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        url: true,
        clicks: true,
        createdAt: true,
        expiresAt: true,
      },
    }),
    getBaseUrl(),
  ]);

  const host = new URL(baseUrl).host;
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const live = links.filter((link) => !isExpired(link.expiresAt)).length;

  const rows: DashboardLink[] = links.map((link) => ({
    slug: link.slug,
    url: link.url,
    clicks: link.clicks,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt?.toISOString() ?? null,
    expired: isExpired(link.expiresAt),
  }));

  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page">
          <p className="eyebrow">Your links</p>
          <h1>{user.email}</h1>
          <p className="lede">
            Everything you&apos;ve shortened while signed in. Edit a destination to point
            an already-printed code somewhere new.
          </p>

          <dl className="stat-grid">
            <div className="stat">
              <dt>Links</dt>
              <dd>{links.length.toLocaleString()}</dd>
            </div>
            <div className="stat">
              <dt>Total clicks</dt>
              <dd>{totalClicks.toLocaleString()}</dd>
            </div>
            <div className="stat">
              <dt>Live now</dt>
              <dd>{live.toLocaleString()}</dd>
            </div>
          </dl>

          {rows.length === 0 ? (
            <div className="empty">
              <h2>No links yet.</h2>
              <p>
                Shorten your first link and it will appear here with its click count.
              </p>
              <Link className="btn" href="/">
                Shorten a link
              </Link>
            </div>
          ) : (
            <>
              <div className="list-head">
                <span>
                  {rows.length} {rows.length === 1 ? "link" : "links"} on {host}
                </span>
                <Link className="btn btn-quiet" href="/">
                  New short link
                </Link>
              </div>
              <ul className="row-list">
                {rows.map((row) => (
                  <LinkRow key={row.slug} link={row} baseUrl={baseUrl} />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
