import { customAlphabet } from "nanoid";

// Unambiguous alphabet: no 0/O/1/l/I so codes survive being read aloud.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const nanoid = customAlphabet(ALPHABET, 7);

/** Paths the app itself owns — they can never be handed out as slugs. */
export const RESERVED_SLUGS = new Set([
  "api",
  "s",
  "stats",
  "about",
  "admin",
  "login",
  "logout",
  "signin",
  "signout",
  "signup",
  "account",
  "link-not-found",
  "dashboard",
  "settings",
  "terms",
  "privacy",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
