/**
 * Stand-in for the per-request state Next.js exposes through `cookies()` and
 * `headers()`. The mocks in setup.ts read from `request`, and each test gets a
 * fresh one, so a cookie set by a Server Action is visible to the next call in
 * the same test, the way a browser would send it back.
 */
type CookieOptions = Record<string, unknown>;

class CookieJar {
  private store = new Map<string, { value: string; options?: CookieOptions }>();

  get(name: string) {
    const entry = this.store.get(name);
    return entry ? { name, value: entry.value } : undefined;
  }

  set(name: string, value: string, options?: CookieOptions) {
    this.store.set(name, { value, options });
  }

  delete(name: string) {
    this.store.delete(name);
  }

  optionsFor(name: string) {
    return this.store.get(name)?.options;
  }
}

/** Thrown by the mocked `redirect()` so tests can assert where an action sent the user. */
export class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect to ${url}`);
  }
}

let clientCount = 0;

export const request = {
  cookies: new CookieJar(),
  headers: new Headers(),
};

/**
 * Starts a new request context with its own client IP, so the in-memory rate
 * limiter never carries counts from one test into the next.
 */
export function resetRequest() {
  clientCount += 1;
  request.cookies = new CookieJar();
  request.headers = new Headers({ "x-forwarded-for": `test-client-${clientCount}` });
}
