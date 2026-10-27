import { redirect } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Footer, Masthead } from "@/components/site-chrome";

export const metadata = { title: "Sign in — Trace" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page auth-page">
          <p className="eyebrow">Account</p>
          <h1>Sign in.</h1>
          <p className="lede">
            Your links, their click counts, and everything you&apos;ve set to expire.
          </p>
          <AuthForm action={signIn} mode="signin" />
        </section>
      </main>
      <Footer />
    </>
  );
}
