import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { parse, badRequest, forbidden } from '../http.js';
import { requireAuth } from '../middleware/auth.js';
import * as consultations from '../services/consultations.js';
import { stripe } from '../services/payments.js';

export const router = Router();

const bodySchema = z.object({ consultationId: z.number().int().positive() });

async function loadPayable(req) {
  const { consultationId } = parse(bodySchema, req.body);
  const c = await consultations.load(consultationId);
  if (c.client_id !== req.user.id) throw forbidden();
  if (c.status !== 'pending_payment') throw badRequest('Esta consulta ya fue pagada o cancelada');
  return c;
}

function label(c) {
  return c.type === 'chat'
    ? `Chat · ${c.units} ${c.units === 1 ? 'pregunta' : 'preguntas'} con ${c.reader_name}`
    : `Videollamada · ${c.units} min con ${c.reader_name}`;
}

// ---------- Stripe (cartes internationales, Apple Pay, Google Pay) ----------

router.post('/stripe/intent', requireAuth('client'), async (req, res) => {
  const c = await loadPayable(req);
  let intent;
  if (c.payment_provider === 'stripe' && c.payment_ref) {
    intent = await stripe().paymentIntents.retrieve(c.payment_ref);
    if (intent.status === 'canceled') intent = null;
  }
  // Réutilise le PaymentIntent existant si le client rouvre la PaymentSheet.
  intent ??= await stripe().paymentIntents.create({
    amount: c.price_cents,
    currency: 'pen',
    automatic_payment_methods: { enabled: true },
    description: label(c),
    metadata: { consultationId: String(c.id) },
  });
  await query("UPDATE consultations SET payment_provider = 'stripe', payment_ref = ? WHERE id = ?", [intent.id, c.id]);
  res.json({ clientSecret: intent.client_secret, publishableKey: config.stripe.publishableKey });
});

/** Appelé par l'app après la PaymentSheet : ne fait pas confiance au client, relit le PaymentIntent. */
router.post('/stripe/confirm', requireAuth('client'), async (req, res) => {
  const { consultationId } = parse(bodySchema, req.body);
  const c = await consultations.load(consultationId);
  if (c.client_id !== req.user.id) throw forbidden();
  if (c.payment_provider === 'stripe' && c.payment_ref && c.status === 'pending_payment') {
    const intent = await stripe().paymentIntents.retrieve(c.payment_ref);
    if (intent.status === 'succeeded') {
      await consultations.markPaid(c.id, {
        provider: 'stripe',
        ref: intent.id,
        amountCents: intent.amount_received,
        currency: intent.currency,
      });
    }
  }
  res.json({ consultation: consultations.serialize(await consultations.load(c.id)) });
});

/** Monté avant express.json() dans index.js : Stripe a besoin du corps brut pour vérifier la signature. */
export async function stripeWebhook(req, res) {
  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);
  } catch (err) {
    console.error('Webhook Stripe invalide', err.message);
    return res.status(400).send('invalid signature');
  }
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const id = Number(intent.metadata?.consultationId);
    if (id) {
      await consultations.markPaid(id, {
        provider: 'stripe',
        ref: intent.id,
        amountCents: intent.amount_received,
        currency: intent.currency,
      });
    }
  }
  res.json({ received: true });
}
