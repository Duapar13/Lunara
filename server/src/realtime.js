import { Server } from 'socket.io';
import { config } from './config.js';
import { query } from './db.js';
import { userFromToken, verifyToken } from './middleware/auth.js';
import { HttpError, badRequest, forbidden } from './http.js';
import { videoWindow } from './services/call.js';

let io;
const connections = new Map(); // userId -> nombre de sockets « app » ouverts
const callEndTimers = new Map(); // consultationId -> minuterie de fin de visio

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConsultation(consultationId, event, payload) {
  io?.to(`consultation:${consultationId}`).emit(event, payload);
}

export function broadcast(event, payload) {
  io?.emit(event, payload);
}

export function isConnected(userId) {
  return (connections.get(userId) ?? 0) > 0;
}

/** Transforme une exception en réponse d'acquittement Socket.io. */
function ackError(ack, err) {
  if (!(err instanceof HttpError)) console.error(err);
  ack?.({ error: err instanceof HttpError ? err.message : 'Error del servidor' });
}

/** Ferme la visio pour les deux participants à la fin du créneau. */
function scheduleCallEnd(consultationId, endsAt) {
  if (callEndTimers.has(consultationId)) return;
  const timer = setTimeout(() => {
    io?.to(`call:${consultationId}`).emit('call:ended');
    callEndTimers.delete(consultationId);
  }, Math.max(0, endsAt - Date.now()));
  callEndTimers.set(consultationId, timer);
}

/**
 * Signalisation de la visio maison (WebRTC) : la page d'appel rejoint la salle `call:<id>`,
 * et le serveur relaie offres, réponses et candidats ICE entre les deux participants.
 * Le média passe en direct entre les téléphones, ou par notre relais TURN si nécessaire.
 */
function registerCallHandlers(socket, user, loadForUser) {
  const callId = socket.data.callId;

  socket.on('call:join', async (consultationId, ack) => {
    try {
      const id = Number(consultationId);
      if (id !== callId) throw forbidden();
      const c = await loadForUser(id, user);
      if (c.type !== 'video' || !['paid', 'active'].includes(c.status)) throw badRequest('La videollamada no está disponible');
      const { endsAt } = videoWindow(c);
      if (Date.now() > endsAt) throw badRequest('El horario de esta videollamada ya terminó');

      const room = `call:${id}`;
      const inRoom = await io.in(room).fetchSockets();
      // La même personne qui revient (reconnexion, autre appareil) remplace son ancienne connexion.
      for (const s of inRoom.filter((s) => s.data.user.id === user.id)) {
        s.emit('call:replaced');
        s.leave(room);
      }
      const peer = inRoom.find((s) => s.data.user.id !== user.id);
      socket.join(room);
      socket.data.callRoom = room;
      // Celui qui attendait déjà lance la négociation WebRTC (offre).
      socket.to(room).emit('call:peer-joined');
      scheduleCallEnd(id, endsAt);
      ack?.({ ok: true, peerPresent: !!peer, endsAt: new Date(endsAt).toISOString() });
    } catch (err) {
      ackError(ack, err);
    }
  });

  socket.on('call:signal', (payload = {}) => {
    const room = socket.data.callRoom;
    if (!room || Number(payload.consultationId) !== callId) return;
    socket.to(room).emit('call:signal', { description: payload.description, candidate: payload.candidate, fresh: payload.fresh });
  });

  socket.on('call:media', (payload = {}) => {
    const room = socket.data.callRoom;
    if (room) socket.to(room).emit('call:media', { audio: !!payload.audio, video: !!payload.video });
  });

  const leave = () => {
    const room = socket.data.callRoom;
    if (!room) return;
    socket.to(room).emit('call:peer-left');
    socket.leave(room);
    socket.data.callRoom = null;
  };
  socket.on('call:leave', leave);
  socket.on('disconnect', leave);
}

/** Événements de l'app : chat, consultations, présence. */
function registerAppHandlers(socket, user, { loadForUser, sendMessage }) {
  socket.join(`user:${user.id}`);
  connections.set(user.id, (connections.get(user.id) ?? 0) + 1);

  socket.on('consultation:join', async (consultationId, ack) => {
    try {
      await loadForUser(Number(consultationId), user);
      socket.join(`consultation:${consultationId}`);
      ack?.({ ok: true });
    } catch (err) {
      ackError(ack, err);
    }
  });

  socket.on('consultation:leave', (consultationId) => {
    socket.leave(`consultation:${consultationId}`);
  });

  socket.on('message:send', async ({ consultationId, body } = {}, ack) => {
    try {
      const message = await sendMessage(Number(consultationId), user, body);
      ack?.({ message });
    } catch (err) {
      ackError(ack, err);
    }
  });

  socket.on('typing', ({ consultationId } = {}) => {
    if (socket.rooms.has(`consultation:${consultationId}`)) {
      socket.to(`consultation:${consultationId}`).emit('typing', { consultationId, userId: user.id });
    }
  });

  socket.on('disconnect', async () => {
    const left = (connections.get(user.id) ?? 1) - 1;
    if (left > 0) return connections.set(user.id, left);
    connections.delete(user.id);
    // Une voyante qui ferme l'app n'apparaît plus « En línea ».
    if (user.role === 'reader') {
      const res = await query('UPDATE reader_profiles SET is_available = 0 WHERE user_id = ? AND is_available = 1', [
        user.id,
      ]);
      if (res.affectedRows) broadcast('reader:presence', { readerId: user.id, online: false });
    }
  });
}

export function initRealtime(httpServer, handlers) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins.includes('*') ? true : config.corsOrigins },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = await userFromToken(token, { allowCallToken: true });
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    socket.data.callId = verifyToken(token)?.call ?? null;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    // Un jeton d'appel n'ouvre que la signalisation de sa visio, rien d'autre.
    if (socket.data.callId) registerCallHandlers(socket, user, handlers.loadForUser);
    else registerAppHandlers(socket, user, handlers);
  });

  return io;
}
