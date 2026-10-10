import { Server } from 'socket.io';
import { config } from './config.js';
import { query } from './db.js';
import { userFromToken } from './middleware/auth.js';
import { HttpError } from './http.js';

let io;
const connections = new Map(); // userId -> nombre de sockets ouverts

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

export function initRealtime(httpServer, { loadForUser, sendMessage }) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins.includes('*') ? true : config.corsOrigins },
  });

  io.use(async (socket, next) => {
    const user = await userFromToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
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
  });

  return io;
}
