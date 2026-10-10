import { Router } from 'express';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { query, one } from '../db.js';
import { parse, badRequest } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from './auth.js';
import { serializeReader } from './readers.js';

export const router = Router();
router.use(requireAuth());

export const UPLOAD_DIR = new URL('../../uploads/', import.meta.url);
mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: fileURLToPath(UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}.${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT),
});

router.patch('/', async (req, res) => {
  const { name } = parse(z.object({ name: z.string().trim().min(2).max(80) }), req.body);
  await query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
  res.json({ user: publicUser(await one('SELECT * FROM users WHERE id = ?', [req.user.id])) });
});

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) throw badRequest('Imagen no válida (JPG, PNG o WebP)');
  const url = `${config.publicUrl}/uploads/${req.file.filename}`;
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
  res.json({ user: publicUser(await one('SELECT * FROM users WHERE id = ?', [req.user.id])) });
});

router.get('/favorites', async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, u.avatar_url, u.created_at, p.*,
       (SELECT MIN(price_cents) FROM reader_offers o WHERE o.reader_id = u.id AND o.active = 1) AS from_price
     FROM favorites f JOIN users u ON u.id = f.reader_id JOIN reader_profiles p ON p.user_id = u.id
     WHERE f.user_id = ? AND p.status = 'approved' ORDER BY f.created_at DESC`,
    [req.user.id],
  );
  res.json({ readers: rows.map((r) => ({ ...serializeReader(r), isFavorite: true })) });
});

router.put('/favorites/:readerId', async (req, res) => {
  await query('INSERT IGNORE INTO favorites (user_id, reader_id) VALUES (?, ?)', [
    req.user.id,
    Number(req.params.readerId),
  ]);
  res.json({ ok: true });
});

router.delete('/favorites/:readerId', async (req, res) => {
  await query('DELETE FROM favorites WHERE user_id = ? AND reader_id = ?', [req.user.id, Number(req.params.readerId)]);
  res.json({ ok: true });
});
