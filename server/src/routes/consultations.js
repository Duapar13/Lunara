import { Router } from 'express';
import { z } from 'zod';
import { query, one } from '../db.js';
import { config } from '../config.js';
import { parse, badRequest, forbidden, HttpError } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import { isConnected } from '../realtime.js';
import * as consultations from '../services/consultations.js';
import { videoSlots } from '../services/slots.js';
import { callToken, iceServers, videoWindow } from '../services/call.js';
import { refundConsultation } from '../services/payments.js';

export const router = Router();
router.use(requireAuth());

export const TOPICS = ['amor', 'trabajo', 'dinero', 'familia', 'energia', 'general'];

router.get('/', async (req, res) => {
  const scope = req.query.scope === 'history' ? 'history' : 'active';
  res.json({ consultations: await consultations.listForUser(req.user, scope) });
});

router.get('/:id', async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  const messages = await query(
    'SELECT * FROM (SELECT * FROM messages WHERE consultation_id = ? ORDER BY id DESC LIMIT 300) m ORDER BY id ASC',
    [c.id],
  );
  const review = await one('SELECT rating, comment, created_at FROM reviews WHERE consultation_id = ?', [c.id]);
  res.json({
    consultation: consultations.serialize(c),
    messages: messages.map(consultations.serializeMessage),
    review: review && { rating: review.rating, comment: review.comment, createdAt: review.created_at },
  });
});

const createSchema = z.object({
  readerId: z.number().int().positive(),
  offerId: z.number().int().positive(),
  topic: z.enum(TOPICS).default('general'),
  question: z.string().trim().max(1000).optional(),
  scheduledAt: z.iso.datetime().nullable().optional(),
});

router.post('/', requireAuth('client'), async (req, res) => {
  const data = parse(createSchema, req.body);
  const reader = await one(
    "SELECT * FROM reader_profiles WHERE user_id = ? AND status = 'approved'",
    [data.readerId],
  );
  if (!reader) throw badRequest('Este experto no está disponible');
  const offer = await one('SELECT * FROM reader_offers WHERE id = ? AND reader_id = ? AND active = 1', [
    data.offerId,
    data.readerId,
  ]);
  if (!offer) throw badRequest('Paquete no disponible');

  let scheduledAt = null;
  if (offer.type === 'chat') {
    if (!data.question) throw badRequest('Escribe tu primera pregunta');
  } else if (data.scheduledAt) {
    const days = await videoSlots(data.readerId, reader.availability, offer.units);
    const wanted = new Date(data.scheduledAt).toISOString();
    if (!days.some((d) => d.slots.includes(wanted))) throw badRequest('Este horario ya no está disponible');
    scheduledAt = new Date(wanted);
  } else if (!config.testMode && (!reader.is_available || !isConnected(data.readerId))) {
    throw badRequest('El experto no está en línea ahora. Elige un horario.');
  }

  const r = await query(
    `INSERT INTO consultations (client_id, reader_id, offer_id, type, units, price_cents, currency, topic, intake_question, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PEN', ?, ?, ?)`,
    [req.user.id, data.readerId, offer.id, offer.type, offer.units, offer.price_cents, data.topic, data.question ?? null, scheduledAt],
  );
  res.status(201).json({ consultation: consultations.serialize(await consultations.load(r.insertId)) });
});

router.post('/:id/messages', async (req, res) => {
  const message = await consultations.sendMessage(Number(req.params.id), req.user, req.body?.body);
  res.status(201).json({ message });
});

const videoSchema = z.object({ lang: z.enum(['es', 'fr']).default('es') });

/**
 * Visio maison : renvoie l'adresse de notre page d'appel WebRTC (servie par cette API), avec un jeton
 * d'appel personnel et les identifiants TURN temporaires, passés dans le fragment (#) pour ne jamais
 * apparaître dans les journaux du serveur.
 */
router.post('/:id/video', async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  if (c.type !== 'video') throw badRequest('Esta consulta es por chat');
  if (!['paid', 'active'].includes(c.status)) throw badRequest('La videollamada no está disponible');
  const { lang } = parse(videoSchema, req.body ?? {});

  const { opensAt, endsAt } = videoWindow(c);
  const now = Date.now();
  if (now < opensAt) throw badRequest('Podrás entrar 10 minutos antes de la hora reservada');
  if (now > endsAt) throw badRequest('El horario de esta videollamada ya terminó');
  if (c.status === 'paid') await consultations.startVideo(c.id);

  const isReader = req.user.id === c.reader_id;
  const fragment = new URLSearchParams({
    c: String(c.id),
    t: callToken(req.user, c.id, endsAt),
    lang,
    peer: (isReader ? c.client_name : c.reader_name).split(' ')[0],
    ice: Buffer.from(JSON.stringify(iceServers(req.user.id, endsAt))).toString('base64url'),
  });
  res.json({ url: `${config.publicUrl}/call/#${fragment}`, endsAt: new Date(endsAt - 10 * 60_000).toISOString() });
});

router.post('/:id/complete', requireAuth('reader', 'admin'), async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  const data = await consultations.complete(c.id);
  if (!data) throw badRequest('Esta consulta no se puede finalizar');
  res.json({ consultation: data });
});

router.post('/:id/cancel', async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  if (c.status === 'pending_payment') {
    return res.json({ consultation: await consultations.setStatus(c.id, 'cancelled') });
  }
  if (c.status !== 'paid') throw badRequest('Esta consulta ya empezó y no se puede cancelar');
  try {
    await refundConsultation(c);
  } catch (err) {
    console.error('Remboursement impossible', c.id, err);
    throw new HttpError(502, 'No se pudo procesar el reembolso. Escríbenos a soporte.');
  }
  res.json({ consultation: await consultations.setStatus(c.id, 'refunded') });
});

const cardSchema = z.object({ id: z.number().int().min(0).max(21), reversed: z.boolean().default(false) });
const readingSchema = z.object({
  cards: z.array(cardSchema).min(1).max(10),
  notes: z.string().trim().max(4000).default(''),
});

router.put('/:id/reading', requireAuth('reader'), async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  if (c.reader_id !== req.user.id) throw forbidden();
  if (!['active', 'completed', 'paid'].includes(c.status)) throw badRequest('Consulta no disponible');
  const { cards, notes } = parse(readingSchema, req.body);
  await query('UPDATE consultations SET reading_cards = ?, reader_notes = ? WHERE id = ?', [
    JSON.stringify(cards),
    notes,
    c.id,
  ]);
  res.json({ consultation: consultations.serialize(await consultations.load(c.id)) });
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

router.post('/:id/review', requireAuth('client'), async (req, res) => {
  const c = await consultations.loadForUser(Number(req.params.id), req.user);
  if (c.client_id !== req.user.id) throw forbidden();
  if (c.status !== 'completed') throw badRequest('Podrás dejar tu reseña al terminar la consulta');
  const { rating, comment } = parse(reviewSchema, req.body);
  try {
    await query('INSERT INTO reviews (consultation_id, client_id, reader_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [
      c.id,
      c.client_id,
      c.reader_id,
      rating,
      comment || null,
    ]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Ya dejaste una reseña para esta consulta');
    throw err;
  }
  await query(
    `UPDATE reader_profiles p
     JOIN (SELECT reader_id, AVG(rating) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE reader_id = ?) s
       ON s.reader_id = p.user_id
     SET p.rating_avg = s.avg_r, p.rating_count = s.cnt`,
    [c.reader_id],
  );
  res.status(201).json({ ok: true });
});
