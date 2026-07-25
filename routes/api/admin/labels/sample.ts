export const prerender = false;

import type { APIRoute } from 'astro';
import { getSession } from '../../../../lib/auth';

const sample = `category,label,sortOrder
Technologies,TypeScript,0
Technologies,Astro,0
Technologies,SQLite,0
Technologies,React,0
Technologies,Docker,0
Personal Interests,Photography,1
Personal Interests,Biking,1
Personal Interests,Hiking,1
Personal Interests,Amateur Radio,1
Things I Want to Learn,Japanese,2
Things I Want to Learn,3D Printing,2
Things I Want to Learn,Rust,2
`;

export const GET: APIRoute = async ({ request }) => {
  const user = await getSession(request);
  if (!user?.isGuildOwner) return new Response('Forbidden', { status: 403 });
  return new Response(sample, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="label-categories-sample.csv"' } });
};
