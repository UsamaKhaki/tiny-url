# Trace — URL shortener (MVP)

Paste a long link, get a short one that redirects instantly and counts every visit.

## Run it

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

## What's in the MVP

- **Accounts** — email + password sign-up, session cookies, and a dashboard of your own links.
- **Manage** — edit where an already-printed code points, change or clear its expiry, delete it.
- **Shorten** — 7-character codes from an alphabet with no `0/O` or `1/l`, so codes stay readable when spoken or printed.
- **Custom aliases** — claim `/spring-sale`; reserved app paths and taken aliases are rejected with a clear message.
- **Expiry** — optional 1 day / 7 / 30 / 365; expired codes stop redirecting and explain why.
- **Redirect** — `307` with `Cache-Control: no-store`, so retiring a link takes effect immediately.
- **Click stats** — every hop increments the count and stamps the last visit; see `/stats/<code>`.
- **QR code** — generated in the browser for any short link.
- **Guardrails** — http(s) only, no private/loopback hosts, no self-referencing links, 20 req/min per IP for shortening and 10/min for auth.

Links made while signed out still work — they just aren't attached to an account, so
nobody can edit them later.

## How auth works

Email and password, no third party. Passwords are hashed with `scrypt` (Node's built-in,
16-byte random salt per password, compared with `timingSafeEqual`). Sessions are opaque
32-byte random tokens in an `httpOnly`, `sameSite=lax` cookie; only the SHA-256 hash of a
token is stored, so a database leak doesn't hand over live sessions. Sign-in cost is the
same whether or not the email exists, so the form can't be used to enumerate accounts.

Ownership is checked server-side on every mutation in `src/lib/actions/links.ts` — a
signed-in user replaying another account's Server Action request gets
"That link isn't in your account." and nothing changes.

If you'd rather not own auth code, this is the piece to swap: Clerk (on the Vercel
Marketplace) or Auth.js drop in behind `getCurrentUser()` without touching the rest.

## Layout

| Path | Purpose |
| --- | --- |
| `src/app/page.tsx` | Landing page and shortener |
| `src/app/dashboard/page.tsx` | Your links — counts, edit, delete |
| `src/app/login/page.tsx`, `src/app/signup/page.tsx` | Account forms |
| `src/lib/auth.ts` | Password hashing, sessions, `getCurrentUser()` |
| `src/lib/actions/auth.ts` | Sign up / sign in / sign out actions |
| `src/lib/actions/links.ts` | Edit and delete, with the ownership guard |
| `src/app/[slug]/route.ts` | Redirect handler + click counting |
| `src/app/api/shorten/route.ts` | Create a short link |
| `src/app/api/links/[slug]/route.ts` | Read link stats as JSON |
| `src/app/stats/[slug]/page.tsx` | Stats page |
| `src/lib/validation.ts` | URL and alias rules |
| `src/lib/rate-limit.ts` | In-memory per-IP limiter |
| `prisma/schema.prisma` | `User`, `Session`, `Link` models |

## API

```bash
curl -X POST localhost:3000/api/shorten \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/long","slug":"spring-sale","expiresInDays":30}'
```

## Before deploying

The MVP stores links in SQLite (`prisma/dev.db`), which does not survive a serverless
deploy. To ship it:

1. Provision a Postgres database (Neon on the Vercel Marketplace works well).
2. Set `provider = "postgresql"` in `prisma/schema.prisma` and point `DATABASE_URL` at it.
3. Run `npx prisma migrate deploy`.
4. Replace `src/lib/rate-limit.ts` with a shared store (e.g. Upstash Redis) — the
   in-memory limiter only counts requests for one instance.
5. Set `NEXT_PUBLIC_APP_URL` to your domain so short links render with the right host.

## Not in this MVP

Password reset and email verification, OAuth sign-in, teams or shared workspaces,
per-click referrer/geo breakdowns, password-protected links, and bulk import.

Note that `/stats/<code>` is readable by anyone who has the code, which also means the
destination is. Owner-only stats would be a small change to
`src/app/stats/[slug]/page.tsx` if you want it.
