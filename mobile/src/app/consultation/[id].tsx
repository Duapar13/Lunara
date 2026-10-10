import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSocket, useSocketEvent } from '@/lib/socket';
import { formatDateTime, formatPrice, formatTime, offerTitle, statusLabel, topicLabel, videoOpensAt } from '@/lib/format';
import { SPREAD_POSITIONS } from '@/lib/tarot';
import type { Consultation, Message } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { TarotCard } from '@/components/TarotCard';
import { Button, Card, ErrorText, Loading, Stars } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients, radius, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';
import { t } from '@/lib/i18n';
import { useAppConfig } from '@/lib/appConfig';

type Detail = { consultation: Consultation; messages: Message[]; review: { rating: number; comment: string | null } | null };

export default function ConsultationScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { user } = useAuth();
  const { socket, setActiveConsultation } = useSocket();
  const { testMode } = useAppConfig();
  const [c, setC] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [review, setReview] = useState<Detail['review']>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await api<Detail>(`/consultations/${id}`);
      setC(res.consultation);
      setMessages(res.messages);
      setReview(res.review);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      setActiveConsultation(id);
      return () => {
        setActiveConsultation(null);
      };
    }, [id, load, setActiveConsultation]),
  );

  // Rejoint la salle Socket.io de la consultation (et la rejoint à nouveau après une reconnexion).
  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit('consultation:join', id);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('consultation:leave', id);
    };
  }, [socket, id]);

  // Rafraîchit l'état « vidéo disponible » chaque minute.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const addMessage = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  useSocketEvent<Message>('message:new', (m) => {
    if (m.consultationId !== id) return;
    addMessage(m);
    setTyping(false);
  });
  useSocketEvent<Consultation>('consultation:updated', (updated) => {
    if (updated.id === id) setC(updated);
  });
  useSocketEvent<{ consultationId: number }>('typing', ({ consultationId }) => {
    if (consultationId !== id) return;
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 3000);
  });

  if (!c) return error ? <ErrorText message={error} /> : <Loading />;
  if (!user) return null;

  const isReader = user.id === c.reader.id;
  const other = isReader ? c.client : c.reader;
  const open = c.status === 'paid' || c.status === 'active';
  const questionsLeft = c.units - c.questionsUsed;
  const canWrite = c.type === 'chat' && open && (isReader || questionsLeft > 0);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      let message: Message;
      if (socket?.connected) {
        const res: { message?: Message; error?: string } = await socket.timeout(10_000).emitWithAck('message:send', {
          consultationId: id,
          body,
        });
        if (res.error || !res.message) throw new Error(res.error ?? t('No se pudo enviar'));
        message = res.message;
      } else {
        message = (await api<{ message: Message }>(`/consultations/${id}/messages`, { method: 'POST', body: { body } })).message;
        // Sans socket, pas de « consultation:updated » : on relit le compteur de questions.
        load();
      }
      addMessage(message);
      setDraft('');
    } catch (err) {
      Alert.alert(t('Mensaje no enviado'), errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function onDraftChange(text: string) {
    setDraft(text);
    if (socket && Date.now() - lastTypingSent.current > 2000) {
      lastTypingSent.current = Date.now();
      socket.emit('typing', { consultationId: id });
    }
  }

  async function action(path: string, confirm: { title: string; text: string; cta: string }) {
    Alert.alert(t(confirm.title), t(confirm.text), [
      { text: t('Volver'), style: 'cancel' },
      {
        text: confirm.cta,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await api<{ consultation: Consultation }>(`/consultations/${id}/${path}`, { method: 'POST' });
            setC(res.consultation);
          } catch (err) {
            Alert.alert(t('Error'), errorMessage(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const opensAt = videoOpensAt(c, testMode);
  const videoOpen = c.type === 'video' && open && now >= opensAt;

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.lg }}>
      <Card style={{ gap: space.md }}>
        <View style={styles.headRow}>
          <Avatar name={other.name} url={other.avatarUrl} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{other.name}</Text>
            <Text style={type.small}>
              {offerTitle(c)} · {topicLabel(c.topic)}
            </Text>
          </View>
          <Text style={styles.status}>{statusLabel(c.status)}</Text>
        </View>

        {c.type === 'video' && c.scheduledAt && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.accent} />
            <Text style={type.body}>{formatDateTime(c.scheduledAt)}</Text>
          </View>
        )}
        {c.type === 'chat' && open && (
          <View style={styles.infoRow}>
            <Ionicons name="help-circle-outline" size={16} color={colors.accent} />
            <Text style={type.body}>
              {t('Preguntas usadas: {used}/{total}', { used: c.questionsUsed, total: c.units })}
            </Text>
          </View>
        )}
        <StatusHint c={c} isReader={isReader} />

        {c.type === 'video' && open && (
          <Button
            title={videoOpen ? t('Entrar a la videollamada') : t('Disponible desde las {v0}', { v0: formatTime(new Date(opensAt).toISOString()) })}
            icon="videocam"
            disabled={!videoOpen}
            onPress={() => router.push(`/video/${c.id}`)}
          />
        )}

        {isReader && (open || (c.status === 'completed' && !c.readingCards)) && (
          <Button
            title={c.readingCards ? t('Editar tirada') : t('Registrar tirada')}
            variant="secondary"
            icon="albums-outline"
            onPress={() => router.push(`/reading/${c.id}`)}
          />
        )}
        {isReader && open && (
          <Button
            title={t('Finalizar consulta')}
            variant="secondary"
            loading={busy}
            onPress={() =>
              action('complete', {
                title: t('Finalizar consulta'),
                text: t('El cliente ya no podrá escribir y podrá dejar su reseña.'),
                cta: t('Finalizar'),
              })
            }
          />
        )}
        {!isReader && c.status === 'completed' && !c.reviewRating && !review && (
          <Button title={t('Dejar mi reseña')} icon="star-outline" onPress={() => router.push(`/review/${c.id}`)} />
        )}
        {!isReader && c.readingCards && (
          <Button
            title={t('Profundizar con IA')}
            variant="secondary"
            icon="sparkles-outline"
            onPress={() => router.push(`/deepen/${c.id}`)}
          />
        )}
        {c.status === 'paid' && !c.startedAt && (
          <Button
            title={t('Cancelar y reembolsar')}
            variant="ghost"
            small
            loading={busy}
            onPress={() =>
              action('cancel', {
                title: t('Cancelar consulta'),
                text: t('Se reembolsará {v0} al medio de pago original.', { v0: formatPrice(c.priceCents) }),
                cta: t('Cancelar consulta'),
              })
            }
          />
        )}
        {c.status === 'pending_payment' && (
          <Button
            title={t('Cancelar reserva')}
            variant="ghost"
            small
            onPress={() => action('cancel', { title: t('Cancelar reserva'), text: t('Esta reserva no fue pagada.'), cta: t('Cancelar') })}
          />
        )}
      </Card>

      {c.readingCards && (
        <Card style={{ gap: space.md }}>
          <Text style={styles.label}>{t('LA TIRADA DE {name}', { name: c.reader.name.split(' ')[0].toUpperCase() })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {c.readingCards.map((card, i) => (
              <TarotCard key={`${card.id}-${i}`} card={card} faceUp width={70} label={SPREAD_POSITIONS[i] ?? t('Carta {v0}', { v0: i + 1 })} />
            ))}
          </ScrollView>
          {!!c.readerNotes && <Text style={type.bodyMuted}>{c.readerNotes}</Text>}
        </Card>
      )}

      {review && (
        <Card style={{ gap: 6 }}>
          <Text style={styles.label}>{t('RESEÑA')}</Text>
          <Stars value={review.rating} />
          {!!review.comment && <Text style={type.bodyMuted}>{review.comment}</Text>}
        </Card>
      )}
    </View>
  );

  return (
    <CosmicScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: other.name }} />
      {c.type === 'chat' ? (
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={header}
          ListHeaderComponent={typing ? <Text style={styles.typing}>{t('{name} está escribiendo…', { name: other.name.split(' ')[0] })}</Text> : null}
          renderItem={({ item }) => {
            const mine = item.senderId === user.id;
            const questionNumber = item.isQuestion
              ? messages.filter((m) => m.isQuestion && m.id <= item.id).length
              : null;
            return (
              <View style={[styles.bubbleWrap, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                {questionNumber && (
                  <Text style={styles.qLabel}>
                    {t('Pregunta {n}/{total}', { n: questionNumber, total: c.units })}
                  </Text>
                )}
                {mine ? (
                  <LinearGradient colors={gradients.violet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>
                    <Text style={[styles.bubbleText, { color: colors.white }]}>{item.body}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.bubble, styles.theirs]}>
                    <Text style={styles.bubbleText}>{item.body}</Text>
                  </View>
                )}
                <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
              </View>
            );
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>{header}</ScrollView>
      )}

      {c.type === 'chat' && open && (
        <SafeAreaView edges={['bottom']} style={styles.composer}>
          {canWrite ? (
            <>
              <TextInput
                value={draft}
                onChangeText={onDraftChange}
                placeholder={isReader ? t('Escribe tu respuesta…') : t('Escribe tu pregunta ({v0} restantes)', { v0: questionsLeft })}
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.accent}
                style={styles.input}
                multiline
                maxLength={2000}
              />
              <Pressable onPress={send} disabled={!draft.trim() || sending} style={[styles.send, (!draft.trim() || sending) && { opacity: 0.4 }]}>
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              </Pressable>
            </>
          ) : (
            <Text style={[type.small, { flex: 1, textAlign: 'center', paddingVertical: 8 }]}>
              {t('Usaste tus {n} preguntas. {name} responderá y cerrará la consulta.', { n: c.units, name: c.reader.name.split(' ')[0] })}
            </Text>
          )}
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

function StatusHint({ c, isReader }: { c: Consultation; isReader: boolean }) {
  const name = c.reader.name.split(' ')[0];
  let text: string | null = null;
  if (c.status === 'pending_payment') text = t('Esta reserva aún no fue pagada.');
  else if (c.status === 'paid' && c.type === 'chat')
    text = isReader ? t('Nueva consulta pagada. Responde para iniciarla.') : t('Consulta confirmada. {name} te responderá pronto.', { name });
  else if (c.status === 'paid' && c.type === 'video')
    text = c.scheduledAt
      ? t('Podrás entrar 10 minutos antes de la hora reservada.')
      : isReader
        ? t('El cliente quiere empezar ahora. Entra a la videollamada.')
        : t('{name} está en línea. Entra cuando quieras.', { name });
  else if (c.status === 'completed') text = c.endedAt ? t('Consulta finalizada el {date}.', { date: formatDateTime(c.endedAt) }) : t('Consulta finalizada.');
  else if (c.status === 'refunded') text = t('Consulta cancelada y reembolsada.');
  else if (c.status === 'cancelled') text = t('Consulta cancelada.');
  if (!text) return null;
  return <Text style={type.small}>{text}</Text>;
}

const styles = StyleSheet.create({
  list: { padding: space.xl, gap: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...type.label, color: colors.gold },
  bubbleWrap: { gap: 3, marginBottom: space.sm },
  qLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.gold, marginHorizontal: 4 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  mine: { borderBottomRightRadius: 6 },
  theirs: { backgroundColor: 'rgba(32, 24, 62, 0.85)', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.22)' },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.cream },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint, marginHorizontal: 4 },
  typing: { ...type.small, fontStyle: 'italic', marginBottom: space.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    color: colors.cream,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
