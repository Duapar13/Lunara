// Version web : le SDK Stripe React Native n'existe que sur iOS/Android (voir payments.native.ts).
import type { Consultation } from './types';

export type PaymentResult = { status: 'paid' | 'cancelled' | 'pending'; consultation?: Consultation };

export const CARD_PAYMENTS_AVAILABLE = false;

export async function pay(_consultationId: number): Promise<PaymentResult> {
  throw new Error('El pago está disponible en la app móvil de Lunara.');
}
