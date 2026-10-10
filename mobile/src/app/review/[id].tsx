import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, errorMessage } from '@/lib/api';
import { Button, ErrorText, Input } from '@/components/ui';
import { colors, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';

const LABELS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api(`/consultations/${id}/review`, { method: 'POST', body: { rating, comment: comment.trim() || undefined } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <CosmicScreen>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={type.h1}>¿Cómo fue tu consulta?</Text>
      <Text style={type.bodyMuted}>Tu reseña ayuda a otras personas a elegir. Se publica con tu nombre y la inicial de tu apellido.</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync();
              setRating(i);
            }}
          >
            <Ionicons name={rating >= i ? 'star' : 'star-outline'} size={40} color={colors.gold} />
          </Pressable>
        ))}
      </View>
      <Text style={[type.h3, { textAlign: 'center', minHeight: 22 }]}>{LABELS[rating]}</Text>
      <Input
        label="Comentario (opcional)"
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={1000}
        placeholder="¿Qué te pareció la lectura?"
      />
      <ErrorText message={error} />
      <Button title="Publicar reseña" onPress={submit} loading={loading} disabled={!rating} />
    </ScrollView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: space.md },
});
