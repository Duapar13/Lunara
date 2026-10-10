import { locale, t } from './i18n';
import type { Consultation, ConsultationStatus, Offer, OfferType } from './types';

export function formatPrice(cents: number) {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export function offerLabel(o: { type: OfferType; units: number }) {
  if (o.type === 'chat') return o.units === 1 ? t('1 pregunta') : t('{n} preguntas', { n: o.units });
  return o.units === 60 ? t('1 hora') : t('{n} min', { n: o.units });
}

export function offerTitle(o: { type: OfferType; units: number }) {
  return `${o.type === 'chat' ? t('Chat') : t('Videollamada')} · ${offerLabel(o)}`;
}

export function sortOffers(offers: Offer[]) {
  return [...offers].sort((a, b) => (a.type === b.type ? a.units - b.units : a.type === 'chat' ? -1 : 1));
}

// Les libellés sont traduits à l'affichage avec t(label).
export const TOPICS = [
  { key: 'amor', label: 'Amor' },
  { key: 'trabajo', label: 'Trabajo' },
  { key: 'dinero', label: 'Dinero' },
  { key: 'familia', label: 'Familia' },
  { key: 'energia', label: 'Energía' },
  { key: 'general', label: 'General' },
] as const;

export type TopicKey = (typeof TOPICS)[number]['key'];

// Valeurs stockées en base (en espagnol) ; affichées avec t(valeur).
export const SPECIALTIES = ['Tarot', 'Amor', 'Trabajo', 'Dinero', 'Familia', 'Energía', 'Astrología', 'Oráculo', 'Numerología', 'Runas'];

export const LANGUAGES = ['Español', 'Quechua', 'Inglés', 'Portugués'];

export function topicLabel(key: string | null) {
  return t(TOPICS.find((x) => x.key === key)?.label ?? 'General');
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(isoDate: string) {
  // isoDate = "YYYY-MM-DD" (jour à Lima) : on l'affiche sans conversion de fuseau.
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString(locale(), { weekday: 'short' }).replace('.', ''),
    day: String(d),
    month: date.toLocaleDateString(locale(), { month: 'short' }).replace('.', ''),
  };
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days < 1) return t('Hoy');
  if (days < 2) return t('Ayer');
  if (days < 30) return t('Hace {n} días', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? t('Hace 1 mes') : t('Hace {n} meses', { n: months });
  return new Date(iso).toLocaleDateString(locale(), { month: 'short', year: 'numeric' });
}

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  pending_payment: 'Pago pendiente',
  paid: 'Confirmada',
  active: 'En curso',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

export const statusLabel = (s: ConsultationStatus) => t(STATUS_LABEL[s]);

export function firstName(name: string) {
  return name.split(' ')[0];
}

/** La visio s'ouvre 10 min avant l'heure réservée (ou tout de suite si « Ahora » ou en mode test). */
export function videoOpensAt(c: Consultation, testMode = false) {
  return c.scheduledAt && !testMode ? new Date(c.scheduledAt).getTime() - 10 * 60_000 : 0;
}
