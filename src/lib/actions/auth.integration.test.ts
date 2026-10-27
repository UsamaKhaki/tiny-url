import { describe, expect, it } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formData } from "@/test/fixtures";
import { request } from "@/test/request";
import { signIn, signOut, signUp } from "./auth";

const SESSION_COOKIE = "trace_session";
const idle = { error: null };
const PASSWORD = "correct horse battery";

function credentials(email: string, password = PASSWORD) {
  return formData({ email, password });
}

async function registered(email: string) {
  await expect(signUp(idle, credentials(email))).rejects.toMatchObject({ url: "/dashboard" });
  request.cookies.delete(SESSION_COOKIE);
}

describe("signUp", () => {
  it("creates the account, signs the user in and redirects to the dashboard", async () => {
    await expect(signUp(idle, credentials("  New@Example.TEST "))).rejects.toMatchObject({
      url: "/dashboard",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
    expect(user.passwordHash).not.toContain(PASSWORD);
    expect(await getCurrentUser()).toEqual({ id: user.id, email: "new@example.test" });
    expect(request.cookies.optionsFor(SESSION_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("stores only a hash of the session token", async () => {
    await registered("new@example.test");
    await expect(signIn(idle, credentials("new@example.test"))).rejects.toThrow();

    const token = request.cookies.get(SESSION_COOKIE)!.value;
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.tokenHash)).not.toContain(token);
  });

  it("refuses a duplicate email, ignoring case", async () => {
    await registered("taken@example.test");

    const result = await signUp(idle, credentials("TAKEN@example.test"));

    expect(result).toEqual({
      error: "An account with that email already exists. Sign in instead.",
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it("rejects a short password", async () => {
    const result = await signUp(idle, credentials("new@example.test", "short"));

    expect(result).toEqual({ error: "Use at least 8 characters." });
    expect(await prisma.user.count()).toBe(0);
  });

  it("throttles one client after 10 attempts a minute", async () => {
    for (let i = 0; i < 10; i++) {
      await signUp(idle, credentials("bad-email"));
    }

    const result = await signUp(idle, credentials("new@example.test"));

    expect(result).toEqual({ error: "Too many attempts. Wait a minute and try again." });
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("signIn", () => {
  it("signs in with the right password", async () => {
    await registered("user@example.test");

    await expect(signIn(idle, credentials("USER@example.test"))).rejects.toMatchObject({
      url: "/dashboard",
    });

    expect((await getCurrentUser())?.email).toBe("user@example.test");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await registered("user@example.test");

    const wrongPassword = await signIn(idle, credentials("user@example.test", "wrong password"));
    const unknownEmail = await signIn(idle, credentials("nobody@example.test"));

    expect(wrongPassword).toEqual({ error: "That email and password don't match an account." });
    expect(unknownEmail).toEqual(wrongPassword);
    expect(request.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("clears lapsed sessions on sign-in", async () => {
    await registered("user@example.test");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "user@example.test" } });
    await prisma.session.create({
      data: { tokenHash: "lapsed", userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(signIn(idle, credentials("user@example.test"))).rejects.toThrow();

    expect(await prisma.session.findUnique({ where: { tokenHash: "lapsed" } })).toBeNull();
  });
});

describe("signOut", () => {
  it("deletes the session and the cookie, then redirects home", async () => {
    await expect(signUp(idle, credentials("user@example.test"))).rejects.toThrow();
    expect(await prisma.session.count()).toBe(1);

    await expect(signOut()).rejects.toMatchObject({ url: "/" });

    expect(await prisma.session.count()).toBe(0);
    expect(request.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("treats an expired session as signed out and removes it", async () => {
    await expect(signUp(idle, credentials("user@example.test"))).rejects.toThrow();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await getCurrentUser()).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });
});
