// DONNÉES DE DÉMONSTRATION — pour voir l'app « vivante » pendant le développement.
// Tous les comptes sont en @demo.lunara.app. Les avis sont FICTIFS : à purger avant le lancement public
//   npm run demo:seed    → crée / recrée les données
//   npm run demo:purge   → supprime tout ce qui est en @demo.lunara.app
import bcrypt from 'bcryptjs';
import { pool, query, one } from './db.js';
import { DEFAULT_AVAILABILITY } from './services/slots.js';

const DOMAIN = '@demo.lunara.app';
const PASSWORD = 'lunara123';

async function purge() {
  const ids = (await query(`SELECT id FROM users WHERE email LIKE ?`, [`%${DOMAIN}`])).map((u) => u.id);
  if (!ids.length) return 0;
  const cons = (await query('SELECT id FROM consultations WHERE client_id IN (?) OR reader_id IN (?)', [ids, ids])).map((c) => c.id);
  if (cons.length) {
    await query('DELETE FROM payments WHERE consultation_id IN (?)', [cons]);
    await query('DELETE FROM reviews WHERE consultation_id IN (?)', [cons]);
    await query('DELETE FROM consultations WHERE id IN (?)', [cons]);
  }
  await query('DELETE FROM reviews WHERE client_id IN (?) OR reader_id IN (?)', [ids, ids]);
  await query('DELETE FROM users WHERE id IN (?)', [ids]);
  return ids.length;
}

if (process.argv.includes('--purge')) {
  console.log(`${await purge()} comptes de démo supprimés (et leurs consultations, avis, messages).`);
  await pool.end();
  process.exit(0);
}

const READERS = [
  {
    key: 'valeria', name: 'Valeria Luna', years: 12, langs: ['Español', 'Inglés'],
    headline: 'Tarotista · Amor y relaciones',
    bio: 'Leo el tarot desde hace más de 12 años. Mi enfoque es cálido y directo: te ayudo a ver con claridad tus relaciones, tus bloqueos y las decisiones que tienes delante. Trabajo con el Tarot de Marsella y el Rider-Waite.',
    specialties: ['Tarot', 'Amor', 'Familia'], prices: [1500, 3500, 5000, 6000, 10000],
  },
  {
    key: 'diego', name: 'Diego Astral', years: 8, langs: ['Español'],
    headline: 'Tarot y astrología · Trabajo y destino',
    bio: 'Combino tu carta astral con el tarot para orientarte en tu camino profesional y en los grandes cambios de vida. Lecturas prácticas, con fechas y pasos concretos.',
    specialties: ['Tarot', 'Astrología', 'Trabajo'], prices: [1800, 4500, 6500, 7000, 12000],
  },
  {
    key: 'sofia', name: 'Sofía del Sol', years: 6, langs: ['Español', 'Portugués'],
    headline: 'Guía espiritual · Energía y limpiezas',
    bio: 'Acompaño procesos de sanación emocional con oráculos y tarot. Mis lecturas son suaves y te dejan herramientas para recuperar tu equilibrio y tu energía.',
    specialties: ['Energía', 'Oráculo', 'Tarot'], prices: [1200, 3000, 4500, 5000, 9000],
  },
  {
    key: 'mateo', name: 'Mateo Videncia', years: 15, langs: ['Español', 'Quechua'],
    headline: 'Vidente andino · Destino y familia',
    bio: 'Heredé la tradición de lectura de mi abuela en Cusco. Uso hojas de coca y tarot para leer los caminos de la familia y el destino. Hablo español y quechua.',
    specialties: ['Familia', 'Tarot', 'Runas'], prices: [2000, 5000, 7500, 8000, 14000],
  },
  {
    key: 'isabella', name: 'Isabella Cruz', years: 9, langs: ['Español', 'Inglés'],
    headline: 'Tarot evolutivo · Amor propio',
    bio: 'Mis lecturas se centran en ti: tus patrones, tus fortalezas y lo que estás listo para soltar. Ideal si atraviesas una ruptura o un nuevo comienzo.',
    specialties: ['Amor', 'Tarot', 'Energía'], prices: [1600, 4000, 5800, 6500, 11000],
  },
  {
    key: 'camila', name: 'Camila Rivas', years: 4, langs: ['Español'],
    headline: 'Numerología y tarot · Dinero',
    bio: 'Uso la numerología de tu fecha de nacimiento y el tarot para leer tus ciclos de abundancia. Lecturas claras sobre dinero, emprendimiento y oportunidades.',
    specialties: ['Numerología', 'Dinero', 'Tarot'], prices: [1000, 2800, 4200, 4500, 8000],
  },
  {
    key: 'lucia', name: 'Lucía Montes', years: 20, langs: ['Español'],
    headline: 'Maestra tarotista · Lecturas profundas',
    bio: 'Veinte años leyendo el tarot en Lima y Arequipa. Lecturas profundas y honestas para momentos importantes: decisiones, duelos, nuevos caminos.',
    specialties: ['Tarot', 'Amor', 'Trabajo', 'Familia'], prices: [2500, 6000, 9000, 9000, 16000],
  },
  {
    key: 'andres', name: 'Andrés Solar', years: 7, langs: ['Español', 'Inglés'],
    headline: 'Astrólogo · Tránsitos y revolución solar',
    bio: 'Interpreto tu carta natal y los tránsitos del año para anticipar oportunidades. Combino astrología y tarot para respuestas concretas.',
    specialties: ['Astrología', 'Trabajo', 'Dinero'], prices: [1700, 4200, 6000, 6500, 11500],
  },
];

const CLIENTS = [
  ['cliente', 'Cliente Demo'],
  ['mariana', 'Mariana Quispe'],
  ['rosa', 'Rosa Huamán'],
  ['carlos', 'Carlos Mendoza'],
  ['ana', 'Ana Flores'],
  ['jorge', 'Jorge Salazar'],
  ['paola', 'Paola Vargas'],
  ['lucho', 'Luis Castillo'],
];

const REVIEWS = [
  [5, 'Muy acertada, me ayudó a ver la situación con otros ojos. Totalmente recomendada.'],
  [5, 'Me sentí escuchada desde el primer mensaje. Sus respuestas fueron claras y muy humanas.'],
  [5, 'Increíble. Me habló de cosas que no le había contado. Volveré a consultarle.'],
  [4, 'Buena lectura, muy detallada. Me hubiera gustado un poco más de tiempo.'],
  [5, 'La videollamada fue muy cálida. Salí con paz y con pasos concretos.'],
  [5, 'Precisa y respetuosa. Me ayudó a tomar una decisión que venía postergando.'],
  [4, 'Me gustó mucho, sobre todo la parte del trabajo. Muy profesional.'],
  [5, 'Gracias por la paciencia y la claridad. Las cartas no mintieron.'],
  [5, 'Una de las mejores lecturas que he tenido. Lo recomiendo a todos.'],
  [4, 'Lectura honesta, sin rodeos. Justo lo que necesitaba escuchar.'],
  [5, 'Respondió todas mis preguntas con mucho detalle. Muy buena experiencia.'],
  [5, 'Me encantó su energía. Me dio mucha tranquilidad.'],
  [3, 'Correcta, aunque esperaba algo más profundo sobre el tema familiar.'],
  [5, 'Excelente, puntual y muy clara en la videollamada.'],
  [5, 'Volví por segunda vez y otra vez me ayudó muchísimo.'],
];

const hash = await bcrypt.hash(PASSWORD, 10);
const daysAgo = (d, h = 18) => new Date(Date.now() - d * 86400_000 - h * 3600_000);

async function upsertUser(role, key, name) {
  const email = `${key}${DOMAIN}`;
  const existing = await one('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    await query('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, existing.id]);
    return existing.id;
  }
  const r = await query('INSERT INTO users (role, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)', [
    role, email, hash, name, daysAgo(200 + Math.floor(Math.random() * 300)),
  ]);
  return r.insertId;
}

// On repart d'une base de démo propre (les vrais comptes ne sont pas touchés).
await purge();

const readerIds = {};
for (const r of READERS) {
  const id = await upsertUser('reader', r.key, r.name);
  readerIds[r.key] = id;
  await query(
    `INSERT INTO reader_profiles (user_id, headline, bio, specialties, languages, years_experience, status, availability)
     VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)`,
    [id, r.headline, r.bio, JSON.stringify(r.specialties), JSON.stringify(r.langs), r.years, JSON.stringify(DEFAULT_AVAILABILITY)],
  );
  const units = [['chat', 1], ['chat', 3], ['chat', 5], ['video', 30], ['video', 60]];
  await query('INSERT INTO reader_offers (reader_id, type, units, price_cents) VALUES ?', [
    units.map(([type, u], i) => [id, type, u, r.prices[i]]),
  ]);
}

const clientIds = {};
for (const [key, name] of CLIENTS) clientIds[key] = await upsertUser('client', key, name);
const reviewers = Object.entries(clientIds).filter(([k]) => k !== 'cliente').map(([, id]) => id);

async function offer(readerKey, type, units) {
  return one('SELECT * FROM reader_offers WHERE reader_id = ? AND type = ? AND units = ?', [readerIds[readerKey], type, units]);
}

async function consultation({ client, reader, type, units, status, created, scheduled, started, ended, questionsUsed = 0, topic = 'general', question = null, cards = null, notes = null }) {
  const o = await offer(reader, type, units);
  const r = await query(
    `INSERT INTO consultations (client_id, reader_id, offer_id, type, units, price_cents, currency, status, topic, intake_question,
       scheduled_at, started_at, ended_at, questions_used, payment_provider, payment_ref, reading_cards, reader_notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PEN', ?, ?, ?, ?, ?, ?, ?, 'stripe', ?, ?, ?, ?)`,
    [client, readerIds[reader], o.id, type, units, o.price_cents, status, topic, question, scheduled, started, ended,
      questionsUsed, `demo_${Math.random().toString(36).slice(2)}`, cards && JSON.stringify(cards), notes, created],
  );
  return r.insertId;
}

// Historique terminé + avis pour chaque voyante (nombre variable pour des profils différents).
const reviewCount = { valeria: 9, diego: 6, sofia: 5, mateo: 7, isabella: 4, camila: 2, lucia: 8, andres: 3 };
let ri = 0;
for (const [key, n] of Object.entries(reviewCount)) {
  for (let i = 0; i < n + 3; i++) {
    const client = reviewers[(i + key.length) % reviewers.length];
    const video = i % 3 === 0;
    const created = daysAgo(3 + i * 5 + key.length);
    const id = await consultation({
      client, reader: key, type: video ? 'video' : 'chat', units: video ? 30 : 3, status: 'completed',
      created, started: created, ended: new Date(created.getTime() + 40 * 60_000), questionsUsed: video ? 0 : 3,
    });
    if (i < n) {
      const [rating, comment] = REVIEWS[ri++ % REVIEWS.length];
      await query('INSERT INTO reviews (consultation_id, client_id, reader_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        id, client, readerIds[key], rating, comment, new Date(created.getTime() + 3600_000),
      ]);
    }
  }
}

// Parcours du compte cliente@demo.lunara.app
const me = clientIds.cliente;

// 1. Chat en cours avec Valeria (2 questions sur 3)
const chatId = await consultation({
  client: me, reader: 'valeria', type: 'chat', units: 3, status: 'active', topic: 'amor',
  created: daysAgo(0, 2), started: daysAgo(0, 1), questionsUsed: 2,
  question: '¿Qué energía rodea mi relación actual? Siento que algo cambió en los últimos meses.',
});
const chat = [
  [me, '¿Qué energía rodea mi relación actual? Siento que algo cambió en los últimos meses.', 1],
  [readerIds.valeria, 'Hola 🌙 Gracias por tu confianza. Saqué tres cartas para tu pregunta: Los Enamorados, La Luna y La Estrella.', 0],
  [readerIds.valeria, 'Los Enamorados muestra que el vínculo sigue vivo, pero hay una elección pendiente entre ustedes. La Luna habla de dudas y cosas no dichas: es normal sentir esa distancia. La Estrella al final es muy esperanzadora: si hablan con honestidad, la relación se renueva.', 0],
  [me, 'Gracias 💜 ¿Y crees que debería ser yo quien dé el primer paso para esa conversación?', 1],
  [readerIds.valeria, 'Déjame mirar una carta más para eso…', 0],
];
for (const [i, [sender, body, q]] of chat.entries()) {
  await query('INSERT INTO messages (consultation_id, sender_id, body, is_question, created_at) VALUES (?, ?, ?, ?, ?)', [
    chatId, sender, body, q, new Date(Date.now() - (90 - i * 15) * 60_000),
  ]);
}
await query('UPDATE consultations SET reading_cards = ?, reader_notes = ? WHERE id = ?', [
  JSON.stringify([{ id: 6, reversed: false }, { id: 18, reversed: false }, { id: 17, reversed: false }]),
  'Tu relación está en un momento de elección. Habla desde el corazón y sin miedo: La Estrella anuncia renovación.',
  chatId,
]);

// 2. Visio réservée demain avec Diego (créneau de 30 min)
const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
tomorrow.setUTCHours(21, 0, 0, 0); // 16h00 à Lima
await consultation({
  client: me, reader: 'diego', type: 'video', units: 30, status: 'paid', topic: 'trabajo', created: daysAgo(1),
  scheduled: tomorrow, question: 'Tengo una oferta de trabajo en otra ciudad y no sé si aceptarla.',
});

// 3. Consultation terminée avec Lucía : tirada enregistrée, prête pour « Profundizar con IA »
const doneId = await consultation({
  client: me, reader: 'lucia', type: 'chat', units: 5, status: 'completed', topic: 'trabajo', created: daysAgo(6),
  started: daysAgo(6), ended: daysAgo(5), questionsUsed: 5, question: '¿Es buen momento para emprender mi propio negocio?',
  cards: [{ id: 1, reversed: false }, { id: 10, reversed: false }, { id: 19, reversed: false }],
  notes: 'El Mago te da las herramientas, La Rueda de la Fortuna marca un ciclo favorable y El Sol confirma el éxito si actúas con claridad. Empieza pequeño y con un plan de 3 meses.',
});
await query('INSERT INTO messages (consultation_id, sender_id, body, is_question, created_at) VALUES (?, ?, ?, 1, ?), (?, ?, ?, 0, ?)', [
  doneId, me, '¿Es buen momento para emprender mi propio negocio?', daysAgo(6),
  doneId, readerIds.lucia, '¡Hola! Las cartas son muy favorables para ti. Te dejé la tirada completa con mis consejos. 🌞', daysAgo(6, 17),
]);

// Agrégats : note moyenne, nombre d'avis et de consultations terminées
await query(`
  UPDATE reader_profiles p
  LEFT JOIN (SELECT reader_id, AVG(rating) a, COUNT(*) n FROM reviews GROUP BY reader_id) r ON r.reader_id = p.user_id
  LEFT JOIN (SELECT reader_id, COUNT(*) n FROM consultations WHERE status = 'completed' GROUP BY reader_id) c ON c.reader_id = p.user_id
  SET p.rating_avg = COALESCE(r.a, 0), p.rating_count = COALESCE(r.n, 0), p.consultations_count = COALESCE(c.n, 0)
  WHERE p.user_id IN (?)`, [Object.values(readerIds)]);

const summary = await query(
  `SELECT u.name, p.rating_avg, p.rating_count, p.consultations_count FROM users u JOIN reader_profiles p ON p.user_id = u.id WHERE u.email LIKE ? ORDER BY p.rating_count DESC`,
  [`%${DOMAIN}`],
);
console.table(summary);
console.log(`Démo prête. Connexion : cliente${DOMAIN} / ${PASSWORD} (voyantes : valeria${DOMAIN}, diego${DOMAIN}…)`);
await pool.end();
