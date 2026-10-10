import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { one } from '../db.js';
import { HttpError, forbidden } from '../http.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
}

/** Vérifie un jeton et renvoie son contenu, ou null. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

/**
 * Utilisateur d'un jeton. Les jetons d'appel (visio) sont refusés par défaut :
 * ils ne servent qu'à la signalisation de leur visio, pas à l'API.
 */
export async function userFromToken(token, { allowCallToken = false } = {}) {
  const payload = token ? verifyToken(token) : null;
  if (!payload || (payload.call && !allowCallToken)) return null;
  return one('SELECT id, role, name, email, avatar_url FROM users WHERE id = ?', [payload.sub]);
}

/** Exige un utilisateur connecté, éventuellement avec l'un des rôles donnés. */
export function requireAuth(...roles) {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const user = token ? await userFromToken(token) : null;
    if (!user) return next(new HttpError(401, 'Sesión expirada, vuelve a iniciar sesión'));
    if (roles.length && !roles.includes(user.role)) return next(forbidden());
    req.user = user;
    next();
  };
}
