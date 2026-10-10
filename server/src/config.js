import 'dotenv/config';

const env = process.env;

function required(name) {
  const value = env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const config = {
  port: Number(env.PORT || 4000),
  // 127.0.0.1 en production derrière nginx ; 0.0.0.0 en local pour que le téléphone y accède.
  host: env.HOST || '0.0.0.0',
  publicUrl: (env.PUBLIC_URL || `http://localhost:${env.PORT || 4000}`).replace(/\/$/, ''),
  jwtSecret: required('JWT_SECRET'),
  corsOrigins: (env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  commission: Number(env.PLATFORM_COMMISSION || 0.3),
  // Mode test : visio « Ahora » sans voyante en ligne et accès immédiat à la salle. À désactiver en production.
  testMode: env.TEST_MODE === '1',
  currency: 'PEN',

  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'lunara',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'lunara',
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY || '',
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
  },

  daily: {
    apiKey: env.DAILY_API_KEY || '',
    domain: env.DAILY_DOMAIN || '',
  },

  ai: {
    dailyLimit: Number(env.AI_DAILY_LIMIT || 5),
  },
};
