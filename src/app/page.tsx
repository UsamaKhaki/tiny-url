import Link from "next/link";
import { getBaseUrl } from "@/lib/base-url";
import { getCurrentUser } from "@/lib/auth";
import { Footer, Masthead } from "@/components/site-chrome";
import { ShortenForm } from "@/components/shorten-form";
import { LookupForm } from "@/components/lookup-form";

export default async function HomePage() {
  const [baseUrl, user] = await Promise.all([getBaseUrl(), getCurrentUser()]);
  const host = new URL(baseUrl).host;

  return (
    <>
      <Masthead />

      <main className="shell">
        <section className="hero">
          <p className="eyebrow">URL shortener</p>
          <h1>
            Long address in.{" "}
            <em>Seven characters</em> out.
          </h1>
          <p>
            Paste a link, get a short one that redirects instantly and counts every visit.
            Claim your own alias and set it to expire when the campaign ends.
          </p>
        </section>

        <ShortenForm host={host} />

        <p className="hint">
          {user ? (
            <>
              Signed in as {user.email} — new links are saved to{" "}
              <Link href="/dashboard">your links</Link>.
            </>
          ) : (
            <>
              Links you make now work straight away.{" "}
              <Link href="/signup">Create an account</Link> to keep them, edit where they
              point, and watch the clicks.
            </>
          )}
        </p>

        <section className="notes" id="how">
          <div className="note">
            <h3>Every code is readable</h3>
            <p>
              Seven characters drawn from an alphabet with no 0/O or 1/l, so a code
              survives being read down a phone line or printed on a flyer.
            </p>
          </div>
          <div className="note">
            <h3>The redirect stays honest</h3>
            <p>
              Visitors get a 307 to the original address with caching turned off, so you
              can retire a link without stale copies pointing at it.
            </p>
          </div>
          <div className="note">
            <h3>Counts you can check</h3>
            <p>
              Each hop increments the click count and stamps the last visit. Open the
              stats page for any code you own.
            </p>
          </div>
        </section>

        <section style={{ paddingBottom: "4rem" }}>
          <LookupForm host={host} />
        </section>
      </main>

      <Footer />
    </>
  );
}
