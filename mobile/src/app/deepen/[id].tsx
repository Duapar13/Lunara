import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { formatRelative } from '@/lib/format';
import { SPREAD_POSITIONS } from '@/lib/tarot';
import type { AiReading, Consultation } from '@/lib/types';
import { TarotCard } from '@/components/TarotCard';
import { Button, Card, ErrorText, Input, Loading } from '@/components/ui';
import { colors, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

/** Le client approfondit la tirada de sa voyante avec l'IA (Claude, côté serveur). */
export default function Deepen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useFetch<{ consultation: Consultation }>(`/consultations/${id}`);
  const history = useFetch<{ readings: AiReading[] }>(`/ai/history?consultationId=${id}`);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const c = detail.data?.consultation;
  if (!c) return detail.error ? <ErrorText message={detail.error} /> : <Loading />;
  const readings = history.data?.readings ?? [];

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ id: number; text: string }>('/ai/deepen', {
        method: 'POST',
        body: { consultationId: Number(id), question: question.trim() },
      });
      history.setData({
        readings: [
          {
            id: res.id,
            consultationId: Number(id),
            kind: 'deepen',
            cards: c!.readingCards ?? [],
            question: question.trim(),
            text: res.text,
            createdAt: new Date().toISOString(),
          },
          ...readings,
        ],
      });
      setQuestion('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <CosmicScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.md }}>
          <Text style={styles.label}>TU TIRADA CON {c.reader.name.split(' ')[0].toUpperCase()}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {(c.readingCards ?? []).map((card, i) => (
              <TarotCard key={card.id} card={card} faceUp width={70} label={SPREAD_POSITIONS[i] ?? `Carta ${i + 1}`} />
            ))}
          </ScrollView>
          {!!c.readerNotes && <Text style={type.bodyMuted}>{c.readerNotes}</Text>}
        </Card>

        <Input
          label="¿Qué quieres entender mejor?"
          value={question}
          onChangeText={setQuestion}
          multiline
          maxLength={500}
          placeholder="Ej. ¿Qué me aconseja la carta del futuro sobre mi trabajo?"
        />
        <ErrorText message={error} />
        <Button
          title="Profundizar con IA"
          icon="sparkles-outline"
          onPress={ask}
          loading={loading}
          disabled={question.trim().length < 3}
        />
        {loading && <Text style={[type.small, { textAlign: 'center' }]}>Las cartas están hablando…</Text>}

        {readings.map((r) => (
          <Card key={r.id} style={{ gap: space.sm }}>
            <View style={styles.qRow}>
              <Text style={[type.h3, { flex: 1 }]}>{r.question}</Text>
              <Text style={type.small}>{formatRelative(r.createdAt)}</Text>
            </View>
            <Text style={type.body}>{r.text}</Text>
          </Card>
        ))}

        <Text style={type.small}>
          Interpretación generada por IA para complementar la lectura de tu experto. Es una guía de reflexión y no
          reemplaza el consejo profesional.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  label: { ...type.label, color: colors.gold },
  qRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
