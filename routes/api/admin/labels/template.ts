export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession } from '../../../../lib/auth';

const template = `category,label,sortOrder
Technologies,TypeScript,0
Technologies,Astro,0
Personal Interests,Photography,1
`;

export const GET: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user?.isGuildOwner) return new Response('Forbidden', { status: 403 });
  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="label-categories-template.csv"',
    },
  });
};
