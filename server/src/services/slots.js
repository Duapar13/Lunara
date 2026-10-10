import { query, json } from '../db.js';

// Le Pérou est en UTC-5 toute l'année (pas d'heure d'été).
const LIMA_OFFSET_MIN = -5 * 60;
const STEP_MIN = 30;
const LEAD_MIN = 60; // délai minimum avant un créneau
const DAYS_AHEAD = 7;

export const DEFAULT_AVAILABILITY = {
  1: { start: '10:00', end: '19:00' },
  2: { start: '10:00', end: '19:00' },
  3: { start: '10:00', end: '19:00' },
  4: { start: '10:00', end: '19:00' },
  5: { start: '10:00', end: '19:00' },
  6: { start: '10:00', end: '14:00' },
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Créneaux de visio libres pour les 7 prochains jours, groupés par jour (heure de Lima).
 * `availability` : { "0".."6": { start: "HH:MM", end: "HH:MM" } } avec 0 = dimanche.
 */
export async function videoSlots(readerId, availabilityRaw, durationMin) {
  const availability = json(availabilityRaw, DEFAULT_AVAILABILITY);
  const now = Date.now();
  const horizon = now + (DAYS_AHEAD + 1) * 86400_000;

  const booked = await query(
    `SELECT scheduled_at, units FROM consultations
     WHERE reader_id = ? AND type = 'video' AND status IN ('paid', 'active', 'pending_payment')
       AND scheduled_at BETWEEN UTC_TIMESTAMP() AND ?`,
    [readerId, new Date(horizon)],
  );
  const busy = booked.map((b) => {
    const start = new Date(b.scheduled_at).getTime();
    return [start, start + b.units * 60_000];
  });

  const limaNow = new Date(now + LIMA_OFFSET_MIN * 60_000);
  const days = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(Date.UTC(limaNow.getUTCFullYear(), limaNow.getUTCMonth(), limaNow.getUTCDate() + d));
    const range = availability[day.getUTCDay()];
    if (!range) continue;

    const slots = [];
    for (let m = toMinutes(range.start); m + durationMin <= toMinutes(range.end); m += STEP_MIN) {
      const start = day.getTime() + (m - LIMA_OFFSET_MIN) * 60_000;
      const end = start + durationMin * 60_000;
      if (start < now + LEAD_MIN * 60_000) continue;
      if (busy.some(([bs, be]) => start < be && end > bs)) continue;
      slots.push(new Date(start).toISOString());
    }
    if (slots.length) days.push({ date: day.toISOString().slice(0, 10), slots });
  }
  return days;
}
