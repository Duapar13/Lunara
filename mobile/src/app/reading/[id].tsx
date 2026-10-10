import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { MAJOR_ARCANA, SPREAD_POSITIONS } from '@/lib/tarot';
import type { Consultation, DrawnCard } from '@/lib/types';
import { TarotCard } from '@/components/TarotCard';
import { Button, ErrorText, Input, Loading } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

/** La voyante enregistre les cartes tirées et un message ; le client pourra ensuite approfondir avec l'IA. */
export default function RegisterReading() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [notes, setNotes] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ consultation: Consultation }>(`/consultations/${id}`)
      .then(({ consultation }) => {
        setCards(consultation.readingCards ?? []);
        setNotes(consultation.readerNotes ?? '');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setReady(true));
  }, [id]);

  if (!ready) return <Loading />;

  function toggle(cardId: number) {
    setCards((prev) =>
      prev.some((c) => c.id === cardId)
        ? prev.filter((c) => c.id !== cardId)
        : prev.length >= 10
          ? prev
          : [...prev, { id: cardId, reversed: false }],
    );
  }

  function flip(cardId: number) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, reversed: !c.reversed } : c)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/consultations/${id}/reading`, { method: 'PUT', body: { cards, notes: notes.trim() } });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <CosmicScreen>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={type.bodyMuted}>
        Selecciona las cartas en el orden en que salieron. Toca una carta elegida para marcarla como invertida.
      </Text>

      {cards.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {cards.map((c, i) => (
            <TarotCard
              key={c.id}
              card={c}
              faceUp
              width={76}
              label={SPREAD_POSITIONS[i] ?? `Carta ${i + 1}`}
              onPress={() => flip(c.id)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.grid}>
        {MAJOR_ARCANA.map((a) => {
          const index = cards.findIndex((c) => c.id === a.id);
          const selected = index >= 0;
          return (
            <Pressable key={a.id} onPress={() => toggle(a.id)} style={[styles.item, selected && styles.itemSelected]}>
              <Text style={styles.numeral}>{a.numeral}</Text>
              <Text style={styles.name} numberOfLines={2}>
                {a.name}
              </Text>
              {selected && (
                <View style={styles.order}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Mensaje para tu consultante"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={4000}
        placeholder="Resume lo que viste en la tirada y tus consejos."
        hint="El cliente verá estas cartas y tu mensaje en su consulta."
      />
      <ErrorText message={error} />
      <Button title="Guardar tirada" onPress={save} loading={saving} disabled={!cards.length} icon="checkmark" />
      <View style={styles.tip}>
        <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
        <Text style={[type.small, { flex: 1 }]}>
          Con tu tirada guardada, el cliente podrá profundizar con la IA de Lunara, que siempre respeta tu interpretación.
        </Text>
      </View>
    </ScrollView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    width: '31.5%',
    minHeight: 72,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  itemSelected: { borderColor: colors.primary, backgroundColor: '#221A48' },
  numeral: { fontFamily: fonts.display, fontSize: 13, color: colors.gold },
  name: { fontFamily: fonts.medium, fontSize: 12, color: colors.cream },
  order: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
  tip: { flexDirection: 'row', gap: 8 },
});
