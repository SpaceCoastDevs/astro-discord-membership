export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession } from '../../../../lib/auth';
import { database } from 'astro-discord-membership:config';

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function parseCsv(source: string): string[][] {
  return source.trim().split(/\r?\n/).map((line) => line.match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g)?.map((cell) => cell.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? []);
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user?.isGuildOwner) return new Response('Forbidden', { status: 403 });
  const file = (await request.formData()).get('file');
  if (!(file instanceof File) || !file.name.endsWith('.csv')) return new Response('Upload a CSV file.', { status: 400 });

  const rows = parseCsv(await file.text()).filter((row) => row[0] && row[1]);
  if (rows[0]?.[0].toLowerCase() === 'category') rows.shift();
  const categories = await database.getLabelCategories(true);
  let imported = 0;
  for (const [categoryName, labelName, order] of rows) {
    const categorySlug = slugify(categoryName);
    if (!categorySlug || !labelName) continue;
    let category = categories.find((entry) => entry.slug === categorySlug);
    if (!category) {
      category = { id: crypto.randomUUID(), name: categoryName.slice(0, 60), slug: categorySlug, status: 'active', selectionLimit: 50, sortOrder: Number.isFinite(Number(order)) ? Number(order) : categories.length, createdAt: new Date(), updatedAt: new Date() };
      await database.upsertLabelCategory(category);
      categories.push(category);
    }
    const labelSlug = slugify(labelName);
    const existing = await database.getLabels(category.id, true);
    if (!labelSlug || existing.some((label) => label.slug === labelSlug)) continue;
    await database.upsertLabel({ id: crypto.randomUUID(), categoryId: category.id, name: labelName.slice(0, 60), slug: labelSlug, status: 'active' });
    imported++;
  }
  return new Response(null, { status: 303, headers: { Location: `/admin/labels?imported=${imported}` } });
};
