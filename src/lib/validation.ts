import { z } from "zod";
import { RESERVED_SLUGS, SLUG_PATTERN } from "./slug";

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Rejects anything that is not a public http(s) destination. */
export function assertSafeUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https links can be shortened.");
  }
  if (!parsed.hostname.includes(".") || PRIVATE_HOST.test(parsed.hostname)) {
    throw new Error("Private and local addresses can't be shortened.");
  }
  return parsed;
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
