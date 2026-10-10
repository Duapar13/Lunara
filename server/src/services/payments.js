import Stripe from 'stripe';
import { config } from '../config.js';
import { HttpError } from '../http.js';

let stripeClient;
export function stripe() {
  if (!config.stripe.secretKey) throw new HttpError(503, 'El pago con tarjeta no está disponible');
  stripeClient ??= new Stripe(config.stripe.secretKey);
  return stripeClient;
}

/** Rembourse intégralement le paiement Stripe d'une consultation. */
export async function refundConsultation(consultation) {
  if (consultation.payment_provider !== 'stripe' || !consultation.payment_ref) return;
  await stripe().refunds.create({ payment_intent: consultation.payment_ref });
}
