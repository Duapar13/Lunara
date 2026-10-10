import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool, one } from '../db.js';
import { parse, HttpError } from '../http.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { DEFAULT_AVAILABILITY } from '../services/slots.js';

export const router = Router();

router.use(rateLimit({ windowMs: 15 * 60_000, limit: 30 }));

// Forfaits par défaut d'une nouvelle voyante (modifiables dans son tableau de bord), en céntimos de sol.
const DEFAULT_OFFERS = [
  ['chat', 1, 1500],
  ['chat', 3, 3500],
  ['chat', 5, 5000],
  ['video', 30, 6000],
  ['video', 60, 10000],
];

export function publicUser(u) {
  return { id: u.id, role: u.role, name: u.name, email: u.email, avatarUrl: u.avatar_url };
}

const registerSchema = z.object({
  role: z.enum(['client', 'reader']),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(190).transform((e) => e.toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  country: z.string().length(2).toUpperCase().optional(),
});

router.post('/register', async (req, res) => {
  const data = parse(registerSchema, req.body);
  if (await one('SELECT id FROM users WHERE email = ?', [data.email])) {
    throw new HttpError(409, 'Ya existe una cuenta con este correo');
  }
  const hash = await bcrypt.hash(data.password, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO users (role, email, password_hash, name, country) VALUES (?, ?, ?, ?, ?)', [
      data.role,
      data.email,
      hash,
      data.name,
      data.country ?? 'PE',
    ]);
    if (data.role === 'reader') {
      await conn.query(
        `INSERT INTO reader_profiles (user_id, specialties, languages, availability) VALUES (?, ?, ?, ?)`,
        [r.insertId, JSON.stringify(['Tarot']), JSON.stringify(['Español']), JSON.stringify(DEFAULT_AVAILABILITY)],
      );
      await conn.query('INSERT INTO reader_offers (reader_id, type, units, price_cents) VALUES ?', [
        DEFAULT_OFFERS.map(([type, units, price]) => [r.insertId, type, units, price]),
      ]);
    }
    await conn.commit();
    const user = await one('SELECT * FROM users WHERE id = ?', [r.insertId]);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

router.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const user = await one('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Correo o contraseña incorrectos');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
});
