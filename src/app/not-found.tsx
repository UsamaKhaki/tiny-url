import Link from "next/link";
import { Footer, Masthead } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page">
          <p className="eyebrow">404</p>
          <h1>Nothing at this address.</h1>
          <p className="lede">
            The page you asked for doesn&apos;t exist. If you were following a short
            link, the code may have been mistyped.
          </p>
          <Link className="btn" href="/">
            Back to the shortener
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
