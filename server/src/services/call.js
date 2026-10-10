import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Fenêtre pendant laquelle on peut rejoindre la visio d'une consultation.
 * - créneau réservé : de 10 min avant à 10 min après la fin ;
 * - « Ahora » (ou mode test) : la durée court à partir de la première entrée.
 */
export function videoWindow(c) {
  const durationMs = c.units * 60_000;
  if (c.scheduled_at && !config.testMode) {
    const start = new Date(c.scheduled_at).getTime();
    return { opensAt: start - 10 * 60_000, endsAt: start + durationMs + 10 * 60_000 };
  }
  const start = c.started_at ? new Date(c.started_at).getTime() : Date.now();
  return { opensAt: 0, endsAt: start + durationMs + 10 * 60_000 };
}

/**
 * Serveurs ICE pour WebRTC : STUN public + notre relais TURN (coturn).
 * Identifiants TURN temporaires (« TURN REST API ») : username = expiration:utilisateur,
 * mot de passe = HMAC-SHA1 du username avec le secret partagé avec coturn.
 */
export function iceServers(userId, expiresAt) {
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (config.turn.secret && config.turn.host) {
    const username = `${Math.floor(expiresAt / 1000) + 3600}:${userId}`;
    const credential = crypto.createHmac('sha1', config.turn.secret).update(username).digest('base64');
    servers.push({
      urls: [
        `stun:${config.turn.host}:3478`,
        `turn:${config.turn.host}:3478?transport=udp`,
        `turn:${config.turn.host}:3478?transport=tcp`,
      ],
      username,
      credential,
    });
  }
  return servers;
}

/** Jeton d'appel : ne sert qu'à la signalisation de CETTE visio et expire à la fin du créneau. */
export function callToken(user, consultationId, expiresAt) {
  const seconds = Math.max(60, Math.ceil((expiresAt - Date.now()) / 1000) + 60);
  return jwt.sign({ sub: user.id, role: user.role, call: consultationId }, config.jwtSecret, { expiresIn: seconds });
}
