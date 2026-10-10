import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool, query, one, json } from '../db.js';
import { parse, badRequest } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcast, isConnected } from '../realtime.js';
import { serializeReader, serializeOffer } from './readers.js';
import { DEFAULT_AVAILABILITY } from '../services/slots.js';

/** Tableau de bord de la voyante connectée. */
export const router = Router();
router.use(requireAuth('reader'));

const READER = `SELECT u.id, u.name, u.avatar_url, u.created_at, p.* FROM users u
  JOIN reader_profiles p ON p.user_id = u.id WHERE u.id = ?`;

router.get('/me', async (req, res) => {
  const r = await one(READER, [req.user.id]);
  const offers = await query('SELECT * FROM reader_offers WHERE reader_id = ? ORDER BY type, units', [req.user.id]);
  const stats = await one(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'completed' THEN price_cents END), 0) AS gross_total,
       COALESCE(SUM(CASE WHEN status = 'completed' AND ended_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01') THEN price_cents END), 0) AS gross_month,
       SUM(status IN ('paid', 'active')) AS open_count
     FROM consultations WHERE reader_id = ?`,
    [req.user.id],
  );
  const net = (cents) => Math.round(Number(cents) * (1 - config.commission));
  res.json({
    reader: { ...serializeReader(r), online: !!r.is_available && isConnected(r.id) },
    availability: json(r.availability, DEFAULT_AVAILABILITY),
    offers: offers.map(serializeOffer),
    stats: {
      earningsMonthCents: net(stats.gross_month),
      earningsTotalCents: net(stats.gross_total),
      openConsultations: Number(stats.open_count ?? 0),
      commission: config.commission,
    },
  });
});

const profileSchema = z.object({
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
  specialties: z.array(z.string().trim().min(1).max(30)).max(10),
  languages: z.array(z.string().trim().min(1).max(30)).max(6),
  yearsExperience: z.number().int().min(0).max(80),
});

router.put('/profile', async (req, res) => {
  const d = parse(profileSchema, req.body);
  await query(
    'UPDATE reader_profiles SET headline = ?, bio = ?, specialties = ?, languages = ?, years_experience = ? WHERE user_id = ?',
    [d.headline, d.bio, JSON.stringify(d.specialties), JSON.stringify(d.languages), d.yearsExperience, req.user.id],
  );
  res.json({ ok: true });
});

const ALLOWED_UNITS = { chat: [1, 3, 5], video: [30, 60] };
const offersSchema = z.object({
  offers: z
    .array(
      z.object({
        type: z.enum(['chat', 'video']),
        units: z.number().int(),
        priceCents: z.number().int().min(500).max(100000),
        active: z.boolean(),
      }),
    )
    .max(5),
});

router.put('/offers', async (req, res) => {
  const { offers } = parse(offersSchema, req.body);
  for (const o of offers) {
    if (!ALLOWED_UNITS[o.type].includes(o.units)) throw badRequest('Paquete no válido');
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const o of offers) {
      await conn.query(
        `INSERT INTO reader_offers (reader_id, type, units, price_cents, active) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE price_cents = VALUES(price_cents), active = VALUES(active)`,
        [req.user.id, o.type, o.units, o.priceCents, o.active ? 1 : 0],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  const rows = await query('SELECT * FROM reader_offers WHERE reader_id = ? ORDER BY type, units', [req.user.id]);
  res.json({ offers: rows.map(serializeOffer) });
});

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const availabilitySchema = z.object({
  // partialRecord : une voyante peut ne travailler que certains jours.
  availability: z.partialRecord(
    z.enum(['0', '1', '2', '3', '4', '5', '6']),
    z.object({ start: HHMM, end: HHMM }).refine((r) => r.start < r.end, 'El horario de fin debe ser posterior'),
  ),
});

router.put('/availability', async (req, res) => {
  const { availability } = parse(availabilitySchema, req.body);
  await query('UPDATE reader_profiles SET availability = ? WHERE user_id = ?', [
    JSON.stringify(availability),
    req.user.id,
  ]);
  res.json({ availability });
});

router.post('/online', async (req, res) => {
  const { online } = parse(z.object({ online: z.boolean() }), req.body);
  const r = await one('SELECT status FROM reader_profiles WHERE user_id = ?', [req.user.id]);
  if (online && r.status !== 'approved') {
    throw badRequest('Tu perfil está en revisión. Podrás conectarte cuando sea aprobado.');
  }
  await query('UPDATE reader_profiles SET is_available = ? WHERE user_id = ?', [online ? 1 : 0, req.user.id]);
  broadcast('reader:presence', { readerId: req.user.id, online: online && isConnected(req.user.id) });
  res.json({ online });
});
