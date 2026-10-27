import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { request } from "./request";

/** Creates a user and signs them in for the rest of the test. */
export async function signInAs(email: string) {
  // Nothing in these tests checks the password, so skip the scrypt cost.
  const user = await prisma.user.create({ data: { email, passwordHash: "not-used" } });
  await createSession(user.id);
  return user;
}

export function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

/** A POST with a JSON body, sent from the current test's client IP. */
export function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Route handler context for the dynamic `[slug]` segments. */
export function slugParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
