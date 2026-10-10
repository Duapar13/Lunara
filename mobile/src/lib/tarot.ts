import type { DrawnCard } from './types';

// Arcanos mayores. Même liste que server/src/tarot.js (garder les deux synchronisées).
export const MAJOR_ARCANA = [
  { id: 0, numeral: '0', name: 'El Loco' },
  { id: 1, numeral: 'I', name: 'El Mago' },
  { id: 2, numeral: 'II', name: 'La Sacerdotisa' },
  { id: 3, numeral: 'III', name: 'La Emperatriz' },
  { id: 4, numeral: 'IV', name: 'El Emperador' },
  { id: 5, numeral: 'V', name: 'El Hierofante' },
  { id: 6, numeral: 'VI', name: 'Los Enamorados' },
  { id: 7, numeral: 'VII', name: 'El Carro' },
  { id: 8, numeral: 'VIII', name: 'La Fuerza' },
  { id: 9, numeral: 'IX', name: 'El Ermitaño' },
  { id: 10, numeral: 'X', name: 'La Rueda de la Fortuna' },
  { id: 11, numeral: 'XI', name: 'La Justicia' },
  { id: 12, numeral: 'XII', name: 'El Colgado' },
  { id: 13, numeral: 'XIII', name: 'La Muerte' },
  { id: 14, numeral: 'XIV', name: 'La Templanza' },
  { id: 15, numeral: 'XV', name: 'El Diablo' },
  { id: 16, numeral: 'XVI', name: 'La Torre' },
  { id: 17, numeral: 'XVII', name: 'La Estrella' },
  { id: 18, numeral: 'XVIII', name: 'La Luna' },
  { id: 19, numeral: 'XIX', name: 'El Sol' },
  { id: 20, numeral: 'XX', name: 'El Juicio' },
  { id: 21, numeral: 'XXI', name: 'El Mundo' },
];

export const SPREAD_POSITIONS = ['Pasado', 'Presente', 'Futuro'];

/** Mélange Fisher-Yates ; chaque carte a 1 chance sur 4 d'être invertida. */
export function shuffleDeck(): DrawnCard[] {
  const deck = MAJOR_ARCANA.map((c) => ({ id: c.id, reversed: Math.random() < 0.25 }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Symbole de chaque arcane (Ionicons), dans l'ordre de MAJOR_ARCANA. */
export const ARCANA_ICONS = [
  'walk', 'color-wand', 'book', 'flower', 'shield', 'key', 'heart', 'navigate', 'flame', 'bulb', 'sync',
  'scale', 'hourglass', 'leaf', 'water', 'link', 'thunderstorm', 'star', 'moon', 'sunny', 'megaphone', 'planet',
] as const;
