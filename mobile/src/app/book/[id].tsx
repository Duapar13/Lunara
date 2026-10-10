import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { CARD_PAYMENTS_AVAILABLE, pay } from '@/lib/payments';
import { formatDay, formatPrice, formatTime, offerLabel, offerTitle, TOPICS, type TopicKey } from '@/lib/format';
import type { Consultation, Offer, Reader } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Button, Card, Chip, ChipRow, ErrorText, Input, Loading } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';
import { CosmicScreen } from '@/components/Cosmic';
import { t } from '@/lib/i18n';
import { useAppConfig } from '@/lib/appConfig';

type SlotDay = { date: string; slots: string[] };

export default function Book() {
  const { id, offerId } = useLocalSearchParams<{ id: string; offerId: string }>();
  const { data } = useFetch<{ reader: Reader; offers: Offer[] }>(`/readers/${id}`);
  const offer = data?.offers.find((o) => o.id === Number(offerId));
  const reader = data?.reader;
  // Mode test : « Ahora » est proposé même si la voyante n'est pas en ligne.
  const { testMode } = useAppConfig();

  const [topic, setTopic] = useState<TopicKey>('general');
  const [question, setQuestion] = useState('');
  const [days, setDays] = useState<SlotDay[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null); // null = « Ahora »
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (offer?.type !== 'video') return;
    api<{ days: SlotDay[] }>(`/readers/${id}/slots?offerId=${offer.id}`)
      .then((res) => {
        setDays(res.days);
        setDay(res.days[0]?.date ?? null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id, offer?.id, offer?.type]);

  if (!data || !offer || !reader) return <Loading />;

  const isVideo = offer.type === 'video';
  const canNow = reader.online || testMode;
  const now = isVideo && canNow && !slot;
  const ready = isVideo ? !!slot || canNow : question.trim().length >= 5;

  async function checkout() {
    setError(null);
    setPaying(true);
    try {
      // La réservation est créée une seule fois, même si le paiement est relancé.
      let c = consultation;
      if (!c || c.status !== 'pending_payment') {
        const res = await api<{ consultation: Consultation }>('/consultations', {
          method: 'POST',
          body: {
            readerId: reader!.id,
            offerId: offer!.id,
            topic,
            question: question.trim() || undefined,
            scheduledAt: isVideo ? slot : undefined,
          },
        });
        c = res.consultation;
        setConsultation(c);
      }
      const result = await pay(c.id);
      if (result.status === 'paid') {
        router.dismissAll();
        router.push(`/consultation/${c.id}`);
      } else if (result.status === 'pending') {
        Alert.alert(
          t('Pago en proceso'),
          t('Estamos esperando la confirmación del pago. Te avisaremos en "Mis consultas" apenas se confirme.'),
          [{ text: t('Entendido'), onPress: () => router.replace('/(client)/consultations') }],
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  const daySlots = days?.find((d) => d.date === day)?.slots ?? [];

  return (
    <CosmicScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.summary}>
          <Avatar name={reader.name} url={reader.avatarUrl} size={52} online={reader.online} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{reader.name}</Text>
            <Text style={type.small}>{offerTitle(offer)}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(offer.priceCents)}</Text>
        </Card>

        <View style={styles.block}>
          <Text style={type.h3}>{t('Tema de tu consulta')}</Text>
          <View style={{ marginHorizontal: -space.xl }}>
            <ChipRow>
              {TOPICS.map((tp) => (
                <Chip key={tp.key} label={t(tp.label)} selected={topic === tp.key} onPress={() => setTopic(tp.key)} />
              ))}
            </ChipRow>
          </View>
        </View>

        {isVideo && (
          <View style={styles.block}>
            <Text style={type.h3}>{t('¿Cuándo?')}</Text>
            {canNow && (
              <Pressable onPress={() => setSlot(null)} style={[styles.now, now && styles.nowActive]}>
                <View style={styles.liveDot} />
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{t('Ahora')}</Text>
                  <Text style={type.small}>
                    {reader.online
                      ? t('{name} está en línea', { name: reader.name.split(' ')[0] })
                      : t('Modo prueba: videollamada inmediata')}
                  </Text>
                </View>
                <Ionicons name={now ? 'radio-button-on' : 'radio-button-off'} size={20} color={now ? colors.primary : colors.textFaint} />
              </Pressable>
            )}
            {days === null ? (
              <Loading />
            ) : days.length === 0 ? (
              <Text style={type.small}>{t('No hay horarios disponibles en los próximos 7 días.')}</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {days.map((d) => {
                    const f = formatDay(d.date);
                    const active = d.date === day;
                    return (
                      <Pressable key={d.date} onPress={() => setDay(d.date)} style={[styles.day, active && styles.dayActive]}>
                        <Text style={[styles.dayWeek, active && { color: colors.cream }]}>{f.weekday}</Text>
                        <Text style={styles.dayNum}>{f.day}</Text>
                        <Text style={[styles.dayWeek, active && { color: colors.cream }]}>{f.month}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.slots}>
                  {daySlots.map((s) => (
                    <Chip key={s} label={formatTime(s)} selected={slot === s} onPress={() => setSlot(s)} />
                  ))}
                </View>
                <Text style={type.small}>{t('Horario de tu teléfono. Podrás entrar 10 minutos antes.')}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.block}>
          <Input
            label={isVideo ? t('Cuéntale brevemente tu situación (opcional)') : t('Tu primera pregunta')}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={1000}
            placeholder={isVideo ? t('Así tu experto podrá prepararse.') : t('Ej. ¿Cómo evolucionará mi relación en los próximos meses?')}
            hint={
              isVideo
                ? undefined
                : t('Tu paquete incluye {label}. Esta cuenta como la primera.', { label: offerLabel(offer) })
            }
          />
        </View>

        <View style={styles.block}>
          <Text style={type.h3}>{t('Método de pago')}</Text>
          <View style={[styles.method, styles.methodActive]}>
            <Ionicons name="card-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{t('Tarjeta, Apple Pay o Google Pay')}</Text>
              <Text style={type.small}>{t('Visa, Mastercard y Amex, de Perú o del extranjero')}</Text>
            </View>
            <Ionicons name="lock-closed" size={18} color={colors.gold} />
          </View>
          {!CARD_PAYMENTS_AVAILABLE && (
            <Text style={[type.small, { color: colors.gold }]}>{t('El pago está disponible en la app móvil de Lunara.')}</Text>
          )}
        </View>

        <View style={styles.policy}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={[type.small, { flex: 1 }]}>
            {t('Pago seguro. Si la consulta no empieza, puedes cancelarla y recibir el reembolso completo.')}
          </Text>
        </View>
        <ErrorText message={error} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View>
          <Text style={type.small}>{t('Total')}</Text>
          <Text style={styles.total}>{formatPrice(offer.priceCents)}</Text>
        </View>
        <Button title={t('Pagar y reservar')} onPress={checkout} loading={paying} disabled={!ready || !CARD_PAYMENTS_AVAILABLE} style={{ flex: 1, maxWidth: 220 }} />
      </SafeAreaView>
    </KeyboardAvoidingView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  price: { fontFamily: fonts.semibold, fontSize: 17, color: colors.cream },
  block: { gap: space.md },
  now: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nowActive: { borderColor: colors.primary },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  day: {
    width: 62,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  dayNum: { fontFamily: fonts.semibold, fontSize: 18, color: colors.cream, marginVertical: 2 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodActive: { borderColor: colors.primary },
  policy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  total: { fontFamily: fonts.semibold, fontSize: 20, color: colors.cream },
});
