import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export async function Masthead() {
  const user = await getCurrentUser();

  return (
    <header className="shell">
      <div className="masthead">
        <Link href="/" className="wordmark">
          trace
        </Link>
        <nav className="masthead-links">
          {user ? (
            <>
              <Link href="/dashboard">Your links</Link>
              <span className="who" title={user.email}>
                {user.email}
              </span>
              <form action={signOut}>
                <button type="submit" className="linkish">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/#how">How it works</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="nav-cta">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="shell">
      <div className="foot">
        <span>Trace — URL shortener MVP</span>
        <span>Redirects with 307 · counts every hop</span>
      </div>
    </footer>
  );
}
