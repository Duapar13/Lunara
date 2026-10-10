// Phase de la lune calculée localement (cycle synodique moyen), sans service externe.
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // nouvelle lune de référence

export type MoonInfo = {
  phase: number; // 0 = nouvelle lune, 0.5 = pleine lune
  illumination: number; // 0 → 1
  name: string;
  energy: string;
  ageDays: number;
};

const PHASES = [
  { until: 0.03, name: 'Luna nueva', energy: 'Siembra intenciones: es tiempo de nuevos comienzos.' },
  { until: 0.22, name: 'Luna creciente', energy: 'Tus proyectos toman impulso. Da el primer paso.' },
  { until: 0.28, name: 'Cuarto creciente', energy: 'Momento de decidir y actuar con valentía.' },
  { until: 0.47, name: 'Gibosa creciente', energy: 'Afina tus planes y confía en el proceso.' },
  { until: 0.53, name: 'Luna llena', energy: 'Claridad y revelaciones: lo oculto sale a la luz.' },
  { until: 0.72, name: 'Gibosa menguante', energy: 'Agradece lo vivido y comparte lo aprendido.' },
  { until: 0.78, name: 'Cuarto menguante', energy: 'Suelta lo que ya no te sirve.' },
  { until: 0.97, name: 'Luna menguante', energy: 'Descansa, reflexiona y prepara un nuevo ciclo.' },
  { until: 1.01, name: 'Luna nueva', energy: 'Siembra intenciones: es tiempo de nuevos comienzos.' },
];

export function moonInfo(date = new Date()): MoonInfo {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400_000;
  const phase = (((days / SYNODIC_DAYS) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const p = PHASES.find((x) => phase < x.until) ?? PHASES[0];
  return { phase, illumination, name: p.name, energy: p.energy, ageDays: phase * SYNODIC_DAYS };
}
