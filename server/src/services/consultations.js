import { query, one, json } from '../db.js';
import { badRequest, forbidden, notFound } from '../http.js';
import { emitToConsultation, emitToUser } from '../realtime.js';

const SELECT = `
  SELECT c.*,
    cu.name AS client_name, cu.avatar_url AS client_avatar,
    ru.name AS reader_name, ru.avatar_url AS reader_avatar,
    (SELECT r.rating FROM reviews r WHERE r.consultation_id = c.id) AS review_rating
  FROM consultations c
  JOIN users cu ON cu.id = c.client_id
  JOIN users ru ON ru.id = c.reader_id`;

export function serialize(c) {
  return {
    id: c.id,
    type: c.type,
    units: c.units,
    priceCents: c.price_cents,
    currency: c.currency,
    status: c.status,
    topic: c.topic,
    intakeQuestion: c.intake_question,
    scheduledAt: c.scheduled_at,
    startedAt: c.started_at,
    endedAt: c.ended_at,
    questionsUsed: c.questions_used,
    paymentProvider: c.payment_provider,
    readingCards: json(c.reading_cards, null),
    readerNotes: c.reader_notes,
    reviewRating: c.review_rating ?? null,
    createdAt: c.created_at,
    client: { id: c.client_id, name: c.client_name, avatarUrl: c.client_avatar },
    reader: { id: c.reader_id, name: c.reader_name, avatarUrl: c.reader_avatar },
  };
}

export function serializeMessage(m) {
  return {
    id: m.id,
    consultationId: m.consultation_id,
    senderId: m.sender_id,
    body: m.body,
    isQuestion: !!m.is_question,
    createdAt: m.created_at,
  };
}

export async function load(id) {
  const c = await one(`${SELECT} WHERE c.id = ?`, [id]);
  if (!c) throw notFound('Consulta no encontrada');
  return c;
}

/** Charge une consultation en vérifiant que l'utilisateur y participe (ou est admin). */
export async function loadForUser(id, user) {
  const c = await load(id);
  if (user.role !== 'admin' && c.client_id !== user.id && c.reader_id !== user.id) throw forbidden();
  return c;
}

export async function listForUser(user, scope) {
  const column = user.role === 'reader' ? 'c.reader_id' : 'c.client_id';
  const statuses = scope === 'history' ? ['completed', 'cancelled', 'refunded'] : ['paid', 'active'];
  const rows = await query(
    `${SELECT} WHERE ${column} = ? AND c.status IN (?)
     ORDER BY COALESCE(c.scheduled_at, c.created_at) ${scope === 'history' ? 'DESC' : 'ASC'} LIMIT 100`,
    [user.id, statuses],
  );
  return rows.map(serialize);
}

async function notifyUpdated(id) {
  const c = await load(id);
  const data = serialize(c);
  emitToConsultation(id, 'consultation:updated', data);
  emitToUser(c.client_id, 'consultation:updated', data);
  emitToUser(c.reader_id, 'consultation:updated', data);
  return data;
}

/**
 * Passe une consultation à « payée » (idempotent : webhook et confirmation client peuvent arriver tous deux).
 * Vérifie le montant pour qu'un paiement partiel ou falsifié ne valide pas la réservation.
 */
export async function markPaid(id, { provider, ref, amountCents, currency, status = 'succeeded' }) {
  const c = await one('SELECT * FROM consultations WHERE id = ?', [id]);
  if (!c) return null;

  await query(
    `INSERT INTO payments (consultation_id, provider, provider_ref, amount_cents, currency, status)
     VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [id, provider, String(ref), amountCents, currency.toUpperCase(), status],
  );

  if (amountCents !== c.price_cents || currency.toUpperCase() !== c.currency) {
    console.error(`Montant incohérent pour la consultation ${id}: ${amountCents} ${currency}`);
    return null;
  }

  const res = await query(
    `UPDATE consultations SET status = 'paid', payment_provider = ?, payment_ref = ?
     WHERE id = ? AND status = 'pending_payment'`,
    [provider, String(ref), id],
  );
  if (!res.affectedRows) return serialize(await load(id));

  // La question posée à la réservation devient la 1re question du chat.
  if (c.type === 'chat' && c.intake_question) {
    await query('INSERT INTO messages (consultation_id, sender_id, body, is_question) VALUES (?, ?, ?, 1)', [
      id,
      c.client_id,
      c.intake_question,
    ]);
    await query('UPDATE consultations SET questions_used = 1 WHERE id = ?', [id]);
  }

  const data = await notifyUpdated(id);
  emitToUser(c.reader_id, 'notify', {
    title: 'Nueva consulta',
    body: `${data.client.name} reservó una consulta`,
    consultationId: id,
  });
  return data;
}

export async function sendMessage(id, user, rawBody) {
  const body = String(rawBody ?? '').trim();
  if (!body) throw badRequest('El mensaje está vacío');
  if (body.length > 2000) throw badRequest('El mensaje es demasiado largo');

  const c = await loadForUser(id, user);
  if (c.type !== 'chat') throw badRequest('Esta consulta es por videollamada');
  if (!['paid', 'active'].includes(c.status)) throw badRequest('La consulta no está abierta');

  const isClient = user.id === c.client_id;
  if (isClient) {
    // Décrément atomique : impossible de dépasser le forfait même avec deux envois simultanés.
    const res = await query(
      'UPDATE consultations SET questions_used = questions_used + 1 WHERE id = ? AND questions_used < units',
      [id],
    );
    if (!res.affectedRows) throw badRequest('Ya usaste todas las preguntas de tu paquete');
  } else if (c.status === 'paid') {
    await query("UPDATE consultations SET status = 'active', started_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
  }

  const res = await query('INSERT INTO messages (consultation_id, sender_id, body, is_question) VALUES (?, ?, ?, ?)', [
    id,
    user.id,
    body,
    isClient ? 1 : 0,
  ]);
  const message = serializeMessage(await one('SELECT * FROM messages WHERE id = ?', [res.insertId]));

  emitToConsultation(id, 'message:new', message);
  const otherId = isClient ? c.reader_id : c.client_id;
  emitToUser(otherId, 'notify', { title: user.name, body: body.slice(0, 120), consultationId: id });
  if (isClient || c.status === 'paid') await notifyUpdated(id);
  return message;
}

export async function complete(id) {
  const res = await query(
    `UPDATE consultations SET status = 'completed', ended_at = UTC_TIMESTAMP()
     WHERE id = ? AND status IN ('paid', 'active')`,
    [id],
  );
  if (!res.affectedRows) return null;
  const c = await one('SELECT reader_id FROM consultations WHERE id = ?', [id]);
  await query('UPDATE reader_profiles SET consultations_count = consultations_count + 1 WHERE user_id = ?', [
    c.reader_id,
  ]);
  return notifyUpdated(id);
}

export async function setStatus(id, status) {
  await query('UPDATE consultations SET status = ? WHERE id = ?', [status, id]);
  return notifyUpdated(id);
}

export async function startVideo(id) {
  await query(
    "UPDATE consultations SET status = 'active', started_at = COALESCE(started_at, UTC_TIMESTAMP()) WHERE id = ?",
    [id],
  );
  return notifyUpdated(id);
}

/** Tâche périodique : clôt les visios expirées et libère les réservations jamais payées. */
export async function sweep() {
  const expired = await query(
    `SELECT id FROM consultations WHERE type = 'video' AND status = 'active'
       AND TIMESTAMPADD(MINUTE, units + 15, COALESCE(scheduled_at, started_at)) < UTC_TIMESTAMP()`,
  );
  for (const { id } of expired) await complete(id);
  await query(
    `UPDATE consultations SET status = 'cancelled'
     WHERE status = 'pending_payment' AND created_at < UTC_TIMESTAMP() - INTERVAL 2 HOUR`,
  );
}
