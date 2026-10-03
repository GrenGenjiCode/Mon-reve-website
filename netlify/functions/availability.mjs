// /api/availability
//   GET  → { nights: ["2026-10-10", ...] }   public: the website greys these nights out
//   POST → { key, pin, add: [...], remove: [...] }   private: saves changes from the /manage page
// Needs two Netlify environment variables: MANAGE_KEY (the secret part of the link) and BOOKING_PIN.
import { getStore } from '@netlify/blobs';
import { applyChanges, todayIndia, safeEqual } from '../lib/booked.mjs';

const NIGHTS = 'booked-nights';
const LOCK = 'pin-lock';
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async req => {
  const store = getStore({ name: 'mon-reve-bookings', consistency: 'strong' });
  const today = todayIndia();
  const current = (await store.get(NIGHTS, { type: 'json' })) || { nights: [] };

  if (req.method === 'GET') {
    return json({ nights: (current.nights || []).filter(d => d >= today), updated: current.updated || null });
  }
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  const MANAGE_KEY = process.env.MANAGE_KEY;
  const BOOKING_PIN = process.env.BOOKING_PIN;
  if (!MANAGE_KEY || !BOOKING_PIN) return json({ error: 'not-configured' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad-request' }, 400); }

  // Without the secret link there is nothing to try; this also stops strangers from locking the PIN.
  if (!safeEqual(body.key, MANAGE_KEY)) return json({ error: 'not-found' }, 404);

  const lock = (await store.get(LOCK, { type: 'json' })) || { fails: 0, until: 0 };
  if (lock.until > Date.now()) return json({ error: 'locked', minutes: Math.ceil((lock.until - Date.now()) / 60000) }, 429);

  if (!safeEqual(String(body.pin ?? ''), BOOKING_PIN)) {
    const fails = (lock.fails || 0) + 1;
    const locked = fails >= MAX_FAILS;
    await store.setJSON(LOCK, locked ? { fails: 0, until: Date.now() + LOCK_MINUTES * 60000 } : { fails, until: 0 });
    await new Promise(r => setTimeout(r, 700));
    return locked ? json({ error: 'locked', minutes: LOCK_MINUTES }, 429) : json({ error: 'wrong-pin', left: MAX_FAILS - fails }, 401);
  }
  if (lock.fails) await store.setJSON(LOCK, { fails: 0, until: 0 });

  const nights = applyChanges(current.nights, body.add, body.remove, today);
  const updated = new Date().toISOString();
  await store.setJSON(NIGHTS, { nights, updated });
  return json({ nights, updated });
};

export const config = { path: '/api/availability' };
