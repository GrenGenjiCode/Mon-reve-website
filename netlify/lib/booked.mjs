// Shared helpers for the booked-dates store.
// A "night" is stored as the date it starts on: a stay 10 → 13 Oct books the nights 10, 11, 12.
import { createHash, timingSafeEqual } from 'node:crypto';

export const isDate = s =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

// The villa's calendar runs on India time.
export const todayIndia = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

// Apply removals then additions; drop past nights and anything that isn't a valid date.
export function applyChanges(current, add, remove, today) {
  const set = new Set((current || []).filter(d => isDate(d) && d >= today));
  for (const d of Array.isArray(remove) ? remove.slice(0, 1000) : []) if (isDate(d)) set.delete(d);
  for (const d of Array.isArray(add) ? add.slice(0, 1000) : []) if (isDate(d) && d >= today) set.add(d);
  return [...set].sort();
}

// Constant-time comparison so the key and PIN can't be guessed from response timing.
export function safeEqual(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
