import { z } from "zod";
import { RESERVED_SLUGS, SLUG_PATTERN } from "./slug";

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Thrown for user-supplied destinations we refuse; the message is safe to show. */
export class InvalidDestinationError extends Error {}

/** Rejects anything that is not a public http(s) destination. */
export function assertSafeUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InvalidDestinationError("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidDestinationError("Only http and https links can be shortened.");
  }
  if (!parsed.hostname.includes(".") || PRIVATE_HOST.test(parsed.hostname)) {
    throw new InvalidDestinationError("Private and local addresses can't be shortened.");
  }
  return parsed;
}

/**
 * Turns raw form input into a destination we are willing to redirect to.
 * Links back to the shortener itself are refused so codes can't chain or loop.
 */
export function parseDestination(raw: string, shortenerHost: string): URL {
  const target = assertSafeUrl(normalizeUrl(raw));
  if (target.host === shortenerHost) {
    throw new InvalidDestinationError("That link already points at this shortener.");
  }
  return target;
}

export const shortenSchema = z.object({
  url: z.string().min(1, "Paste a link to shorten.").max(2048),
  slug: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || SLUG_PATTERN.test(v), {
      message: "Use 3–32 letters, numbers, dashes or underscores.",
    })
    .refine((v) => v === undefined || !RESERVED_SLUGS.has(v.toLowerCase()), {
      message: "That alias is reserved.",
    }),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export type ShortenInput = z.infer<typeof shortenSchema>;
