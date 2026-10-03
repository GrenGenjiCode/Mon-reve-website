// /manage?k=SECRET  → the private page for marking booked dates.
// Anyone without the right link gets a plain "Not found". Saving still needs the PIN (checked in availability.mjs).
import { safeEqual } from '../lib/booked.mjs';
import { page } from '../lib/manage-page.mjs';

const base = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };

export default async req => {
  const k = new URL(req.url).searchParams.get('k') || '';
  if (!safeEqual(k, process.env.MANAGE_KEY || '')) {
    return new Response('Not found', { status: 404, headers: { ...base, 'Content-Type': 'text/plain' } });
  }
  return new Response(page, { headers: { ...base, 'Content-Type': 'text/html; charset=utf-8' } });
};

export const config = { path: '/manage' };
