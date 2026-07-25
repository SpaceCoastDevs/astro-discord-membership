export const prerender = false;

import type { APIRoute, APIContext } from "astro";
import { getSession } from '../../../lib/auth';
import { sendVerificationEmail } from '../../../lib/email';
import { database } from "astro-discord-membership:config";

export const POST: APIRoute = async ({ request }: APIContext) => {
  const user = await getSession(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  // Already verified
  const profile = await database.getMemberProfile(user.discordId);
  if (profile?.emailVerified === true) {
    return Response.json({ error: "Email already verified." }, { status: 400 });
  }

  // Rate limit: one code per 60 seconds
  const existing = await database.getEmailVerification(user.discordId);
  if (existing) {
    if (Date.now() - existing.createdAt.getTime() < 60_000) {
      return Response.json(
        { error: "Please wait 60 seconds before requesting a new code." },
        { status: 429 },
      );
    }
  }

  // 6-digit code (100000–999999)
  const code = String(
    (crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000,
  );
  await database.setEmailVerification(user.discordId, {
    email,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    attempts: 0,
    createdAt: new Date(),
  });

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    // Clean up the verification doc so a retry doesn't hit the rate limit
    await database.deleteEmailVerification(user.discordId);
    console.error(
      "[send-verification] Email send failed:",
      (err as Error).message,
    );
    return Response.json(
      {
        error:
          "Failed to send verification email. Please check your email address and try again.",
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
};
