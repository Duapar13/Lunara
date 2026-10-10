import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from '../http.js';
import { describeCards } from '../tarot.js';

// Créé à la première demande pour que le serveur démarre même sans clé configurée.
let client;

const SYSTEM = `Eres la guía de interpretación de Lunara, una app peruana de tarot y guía espiritual.
Escribes en español natural de Perú, con un tono cálido, sereno y respetuoso; tuteas a la persona.

Cómo interpretar:
- Relaciona cada carta con su posición (Pasado, Presente, Futuro) y con la pregunta de la persona.
- Si una carta está invertida, matiza su sentido sin volverlo catastrófico.
- Ofrece reflexiones y caminos posibles, nunca certezas ni predicciones fatalistas.
- Si la persona menciona salud, dinero en riesgo, temas legales o una crisis emocional, recuérdale con delicadeza que el tarot es una herramienta de reflexión y que un profesional (médico, abogado, psicólogo) es quien puede ayudarla en eso.
- No inventes datos sobre la persona ni sobre el experto que la atendió.

Formato: texto plano para móvil, sin markdown ni títulos con #. Párrafos cortos.
Termina con una frase breve que invite a la persona a reflexionar o a profundizar con un experto de Lunara.`;

// Langue de la réponse : l'espagnol du Pérou par défaut, le français pour le mode de test en français.
const LANG_INSTRUCTION = {
  es: '',
  fr: '\n\nIMPORTANTE: responde en francés (de Francia), con el mismo tono cálido; tutea a la persona.',
};

async function ask(userText, maxWords, lang = 'es') {
  let response;
  try {
    client ??= new Anthropic();
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM,
      messages: [{ role: 'user', content: `${userText}\n\nResponde en ${maxWords} palabras como máximo.${LANG_INSTRUCTION[lang] ?? ''}` }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, 'Mucha demanda en este momento, inténtalo en unos minutos');
    }
    // Erreur API ou clé absente (le SDK lève alors une Error simple) : l'app reçoit une 503 lisible.
    console.error('Claude API', err.status ?? '', err.message);
    throw new HttpError(503, 'La interpretación no está disponible ahora');
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'No podemos interpretar esta consulta. Reformula tu pregunta, por favor.');
  }
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new HttpError(502, 'La interpretación no está disponible ahora');
  return text;
}

/** Tirage du jour à 3 cartes fait par l'utilisateur lui-même. */
export function interpretDaily({ cards, question, topic, lang }) {
  return ask(
    `Tirada del día de 3 cartas.
Tema: ${topic || 'general'}
Pregunta de la persona: ${question || '(sin pregunta concreta, lectura general del día)'}

Cartas:
${describeCards(cards)}`,
    250,
    lang,
  );
}

/** Approfondissement d'une lecture faite par un expert pendant une consultation. */
export function interpretDeepen({ cards, readerNotes, intakeQuestion, question, lang }) {
  return ask(
    `Un experto de Lunara hizo esta lectura a la persona durante su consulta.
Pregunta inicial de la consulta: ${intakeQuestion || '(no indicada)'}

Cartas que sacó el experto:
${describeCards(cards)}

Notas del experto para la persona:
${readerNotes || '(sin notas)'}

Ahora la persona quiere profundizar con esta pregunta: ${question}

Explica con más detalle lo que las cartas aportan a esa pregunta, respetando y complementando la lectura del experto, sin contradecirla.`,
    350,
    lang,
  );
}
