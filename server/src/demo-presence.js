// DÉMO : garde quelques voyantes de démonstration « En línea » (connexion Socket.io réelle).
// Lancé par le service systemd lunara-demo ; à arrêter avant le lancement public :
//   systemctl disable --now lunara-demo
import { io } from 'socket.io-client';
import { config } from './config.js';

const API = `http://127.0.0.1:${config.port}`;
const ONLINE = (process.env.DEMO_ONLINE || 'valeria,sofia,mateo,isabella').split(',');

async function goOnline(key) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${key}@demo.lunara.app`, password: 'lunara123' }),
  });
  if (!res.ok) throw new Error(`login ${key}: ${res.status}`);
  const { token } = await res.json();
  const socket = io(API, { auth: { token }, transports: ['websocket'], reconnection: true });
  // À chaque (re)connexion, on se remet en ligne : le serveur passe hors ligne à la déconnexion.
  socket.on('connect', async () => {
    await fetch(`${API}/reader/online`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ online: true }),
    });
    console.log(`${key} en ligne`);
  });
  socket.on('connect_error', (e) => console.error(`${key}: ${e.message}`));
}

for (const key of ONLINE) {
  goOnline(key).catch((e) => console.error(e.message));
}
