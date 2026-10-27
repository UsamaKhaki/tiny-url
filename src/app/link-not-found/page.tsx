import Link from "next/link";
import { Footer, Masthead } from "@/components/site-chrome";

export default async function LinkNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; expired?: string }>;
}) {
  const { slug, expired } = await searchParams;

  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page">
          <p className="eyebrow">{expired ? "Expired link" : "Dead end"}</p>
          <h1>{expired ? "This link has expired." : "No link with that code."}</h1>
          <p className="lede">
            {expired
              ? "The owner set an expiry date and it has passed. Ask them for a current link."
              : "The code may be mistyped, or the link was never created here."}
            {slug ? ` Code checked: ${slug}` : ""}
          </p>
          <Link className="btn" href="/">
            Shorten a link
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
