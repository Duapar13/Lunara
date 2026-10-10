import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../http.js';

const API = 'https://api.daily.co/v1';

async function daily(path, body) {
  if (!config.daily.apiKey || !config.daily.domain) {
    throw new HttpError(503, 'La videollamada aún no está configurada');
  }
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.daily.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error('Daily API', res.status, await res.text());
    throw new HttpError(502, 'No se pudo preparar la videollamada');
  }
  return res.json();
}

/** Salle privée à 2 participants qui expire (et éjecte tout le monde) à `expiresAt`. */
export async function createRoom(consultationId, expiresAt) {
  const name = `lunara-${consultationId}-${crypto.randomBytes(4).toString('hex')}`;
  await daily('/rooms', {
    name,
    privacy: 'private',
    properties: {
      exp: Math.floor(expiresAt.getTime() / 1000),
      eject_at_room_exp: true,
      max_participants: 2,
      enable_chat: false,
      enable_screenshare: false,
      enable_prejoin_ui: false,
      lang: 'es',
    },
  });
  return name;
}

export async function createToken({ roomName, userName, isOwner, expiresAt }) {
  const { token } = await daily('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: userName,
      is_owner: isOwner,
      exp: Math.floor(expiresAt.getTime() / 1000),
      eject_at_token_exp: true,
    },
  });
  return token;
}

export function roomUrl(roomName, token) {
  return `https://${config.daily.domain}.daily.co/${roomName}?t=${encodeURIComponent(token)}`;
}
