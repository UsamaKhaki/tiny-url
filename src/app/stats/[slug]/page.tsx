import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { getCurrentUser } from "@/lib/auth";
import { isExpired } from "@/lib/expiry";
import { Footer, Masthead } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [link, user] = await Promise.all([
    prisma.link.findUnique({ where: { slug } }),
    getCurrentUser(),
  ]);
  if (!link) notFound();

  const isOwner = Boolean(link.userId && user && link.userId === user.id);

  const host = new URL(await getBaseUrl()).host;
  const expired = isExpired(link.expiresAt);

  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page">
          <p className="eyebrow">Short code</p>
          <h1>
            {host}/{link.slug}
          </h1>
          <p className="lede">
            {expired
              ? "This link has expired and no longer redirects."
              : "Live. Every visit below is a real redirect served from this link."}
          </p>

          <dl className="stat-grid">
            <div className="stat">
              <dt>Clicks</dt>
              <dd>{link.clicks.toLocaleString()}</dd>
            </div>
            <div className="stat">
              <dt>Created</dt>
              <dd className="small">{formatDate(link.createdAt)}</dd>
            </div>
            <div className="stat">
              <dt>{expired ? "Expired" : "Expires"}</dt>
              <dd className="small">
                {link.expiresAt ? formatDate(link.expiresAt) : "Never"}
              </dd>
            </div>
          </dl>

          <div className="destination">
            <span>Destination</span>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.url}
            </a>
          </div>

          <p className="stats-actions">
            {isOwner && (
              <Link className="btn btn-quiet" href="/dashboard">
                Manage this link
              </Link>
            )}
            <Link className="btn btn-quiet" href="/">
              Shorten another link
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
