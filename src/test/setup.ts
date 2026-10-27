import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetRequest } from "./request";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", async () => {
  const { request } = await import("./request");
  return {
    cookies: async () => request.cookies,
    headers: async () => request.headers,
  };
});

vi.mock("next/navigation", async () => {
  const { RedirectSignal } = await import("./request");
  return {
    redirect: (url: string) => {
      throw new RedirectSignal(url);
    },
  };
});

// revalidatePath needs a running Next.js server; the tests only care that data changed.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  resetRequest();
  // Sessions and links cascade from users, but anonymous links have no user.
  await prisma.link.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
