import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query, one, json } from '../db.js';
import { parse, badRequest, forbidden, HttpError } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import { interpretDaily, interpretDeepen } from '../services/claude.js';
import { loadForUser } from '../services/consultations.js';
import { TOPICS } from './consultations.js';

export const router = Router();
router.use(requireAuth());

async function checkQuota(userId) {
  const row = await one(
    'SELECT COUNT(*) AS n FROM ai_readings WHERE user_id = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY',
    [userId],
  );
  if (row.n >= config.ai.dailyLimit) {
    throw new HttpError(429, 'Alcanzaste el límite de interpretaciones de hoy. Vuelve mañana o consulta a un experto.');
  }
}

const cardSchema = z.object({ id: z.number().int().min(0).max(21), reversed: z.boolean().default(false) });

const dailySchema = z.object({
  cards: z.array(cardSchema).length(3),
  question: z.string().trim().max(500).optional(),
  topic: z.enum(TOPICS).optional(),
  lang: z.enum(['es', 'fr']).default('es'),
});

router.post('/daily', async (req, res) => {
  const data = parse(dailySchema, req.body);
  if (new Set(data.cards.map((c) => c.id)).size !== 3) throw badRequest('Elige 3 cartas distintas');
  await checkQuota(req.user.id);
  const text = await interpretDaily(data);
  const r = await query(
    "INSERT INTO ai_readings (user_id, kind, cards, question, response) VALUES (?, 'daily', ?, ?, ?)",
    [req.user.id, JSON.stringify(data.cards), data.question ?? null, text],
  );
  res.status(201).json({ id: r.insertId, text });
});

const deepenSchema = z.object({
  consultationId: z.number().int().positive(),
  question: z.string().trim().min(3).max(500),
  lang: z.enum(['es', 'fr']).default('es'),
});

router.post('/deepen', async (req, res) => {
  const { consultationId, question, lang } = parse(deepenSchema, req.body);
  const c = await loadForUser(consultationId, req.user);
  if (c.client_id !== req.user.id) throw forbidden();
  const cards = json(c.reading_cards, null);
  if (!cards?.length) throw badRequest('Tu experto aún no registró las cartas de tu lectura');
  await checkQuota(req.user.id);
  const text = await interpretDeepen({
    cards,
    readerNotes: c.reader_notes,
    intakeQuestion: c.intake_question,
    question,
    lang,
  });
  const r = await query(
    "INSERT INTO ai_readings (user_id, consultation_id, kind, cards, question, response) VALUES (?, ?, 'deepen', ?, ?, ?)",
    [req.user.id, c.id, JSON.stringify(cards), question, text],
  );
  res.status(201).json({ id: r.insertId, text });
});

router.get('/history', async (req, res) => {
  const consultationId = req.query.consultationId ? Number(req.query.consultationId) : null;
  const rows = await query(
    `SELECT id, consultation_id, kind, cards, question, response, created_at FROM ai_readings
     WHERE user_id = ? ${consultationId ? 'AND consultation_id = ?' : ''} ORDER BY id DESC LIMIT 30`,
    consultationId ? [req.user.id, consultationId] : [req.user.id],
  );
  res.json({
    readings: rows.map((r) => ({
      id: r.id,
      consultationId: r.consultation_id,
      kind: r.kind,
      cards: json(r.cards, []),
      question: r.question,
      text: r.response,
      createdAt: r.created_at,
    })),
  });
});
