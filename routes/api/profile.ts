export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { notifyNewMember } from '../../lib/discord-notify';
import { database } from 'astro-discord-membership:config';

const MAX_FIELD_LENGTH = 200;
const MAX_BIO_LENGTH = 1024;

function sanitize(val: unknown, maxLen = MAX_FIELD_LENGTH): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function sanitizeUrl(val: unknown): string {
  const s = sanitize(val);
  if (!s) return '';
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!user.emailVerified) {
    return new Response(JSON.stringify({ error: 'Email verification required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const form = await request.formData();

  const requestedLabelIds = [...new Set((form.getAll('labels') as string[]).filter(Boolean))];
  const activeLabels = await database.getLabels();
  const selectedLabelIds = requestedLabelIds.filter((id) => activeLabels.some((label) => label.id === id));
  const labelCategories = await database.getLabelCategories();
  for (const category of labelCategories) {
    const count = selectedLabelIds.filter((id) => activeLabels.find((label) => label.id === id)?.categoryId === category.id).length;
    if (category.selectionLimit && count > category.selectionLimit) {
      return new Response(JSON.stringify({ error: `Choose at most ${category.selectionLimit} labels in ${category.name}.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const updates = {
    displayName: sanitize(form.get('displayName')) || user.displayName,
    bio: sanitize(form.get('bio'), MAX_BIO_LENGTH),
    location: sanitize(form.get('location')),
    website: sanitizeUrl(form.get('website')),
    github: sanitize(form.get('github')),
    linkedin: sanitize(form.get('linkedin')),
    bluesky: sanitize(form.get('bluesky')),
    isPublic: form.get('isPublic') !== 'false',
  };

  const existing = await database.getMemberProfile(user.discordId);
  const shouldAnnounce = existing?.announced === false && updates.isPublic;

  await database.updateMemberProfile(user.discordId, shouldAnnounce ? { ...updates, announced: true } : updates);
  await database.setMemberLabelIds(user.discordId, selectedLabelIds);

  if (shouldAnnounce && existing) {
    const d = existing;
    notifyNewMember({
      discordId: user.discordId,
      displayName: updates.displayName,
      avatarUrl: user.avatarUrl,
      bio: updates.bio || d.bio,
      location: updates.location || d.location,
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/profile?status=saved' },
  });
};
