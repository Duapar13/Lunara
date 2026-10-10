import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { parse } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../realtime.js';
import { serializeReader } from './readers.js';

/** Validation des profils de voyantes avant leur publication. */
export const router = Router();
router.use(requireAuth('admin'));

router.get('/readers', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.created_at, p.* FROM users u
     JOIN reader_profiles p ON p.user_id = u.id WHERE p.status = ? ORDER BY u.created_at DESC LIMIT 100`,
    [status],
  );
  res.json({ readers: rows.map((r) => ({ ...serializeReader(r), email: r.email })) });
});

router.post('/readers/:id/status', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['approved', 'rejected', 'pending']) }), req.body);
  const id = Number(req.params.id);
  await query('UPDATE reader_profiles SET status = ?, is_available = 0 WHERE user_id = ?', [status, id]);
  emitToUser(id, 'notify', {
    title: 'Lunara',
    body: status === 'approved' ? '¡Tu perfil fue aprobado! Ya puedes recibir consultas.' : 'Tu perfil fue revisado.',
  });
  res.json({ ok: true });
});
