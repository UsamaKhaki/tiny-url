import { redirect } from "next/navigation";
import { signUp } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Footer, Masthead } from "@/components/site-chrome";

export const metadata = { title: "Create an account — Trace" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <>
      <Masthead />
      <main className="shell">
        <section className="page auth-page">
          <p className="eyebrow">Account</p>
          <h1>Keep your links.</h1>
          <p className="lede">
            An account collects every link you shorten into one place, so you can edit a
            destination, retire a code, or check what a campaign actually pulled.
          </p>
          <AuthForm action={signUp} mode="signup" />
        </section>
      </main>
      <Footer />
    </>
  );
}
