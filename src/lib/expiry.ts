const DAY_MS = 86_400_000;

/** True when the link has an expiry date that has already passed. */
export function isExpired(expiresAt: Date | null, now = new Date()) {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

export function expiryFromDays(days: number, now = new Date()) {
  return new Date(now.getTime() + days * DAY_MS);
}
