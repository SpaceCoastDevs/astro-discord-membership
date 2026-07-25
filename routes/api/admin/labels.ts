export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { database } from 'astro-discord-membership:config';

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user?.isGuildOwner) return response({ error: 'Only the Discord server owner can manage labels.' }, 403);

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';

  if (action === 'create-category') {
    const slug = slugify(name);
    if (!name || !slug) return response({ error: 'A label set name is required.' }, 400);
    const existing = await database.getLabelCategories(true);
    if (existing.some((set) => set.slug === slug)) return response({ error: 'A label set with that name already exists.' }, 409);
    const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : existing.length;
    await database.upsertLabelCategory({ id: crypto.randomUUID(), name, slug, status: 'active', selectionLimit: 50, sortOrder });
    return response({ ok: true }, 201);
  }

  if (action === 'create-label') {
    const categoryId = typeof body?.categoryId === 'string' ? body.categoryId : '';
    const slug = slugify(name);
    if (!categoryId || !name || !slug) return response({ error: 'A category and label name are required.' }, 400);
    const existing = await database.getLabels(categoryId, true);
    if (existing.some((label) => label.slug === slug)) return response({ error: 'That label already exists in this set.' }, 409);
    await database.upsertLabel({ id: crypto.randomUUID(), categoryId, name, slug, status: 'active' });
    return response({ ok: true }, 201);
  }

  if (action === 'archive-label') {
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return response({ error: 'A label is required.' }, 400);
    await database.deleteLabel(id);
    return response({ ok: true });
  }

  if (action === 'archive-category') {
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return response({ error: 'A label set is required.' }, 400);
    await database.deleteLabelCategory(id);
    return response({ ok: true });
  }

  if (action === 'update-category-order') {
    const id = typeof body?.id === 'string' ? body.id : '';
    const sortOrder = Number(body?.sortOrder);
    const category = (await database.getLabelCategories(true)).find((entry) => entry.id === id);
    if (!category || !Number.isFinite(sortOrder)) return response({ error: 'A valid category order is required.' }, 400);
    await database.upsertLabelCategory({ ...category, sortOrder: Math.max(0, Math.trunc(sortOrder)) });
    return response({ ok: true });
  }

  return response({ error: 'Unsupported action.' }, 400);
};
