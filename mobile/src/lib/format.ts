import type { Consultation, ConsultationStatus, Offer, OfferType } from './types';

export function formatPrice(cents: number) {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export function offerLabel(o: { type: OfferType; units: number }) {
  if (o.type === 'chat') return `${o.units} ${o.units === 1 ? 'pregunta' : 'preguntas'}`;
  return o.units === 60 ? '1 hora' : `${o.units} min`;
}

export function offerTitle(o: { type: OfferType; units: number }) {
  return `${o.type === 'chat' ? 'Chat' : 'Videollamada'} · ${offerLabel(o)}`;
}

export function sortOffers(offers: Offer[]) {
  return [...offers].sort((a, b) => (a.type === b.type ? a.units - b.units : a.type === 'chat' ? -1 : 1));
}

export const TOPICS = [
  { key: 'amor', label: 'Amor' },
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'dinero', label: 'Dinero' },
  { key: 'familia', label: 'Familia' },
  { key: 'energia', label: 'Energía' },
  { key: 'general', label: 'General' },
] as const;

export type TopicKey = (typeof TOPICS)[number]['key'];

export const SPECIALTIES = ['Tarot', 'Amor', 'Trabajo', 'Dinero', 'Familia', 'Energía', 'Astrología', 'Oráculo', 'Numerología', 'Runas'];

export const LANGUAGES = ['Español', 'Quechua', 'Inglés', 'Portugués'];

export function topicLabel(key: string | null) {
  return TOPICS.find((t) => t.key === key)?.label ?? 'General';
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(isoDate: string) {
  // isoDate = "YYYY-MM-DD" (jour à Lima) : on l'affiche sans conversion de fuseau.
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
    day: String(d),
    month: date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
  };
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days < 1) return 'Hoy';
  if (days < 2) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  return new Date(iso).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
}

export const STATUS_LABEL: Record<ConsultationStatus, string> = {
  pending_payment: 'Pago pendiente',
  paid: 'Confirmada',
  active: 'En curso',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

export function firstName(name: string) {
  return name.split(' ')[0];
}

/** La visio s'ouvre 10 min avant l'heure réservée (ou tout de suite si « Ahora »). */
export function videoOpensAt(c: Consultation) {
  return c.scheduledAt ? new Date(c.scheduledAt).getTime() - 10 * 60_000 : 0;
}
