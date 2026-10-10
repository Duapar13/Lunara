import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFound } from './http.js';
import { initRealtime } from './realtime.js';
import { loadForUser, sendMessage, sweep } from './services/consultations.js';
import { router as authRouter } from './routes/auth.js';
import { router as readersRouter } from './routes/readers.js';
import { router as consultationsRouter } from './routes/consultations.js';
import { router as paymentsRouter, stripeWebhook } from './routes/payments.js';
import { router as aiRouter } from './routes/ai.js';
import { router as meRouter, UPLOAD_DIR } from './routes/me.js';
import { router as readerRouter } from './routes/reader.js';
import { router as adminRouter } from './routes/admin.js';

const app = express();
app.set('trust proxy', 1); // derrière Nginx
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));

// Stripe vérifie la signature sur le corps brut : à monter avant express.json().
app.post('/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(fileURLToPath(UPLOAD_DIR), { maxAge: '30d' }));
// Page de visio maison (WebRTC), ouverte dans la WebView de l'app.
// Elle peut aussi être intégrée en iframe par la version web de l'app : seule cette page lève
// l'interdiction d'intégration (l'accès reste protégé par le jeton d'appel).
app.use(
  '/call',
  (_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
        "connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors *",
    );
    next();
  },
  // Pas de cache : chaque appel charge la dernière version de la page.
  express.static(fileURLToPath(new URL('../public/call/', import.meta.url)), { maxAge: 0, etag: true }),
);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/config', (_req, res) => res.json({ testMode: config.testMode }));
app.use('/auth', authRouter);
app.use('/readers', readersRouter);
app.use('/consultations', consultationsRouter);
app.use('/payments', paymentsRouter);
app.use('/ai', aiRouter);
app.use('/me', meRouter);
app.use('/reader', readerRouter);
app.use('/admin', adminRouter);

app.use((_req, _res, next) => next(notFound('Ruta no encontrada')));
app.use(errorHandler);

const server = http.createServer(app);
initRealtime(server, { loadForUser, sendMessage });

setInterval(() => sweep().catch((err) => console.error('sweep', err)), 5 * 60_000);

server.listen(config.port, config.host, () => {
  console.log(`Lunara API sur ${config.host}:${config.port}${config.testMode ? ' (MODE TEST)' : ''}`);
});
