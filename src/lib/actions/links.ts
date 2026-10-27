"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { expiryFromDays } from "@/lib/expiry";
import { InvalidDestinationError, parseDestination } from "@/lib/validation";

export type LinkState = { error: string | null; ok: boolean };

/** "keep" leaves the existing expiry alone; "never" clears it; a number is days from now. */
const EXPIRY_VALUES = ["keep", "never", "1", "7", "30", "365"] as const;

const updateSchema = z.object({
  slug: z.string().min(1),
  url: z.string().min(1, "Enter a destination.").max(2048),
  expiry: z.enum(EXPIRY_VALUES, { message: "Choose an expiry from the list." }),
});

type Ownership = { ok: true; userId: string } | { ok: false; error: string };

/** Confirms the signed-in user owns this slug. */
async function ownedSlug(slug: string): Promise<Ownership> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to manage this link." };

  const link = await prisma.link.findUnique({
    where: { slug },
    select: { userId: true },
  });
  if (!link || link.userId !== user.id) {
    return { ok: false, error: "That link isn't in your account." };
  }
  return { ok: true, userId: user.id };
}

export async function updateLink(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const parsed = updateSchema.safeParse({
    slug: formData.get("slug"),
    url: formData.get("url"),
    expiry: formData.get("expiry") ?? "keep",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const owner = await ownedSlug(parsed.data.slug);
  if (!owner.ok) return { ok: false, error: owner.error };

  let target: URL;
  try {
    target = parseDestination(parsed.data.url, new URL(await getBaseUrl()).host);
  } catch (error) {
    if (!(error instanceof InvalidDestinationError)) throw error;
    return { ok: false, error: error.message };
  }

  const { expiry } = parsed.data;
  await prisma.link.update({
    where: { slug: parsed.data.slug },
    data: {
      url: target.toString(),
      ...(expiry === "keep"
        ? {}
        : {
            expiresAt: expiry === "never" ? null : expiryFromDays(Number(expiry)),
          }),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/stats/${parsed.data.slug}`);
  return { ok: true, error: null };
}

export async function deleteLink(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const slug = String(formData.get("slug") ?? "");
  const owner = await ownedSlug(slug);
  if (!owner.ok) return { ok: false, error: owner.error };

  await prisma.link.delete({ where: { slug } });
  revalidatePath("/dashboard");
  return { ok: true, error: null };
}
