// Arcanos mayores. Même liste que mobile/src/lib/tarot.ts (garder les deux synchronisées).
export const MAJOR_ARCANA = [
  { id: 0, name: 'El Loco', keywords: 'nuevos comienzos, espontaneidad, salto de fe' },
  { id: 1, name: 'El Mago', keywords: 'voluntad, habilidad, manifestación' },
  { id: 2, name: 'La Sacerdotisa', keywords: 'intuición, misterio, sabiduría interior' },
  { id: 3, name: 'La Emperatriz', keywords: 'abundancia, creatividad, cuidado' },
  { id: 4, name: 'El Emperador', keywords: 'estructura, autoridad, estabilidad' },
  { id: 5, name: 'El Hierofante', keywords: 'tradición, guía, aprendizaje' },
  { id: 6, name: 'Los Enamorados', keywords: 'amor, elección, armonía' },
  { id: 7, name: 'El Carro', keywords: 'determinación, avance, control' },
  { id: 8, name: 'La Fuerza', keywords: 'coraje, paciencia, compasión' },
  { id: 9, name: 'El Ermitaño', keywords: 'introspección, búsqueda, soledad elegida' },
  { id: 10, name: 'La Rueda de la Fortuna', keywords: 'ciclos, cambio, destino' },
  { id: 11, name: 'La Justicia', keywords: 'equilibrio, verdad, consecuencias' },
  { id: 12, name: 'El Colgado', keywords: 'pausa, nueva perspectiva, entrega' },
  { id: 13, name: 'La Muerte', keywords: 'transformación, cierre, renacer' },
  { id: 14, name: 'La Templanza', keywords: 'moderación, sanación, paciencia' },
  { id: 15, name: 'El Diablo', keywords: 'apegos, tentación, liberación posible' },
  { id: 16, name: 'La Torre', keywords: 'ruptura, revelación, cambio repentino' },
  { id: 17, name: 'La Estrella', keywords: 'esperanza, inspiración, renovación' },
  { id: 18, name: 'La Luna', keywords: 'intuición, sueños, incertidumbre' },
  { id: 19, name: 'El Sol', keywords: 'alegría, éxito, vitalidad' },
  { id: 20, name: 'El Juicio', keywords: 'despertar, llamado, renovación' },
  { id: 21, name: 'El Mundo', keywords: 'realización, plenitud, cierre de ciclo' },
];

export const SPREAD_POSITIONS = ['Pasado', 'Presente', 'Futuro'];

export function describeCards(cards) {
  return cards
    .map((c, i) => {
      const card = MAJOR_ARCANA[c.id];
      const pos = SPREAD_POSITIONS[i] ?? `Carta ${i + 1}`;
      const orientation = c.reversed ? ' (invertida)' : '';
      return `- ${pos}: ${card.name}${orientation} — ${card.keywords}`;
    })
    .join('\n');
}
