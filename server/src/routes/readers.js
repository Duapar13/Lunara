import { Router } from 'express';
import { query, one, json } from '../db.js';
import { notFound, badRequest } from '../http.js';
import { userFromToken } from '../middleware/auth.js';
import { isConnected } from '../realtime.js';
import { videoSlots } from '../services/slots.js';

export const router = Router();

export function serializeReader(r) {
  return {
    id: r.id,
    name: r.name,
    avatarUrl: r.avatar_url,
    headline: r.headline,
    bio: r.bio,
    specialties: json(r.specialties, []),
    languages: json(r.languages, []),
    yearsExperience: r.years_experience,
    status: r.status,
    online: !!r.is_available && isConnected(r.id),
    ratingAvg: Number(r.rating_avg),
    ratingCount: r.rating_count,
    consultationsCount: r.consultations_count,
    fromPriceCents: r.from_price ?? null,
    memberSince: r.created_at,
  };
}

export const serializeOffer = (o) => ({
  id: o.id,
  type: o.type,
  units: o.units,
  priceCents: o.price_cents,
  active: !!o.active,
});

const READER_SELECT = `
  SELECT u.id, u.name, u.avatar_url, u.created_at, p.*,
    (SELECT MIN(price_cents) FROM reader_offers o WHERE o.reader_id = u.id AND o.active = 1) AS from_price
  FROM users u JOIN reader_profiles p ON p.user_id = u.id`;

router.get('/', async (req, res) => {
  const { q, specialty, online, sort } = req.query;
  const where = ["p.status = 'approved'"];
  const params = [];
  if (q) {
    where.push('(u.name LIKE ? OR p.headline LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (specialty) {
    where.push('JSON_CONTAINS(p.specialties, JSON_QUOTE(?))');
    params.push(String(specialty));
  }
  const order =
    sort === 'price'
      ? 'from_price ASC'
      : sort === 'rating'
        ? 'p.rating_avg DESC, p.rating_count DESC'
        : 'p.is_available DESC, p.rating_avg DESC, p.consultations_count DESC';

  const rows = await query(`${READER_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  let readers = rows.map(serializeReader);
  if (online === '1') readers = readers.filter((r) => r.online);
  // Les voyantes réellement connectées passent devant dans le tri par défaut.
  if (!sort) readers.sort((a, b) => Number(b.online) - Number(a.online));

  let favorites = new Set();
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = token ? await userFromToken(token) : null;
  if (user) {
    const favs = await query('SELECT reader_id FROM favorites WHERE user_id = ?', [user.id]);
    favorites = new Set(favs.map((f) => f.reader_id));
  }
  res.json({ readers: readers.map((r) => ({ ...r, isFavorite: favorites.has(r.id) })) });
});

async function loadApproved(id) {
  const r = await one(`${READER_SELECT} WHERE u.id = ? AND p.status = 'approved'`, [id]);
  if (!r) throw notFound('Experto no encontrado');
  return r;
}

router.get('/:id', async (req, res) => {
  const r = await loadApproved(Number(req.params.id));
  const offers = await query(
    'SELECT * FROM reader_offers WHERE reader_id = ? AND active = 1 ORDER BY type, units',
    [r.id],
  );
  const reviews = await query(
    `SELECT rv.id, rv.rating, rv.comment, rv.created_at, u.name AS client_name, c.type, c.units
     FROM reviews rv JOIN users u ON u.id = rv.client_id JOIN consultations c ON c.id = rv.consultation_id
     WHERE rv.reader_id = ? ORDER BY rv.created_at DESC LIMIT 20`,
    [r.id],
  );

  let isFavorite = false;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = token ? await userFromToken(token) : null;
  if (user) {
    isFavorite = !!(await one('SELECT 1 FROM favorites WHERE user_id = ? AND reader_id = ?', [user.id, r.id]));
  }

  res.json({
    reader: { ...serializeReader(r), isFavorite },
    offers: offers.map(serializeOffer),
    reviews: reviews.map((rv) => ({
      id: rv.id,
      rating: rv.rating,
      comment: rv.comment,
      createdAt: rv.created_at,
      // Prénom + initiale seulement, pour la vie privée des clients.
      clientName: rv.client_name.split(' ')[0] + (rv.client_name.split(' ')[1] ? ` ${rv.client_name.split(' ')[1][0]}.` : ''),
      consultationType: rv.type,
      consultationUnits: rv.units,
    })),
  });
});

router.get('/:id/slots', async (req, res) => {
  const r = await loadApproved(Number(req.params.id));
  const offer = await one(
    "SELECT * FROM reader_offers WHERE id = ? AND reader_id = ? AND type = 'video' AND active = 1",
    [Number(req.query.offerId), r.id],
  );
  if (!offer) throw badRequest('Paquete de video no válido');
  res.json({ days: await videoSlots(r.id, r.availability, offer.units) });
});
