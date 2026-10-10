import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { api, errorMessage } from '@/lib/api';
import { shuffleDeck, SPREAD_POSITIONS } from '@/lib/tarot';
import { TOPICS, type TopicKey } from '@/lib/format';
import type { DrawnCard } from '@/lib/types';
import { TarotCard } from '@/components/TarotCard';
import { CosmicScreen, GlassCard, GradientText } from '@/components/Cosmic';
import { Button, Chip, ChipRow, ErrorText, Input } from '@/components/ui';
import { colors, fonts, space, type } from '@/theme';

type Step = 'intro' | 'pick' | 'reading';

export default function DailyTarot() {
  const [step, setStep] = useState<Step>('intro');
  const [topic, setTopic] = useState<TopicKey>('general');
  const [question, setQuestion] = useState('');
  const [deck, setDeck] = useState<DrawnCard[]>(() => shuffleDeck());
  const [picked, setPicked] = useState<DrawnCard[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickedIds = useMemo(() => new Set(picked.map((c) => c.id)), [picked]);

  function pick(card: DrawnCard) {
    if (pickedIds.has(card.id) || picked.length >= 3) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked([...picked, card]);
  }

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ text: string }>('/ai/daily', {
        method: 'POST',
        body: { cards: picked, question: question.trim() || undefined, topic },
      });
      setText(res.text);
      setStep('reading');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setDeck(shuffleDeck());
    setPicked([]);
    setText(null);
    setQuestion('');
    setError(null);
    setStep('intro');
  }

  return (
    <CosmicScreen intensity={1.3}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text style={styles.label}>✦ TIRADA DEL DÍA ✦</Text>
            <GradientText style={styles.title}>Lectura de Tarot</GradientText>
            <Text style={[type.bodyMuted, { textAlign: 'center' }]}>
              {step === 'intro'
                ? 'Respira, concéntrate en lo que quieres comprender hoy.'
                : step === 'pick'
                  ? `Deja que tu intuición elija · ${picked.length}/3`
                  : 'Tu pasado, tu presente y tu futuro.'}
            </Text>
          </View>

          <View style={styles.spread}>
            {SPREAD_POSITIONS.map((pos, i) => (
              <TarotCard key={pos} card={picked[i]} faceUp={!!picked[i]} animated width={100} label={pos} />
            ))}
          </View>

          {step === 'intro' && (
            <Animated.View entering={FadeInDown.duration(500)} style={{ gap: space.lg }}>
              <View style={{ marginHorizontal: -space.xl }}>
                <ChipRow>
                  {TOPICS.map((t) => (
                    <Chip key={t.key} label={t.label} selected={topic === t.key} onPress={() => setTopic(t.key)} />
                  ))}
                </ChipRow>
              </View>
              <Input
                label="Tu pregunta (opcional)"
                value={question}
                onChangeText={setQuestion}
                placeholder="Ej. ¿Qué energía me acompaña esta semana?"
                maxLength={500}
                multiline
              />
              <Button title="Barajar las cartas" icon="sparkles" variant="gold" onPress={() => setStep('pick')} />
            </Animated.View>
          )}

          {step === 'pick' && (
            <Animated.View entering={FadeIn.duration(600)} style={{ gap: space.lg }}>
              <View style={styles.deck}>
                {deck.map((card, i) => (
                  <View key={card.id} style={{ transform: [{ rotate: `${((i % 7) - 3) * 2.5}deg` }] }}>
                    <TarotCard card={card} width={54} selected={pickedIds.has(card.id)} onPress={() => pick(card)} />
                  </View>
                ))}
              </View>
              <ErrorText message={error} />
              <Button title="Revelar mi lectura" icon="eye" onPress={reveal} loading={loading} disabled={picked.length < 3} />
              {loading && <Text style={[type.small, { textAlign: 'center' }]}>Las cartas están hablando…</Text>}
            </Animated.View>
          )}

          {step === 'reading' && text && (
            <View style={{ gap: space.lg }}>
              <GlassCard glow contentStyle={{ gap: 14, padding: 20 }}>
                {text
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((p, i) => (
                    <Animated.Text key={i} entering={FadeInDown.delay(250 * i).duration(700)} style={styles.paragraph}>
                      {p}
                    </Animated.Text>
                  ))}
              </GlassCard>
              <Text style={[type.small, { textAlign: 'center' }]}>
                Interpretación generada por IA como guía de reflexión.
              </Text>
              <Button title="Profundizar con un experto" variant="gold" iconRight="arrow-forward" onPress={() => router.push('/(client)/explore')} />
              <Button title="Nueva tirada" variant="secondary" icon="refresh" onPress={restart} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl * 1.5 },
  label: { ...type.label, color: colors.gold, letterSpacing: 3 },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  deck: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingTop: 8 },
  paragraph: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 24, color: colors.cream },
});
