"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  pruneExpiredSessions,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error: string | null };

const credentials = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(254)
    .email("That doesn't look like an email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(200, "That password is too long."),
});

async function throttle(scope: string) {
  const ip = clientIp(await headers());
  return rateLimit(`${scope}:${ip}`, { max: 10 }).ok;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!(await throttle("signup"))) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { email, password } = parsed.data;

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with that email already exists. Sign in instead." };
    }
    throw error;
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!(await throttle("signin"))) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "That email and password don't match an account." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  // Hash regardless of whether the user exists so both paths cost the same.
  const fallback = "0".repeat(32) + ":" + "0".repeat(128);
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? fallback);

  if (!user || !ok) {
    return { error: "That email and password don't match an account." };
  }

  await pruneExpiredSessions();
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOut() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}
