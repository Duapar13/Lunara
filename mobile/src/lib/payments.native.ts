import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { api } from './api';
import type { Consultation } from './types';

export type PaymentResult = { status: 'paid' | 'cancelled' | 'pending'; consultation?: Consultation };

export const CARD_PAYMENTS_AVAILABLE = true;

/** Carte internationale, Apple Pay ou Google Pay via la PaymentSheet Stripe. */
async function payWithStripe(consultationId: number): Promise<PaymentResult> {
  const { clientSecret, publishableKey } = await api<{ clientSecret: string; publishableKey: string }>(
    '/payments/stripe/intent',
    { method: 'POST', body: { consultationId } },
  );
  await initStripe({
    publishableKey: publishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    merchantIdentifier: 'merchant.app.lunara',
    // Dans Expo Go, les retours 3-D Secure passent par l'URL exp:// de l'app.
    urlScheme: Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL(''),
  });
  const init = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Lunara',
    returnURL: Linking.createURL('stripe-redirect'),
    applePay: { merchantCountryCode: 'PE' },
    googlePay: { merchantCountryCode: 'PE', currencyCode: 'PEN', testEnv: __DEV__ },
    appearance: {
      colors: {
        primary: '#6D5BFF',
        background: '#120E22',
        componentBackground: '#1A1330',
        componentBorder: '#2E2550',
        componentDivider: '#2E2550',
        primaryText: '#F5E7D6',
        secondaryText: '#BDB2A6',
        componentText: '#F5E7D6',
        placeholderText: '#8A8095',
        icon: '#A78BFA',
      },
    },
  });
  if (init.error) throw new Error(init.error.message);

  const presented = await presentPaymentSheet();
  if (presented.error) {
    if (presented.error.code === 'Canceled') return { status: 'cancelled' };
    throw new Error(presented.error.message);
  }
  const { consultation } = await api<{ consultation: Consultation }>('/payments/stripe/confirm', {
    method: 'POST',
    body: { consultationId },
  });
  // Le webhook peut aussi valider le paiement : on considère « payé » dès que Stripe a accepté.
  return { status: consultation.status === 'pending_payment' ? 'pending' : 'paid', consultation };
}

/** Carte (Visa, Mastercard, Amex — péruviennes ou étrangères), Apple Pay ou Google Pay. */
export function pay(consultationId: number) {
  return payWithStripe(consultationId);
}
