import { headers } from "next/headers";

/** Absolute origin for building short links, works locally and on Vercel. */
export async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("host") ?? "localhost:6201";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}
