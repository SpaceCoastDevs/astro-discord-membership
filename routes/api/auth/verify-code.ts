export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession, createSession, buildSessionCookies } from '../../../lib/auth';
import { database } from 'astro-discord-membership:config';

export const POST: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let code: string;
  try {
    const body = await request.json();
    code = (body.code ?? '').trim();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!code) {
    return Response.json({ error: 'Verification code is required.' }, { status: 400 });
  }

  const ver = await database.getEmailVerification(user.discordId);

  if (!ver) {
    return Response.json({ error: 'No verification in progress. Please request a new code.' }, { status: 400 });
  }

  // Check expiry
  if (ver.expiresAt.getTime() < Date.now()) {
    await database.deleteEmailVerification(user.discordId);
    return Response.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 });
  }

  // Check attempts limit
  if (ver.attempts >= 5) {
    await database.deleteEmailVerification(user.discordId);
    return Response.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 400 });
  }

  // Check the code
  if (ver.code !== code) {
    await database.incrementEmailVerificationAttempts(user.discordId);
    const remaining = 4 - ver.attempts;
    return Response.json(
      { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
      { status: 400 }
    );
  }

  // Code correct — activate the member
  await database.updateMemberProfile(user.discordId, { email: ver.email, emailVerified: true });
  await database.deleteEmailVerification(user.discordId);

  // Re-issue the JWT with emailVerified: true
  const updatedUser = { ...user, emailVerified: true };
  const token = await createSession(updatedUser);
  const cookies = buildSessionCookies(token, updatedUser);

  const headers = new Headers();
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return Response.json({ ok: true }, { headers });
};
