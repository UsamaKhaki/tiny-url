# Trace

A URL shortener built with Next.js (App Router), Prisma and SQLite. Paste a long link and
get a seven-character code that redirects with a `307` and counts every visit. Signed-in
users get a dashboard where they can repoint, re-expire or delete their links.

## Features

- **Short codes**: 7 characters from an alphabet with no `0/O` or `1/l/I`, so codes survive
  being read aloud or printed. Collisions are retried up to five times.
- **Custom aliases**: 3 to 32 letters, digits, `-` or `_`. App routes such as `dashboard`
  and `api` are reserved, and taken aliases return `409`.
- **Expiry**: optional 1, 7, 30 or 365 days. Expired codes stop redirecting and show an
  explanation page instead.
- **Redirects**: `307` with `Cache-Control: no-store`, so editing or retiring a link takes
  effect immediately.
- **Click stats**: each redirect increments a counter and records the last visit. Stats are
  at `/stats/<code>` and `GET /api/links/<code>`.
- **Accounts**: email and password sign-up, cookie sessions, and a dashboard of your own
  links. Links made while signed out still work but cannot be edited later.
- **QR codes**: generated in the browser for any new short link.
- **Guardrails**: http(s) only, no private or loopback hosts, no links back to the
  shortener itself, and per-IP rate limits (20/min for shortening, 10/min for auth).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers), React 19 |
| Language | TypeScript (strict) |
| Data | Prisma 6 with SQLite locally |
| Validation | Zod 4 |
| IDs | nanoid with a custom alphabet |
| Styling | Hand-written CSS in `globals.css` (Tailwind 4 is imported, but only its base reset is used) |
| Tests | Vitest |

## Architecture

```
src/
  app/
    [slug]/route.ts           Redirect handler and click counting
    api/shorten/route.ts      POST: create a short link (JSON API used by the form)
    api/links/[slug]/route.ts GET: link stats as JSON
    stats/[slug]/page.tsx     Public stats page
    dashboard/page.tsx        Signed-in user's links
    login/, signup/           Account forms
  components/                 Client components (shorten form, dashboard row, auth form)
  lib/
    validation.ts             URL and alias rules (parseDestination, shortenSchema)
    slug.ts                   Code generator, reserved aliases, alias pattern
    expiry.ts                 Expiry checks and date maths
    rate-limit.ts             In-memory fixed-window limiter and client IP parsing
    password.ts               scrypt hashing and verification
    auth.ts                   Sessions and getCurrentUser()
    actions/                  Server Actions for auth and link edit/delete
prisma/
  schema.prisma               User, Session and Link models
  migrations/
```

Business rules live in `src/lib` as plain functions so they can be tested without a
request or a database. Route handlers and Server Actions do transport work: parse input,
check ownership, call Prisma, shape the response.

### Auth

There is no third-party auth provider. Passwords are hashed with Node's `scrypt` and a
16-byte random salt, and compared with `timingSafeEqual`. A session is a 32-byte random
token in an `httpOnly`, `sameSite=lax` cookie; only its SHA-256 hash is stored, so a
database leak does not expose live sessions. Sign-in runs the hash even when the email
does not exist, so response time does not reveal which accounts exist.

Every edit and delete re-checks on the server that the signed-in user owns the link.

## Getting started

Requires Node 22 and npm.

```bash
npm install
cp .env.example .env
npm run db:migrate      # creates prisma/dev.db and applies migrations
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. `file:./dev.db` for local SQLite. |
| `NEXT_PUBLIC_APP_URL` | Public origin used to build short links. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then the request host. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest suite once (`npm run test:watch` to watch) |
| `npm run db:migrate` | `prisma migrate dev` |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push to
`main` and on pull requests.

## API

```bash
curl -X POST localhost:3000/api/shorten \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/long","slug":"spring-sale","expiresInDays":30}'
```

Returns `201` with `slug`, `shortUrl`, `url`, `clicks`, `createdAt` and `expiresAt`.
Errors return `{ "error": "..." }` with `400` (invalid input), `409` (alias taken) or
`429` (rate limited, with `Retry-After`).

## Testing

`npm test` runs two Vitest projects:

- **unit** (`*.test.ts`): the pure business logic in `src/lib`. URL normalisation and the
  private-host filter, alias validation and reserved words (including a check that every
  top-level route folder is reserved), expiry maths, the rate limiter and password hashing.
- **integration** (`*.integration.test.ts`): the route handlers and Server Actions, called
  directly against a real SQLite database. Shortening, redirects and click counting,
  expired links, the stats API, editing and deleting links (including another user's),
  sign-up, sign-in, sign-out and both rate limits.

The integration project rebuilds `prisma/test.db` from the migrations on every run, so it
never touches `dev.db` and needs no running server. `next/headers`, `next/navigation` and
`next/cache` are replaced by small fakes in `src/test/` that hold one test's cookies and
headers; everything else, including Prisma, is the real code. Run one project with
`npx vitest run --project unit` or `--project integration`.

Pages (the dashboard and stats screens) are server components and are not covered; that
needs a browser-level test such as Playwright.

## Limitations

- **SQLite only.** `prisma/dev.db` does not survive a serverless deploy. To deploy, switch
  the datasource to `postgresql`, point `DATABASE_URL` at a managed database and run
  `npx prisma migrate deploy`. The existing migrations are SQLite-specific, so they would
  need to be regenerated for Postgres.
- **Single-instance rate limiting.** The limiter is in memory, so it resets on restart and
  does not share counts across instances. It also trusts `x-forwarded-for`, which is only
  safe behind a proxy that overwrites that header.
- **Stats are public.** Anyone with a code can open its stats page and see the destination
  and click count. Making stats owner-only is a small change in `src/app/stats/[slug]`.
- **Click counts are approximate analytics.** There is no bot filtering, and a failed
  counter update never blocks the redirect.
- **Not built yet:** password reset, email verification, OAuth, per-click referrer or geo
  data, and bulk import.
