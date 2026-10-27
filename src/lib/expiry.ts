/** True when the link has an expiry date that has already passed. */
export function isExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() <= Date.now();
}
