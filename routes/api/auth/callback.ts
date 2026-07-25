export const prerender = false;

import type { APIRoute } from 'astro';
import { exchangeCodeForToken, getDiscordUser, getAvatarUrl, getGuildMembership } from '../../../lib/discord';
import { createSession, buildSessionCookies } from '../../../lib/auth';
import { database } from 'astro-discord-membership:config';

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const GET: APIRoute = async ({ request, url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieHeader = request.headers.get('cookie');
  const storedState = parseCookie(cookieHeader, 'oauth_state');

  // CSRF check
  if (!code || !state || state !== storedState) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/members?error=invalid_state' },
    });
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const discordUser = await getDiscordUser(accessToken);

    const guildId = import.meta.env.DISCORD_GUILD_ID;
    const guildMembership = await getGuildMembership(accessToken, guildId);
    if (!guildMembership) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/members?error=not_member' },
      });
    }

    const avatarUrl = getAvatarUrl(discordUser);
    const displayName = discordUser.global_name ?? discordUser.username;
    const existingProfile = await database.getMemberProfile(discordUser.id);

    // Read emailVerified before upserting (new members default to false)
    const emailVerified = existingProfile?.emailVerified ?? false;

    if (!existingProfile) {
      await database.createMemberProfile({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        displayName,
        avatarUrl,
        bio: '',
        location: '',
        website: '',
        github: '',
        linkedin: '',
        bluesky: '',
        isPublic: true,
        emailVerified: false,
        email: '',
        announced: false,
      });
    } else {
      await database.updateMemberProfile(discordUser.id, {
        discordUsername: discordUser.username,
        avatarUrl,
      });
    }

    const sessionUser = {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      displayName,
      avatarUrl,
      emailVerified,
      isGuildOwner: guildMembership.owner,
    };
    const token = await createSession(sessionUser);
    const cookieHeaders = buildSessionCookies(token, sessionUser);

    const redirectTo = emailVerified ? '/profile' : '/verify-email';
    const headers = new Headers({ Location: redirectTo });
    // Clear the state cookie and set session cookies
    headers.append('Set-Cookie', 'oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    cookieHeaders.forEach((c) => headers.append('Set-Cookie', c));

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('Auth callback error:', err);
    return new Response(null, {
      status: 302,
      headers: { Location: '/members?error=auth_failed' },
    });
  }
};
