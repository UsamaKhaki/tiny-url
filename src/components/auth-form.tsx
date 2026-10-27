"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/lib/actions/auth";

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "signin" | "signup";
};

export function AuthForm({ action, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const isSignUp = mode === "signup";

  return (
    <form className="console auth-card" action={formAction}>
      <div className="console-head">
        <span>{isSignUp ? "Create account" : "Sign in"}</span>
        <span>{isSignUp ? "Free · no card" : "Welcome back"}</span>
      </div>

      <div className="console-body">
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="control">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="control">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "At least 8 characters" : "Your password"}
              minLength={8}
              required
            />
          </div>
        </div>

        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}

        <div>
          <button className="btn" type="submit" disabled={pending}>
            {pending
              ? isSignUp
                ? "Creating account…"
                : "Signing in…"
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </div>

        <p className="auth-switch">
          {isSignUp ? (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/signup">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
