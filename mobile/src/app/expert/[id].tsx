import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/socket';
import { formatPrice, formatRelative, offerLabel, offerTitle, sortOffers } from '@/lib/format';
import type { Offer, OfferType, Reader, Review } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { CosmicScreen, Float, GlassCard, GradientText, LivePulse } from '@/components/Cosmic';
import { Badge, Button, EmptyState, ErrorText, Loading, Stars } from '@/components/ui';
import { avatarGradients, colors, fonts, gradients, radius, space, type } from '@/theme';

type Data = { reader: Reader; offers: Offer[]; reviews: Review[] };

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function ExpertProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data, setData, loading, error } = useFetch<Data>(`/readers/${id}`);
  const [kind, setKind] = useState<OfferType>('chat');
  const [offerId, setOfferId] = useState<number | null>(null);

  useSocketEvent<{ readerId: number; online: boolean }>('reader:presence', ({ readerId, online }) => {
    if (readerId === Number(id)) setData((d) => d && { ...d, reader: { ...d.reader, online } });
  });

  const offers = data ? sortOffers(data.offers) : [];
  const ofKind = offers.filter((o) => o.type === kind);
  // Sans choix explicite, le forfait intermédiaire du type affiché est présélectionné.
  const selected = ofKind.find((o) => o.id === offerId) ?? ofKind[Math.min(1, ofKind.length - 1)] ?? null;

  if (loading && !data) return <CosmicScreen><Loading /></CosmicScreen>;
  if (!data) return <CosmicScreen><ErrorText message={error} /></CosmicScreen>;
  const { reader, reviews } = data;
  const g = avatarGradients[hash(reader.name) % avatarGradients.length];

  async function toggleFavorite() {
    const next = !reader.isFavorite;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setData((d) => d && { ...d, reader: { ...d.reader, isFavorite: next } });
    await api(`/me/favorites/${reader.id}`, { method: next ? 'PUT' : 'DELETE' }).catch(() =>
      setData((d) => d && { ...d, reader: { ...d.reader, isFavorite: !next } }),
    );
  }

  const canBook = user?.role === 'client';

  return (
    <CosmicScreen>
      <Stack.Screen
        options={{
          headerRight: () =>
            canBook ? (
              <Pressable onPress={toggleFavorite} hitSlop={10} style={styles.headerBtn}>
                <Ionicons
                  name={reader.isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={reader.isFavorite ? '#FF7AB6' : colors.cream}
                />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[g[0], 'rgba(8,8,18,0)']} style={styles.hero}>
          <View style={[styles.heroOrb, { backgroundColor: g[1] }]} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Float distance={5} duration={3800}>
              <Avatar name={reader.name} url={reader.avatarUrl} size={128} ring />
            </Float>
            <View style={styles.nameRow}>
              <GradientText style={styles.name}>{reader.name}</GradientText>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            </View>
            {!!reader.headline && <Text style={[type.bodyMuted, { textAlign: 'center' }]}>{reader.headline}</Text>}
            <View style={[styles.statusPill, reader.online && styles.statusOnline]}>
              {reader.online ? <LivePulse size={8} /> : <View style={styles.offDot} />}
              <Text style={[styles.statusText, reader.online && { color: colors.success }]}>
                {reader.online ? 'En línea · disponible ahora' : 'Fuera de línea · reserva un horario'}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <GlassCard glow contentStyle={styles.stats}>
              <Stat
                value={reader.ratingCount ? reader.ratingAvg.toFixed(1) : '—'}
                label={reader.ratingCount ? `${reader.ratingCount} reseñas` : 'Sin reseñas'}
                icon="star"
              />
              <View style={styles.divider} />
              <Stat value={String(reader.consultationsCount)} label="consultas" icon="chatbubbles" />
              <View style={styles.divider} />
              <Stat value={`${reader.yearsExperience}`} label="años de exp." icon="ribbon" />
            </GlassCard>
          </Animated.View>

          <View style={styles.badges}>
            <Badge label="✓ Perfil verificado" tone="violet" />
            {reader.specialties.map((s) => (
              <Badge key={s} label={s} tone="gold" />
            ))}
            {reader.languages.map((l) => (
              <Badge key={l} label={l} tone="muted" />
            ))}
          </View>

          {!!reader.bio && (
            <View style={{ gap: space.sm }}>
              <Text style={type.h2}>Sobre mí</Text>
              <Text style={[type.bodyMuted, { lineHeight: 24 }]}>{reader.bio}</Text>
            </View>
          )}

          <View style={{ gap: space.md }}>
            <Text style={type.h2}>Elige tu consulta</Text>
            <View style={styles.tabs}>
              {(['chat', 'video'] as const).map((k) => {
                const active = kind === k;
                const inner = (
                  <>
                    <Ionicons name={k === 'chat' ? 'chatbubble-ellipses' : 'videocam'} size={18} color={active ? colors.white : colors.textMuted} />
                    <Text style={[styles.tabText, active && { color: colors.white }]}>{k === 'chat' ? 'Chat' : 'Videollamada'}</Text>
                  </>
                );
                return (
                  <Pressable key={k} onPress={() => setKind(k)} style={{ flex: 1 }}>
                    {active ? (
                      <LinearGradient colors={gradients.violet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>
                        {inner}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.tab, styles.tabIdle]}>{inner}</View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={type.small}>
              {kind === 'chat'
                ? 'Escribe tus preguntas y recibe respuestas detalladas en un chat privado.'
                : 'Lectura en vivo, cara a cara, con duración garantizada.'}
            </Text>
            {ofKind.length === 0 && <Text style={type.small}>Este experto no ofrece este tipo de consulta.</Text>}
            {ofKind.map((o) => {
              const active = selected?.id === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setOfferId(o.id);
                  }}
                >
                  <GlassCard glow={active} contentStyle={styles.offer}>
                    <View style={[styles.radio, active && styles.radioOn]}>{active && <View style={styles.radioDot} />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3}>{offerLabel(o)}</Text>
                      <Text style={type.small}>{o.type === 'chat' ? 'Respuestas por escrito' : 'Videollamada privada'}</Text>
                    </View>
                    {active ? (
                      <GradientText style={styles.offerPrice}>{formatPrice(o.priceCents)}</GradientText>
                    ) : (
                      <Text style={styles.offerPrice}>{formatPrice(o.priceCents)}</Text>
                    )}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: space.md }}>
            <View style={styles.reviewsHead}>
              <Text style={type.h2}>Reseñas verificadas</Text>
              {reader.ratingCount > 0 && (
                <View style={styles.ratingBig}>
                  <Ionicons name="star" size={16} color={colors.gold} />
                  <Text style={styles.ratingBigText}>{reader.ratingAvg.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {reviews.length === 0 ? (
              <EmptyState icon="star-outline" title="Aún no hay reseñas" text="Solo quienes completaron una consulta pueden opinar." />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={292}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 12, paddingHorizontal: space.xl }}
                style={{ marginHorizontal: -space.xl }}
              >
                {reviews.map((r) => (
                  <GlassCard key={r.id} style={{ width: 280 }} contentStyle={{ gap: 8, minHeight: 150 }}>
                    <View style={styles.reviewHead}>
                      <Avatar name={r.clientName} size={34} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.h3}>{r.clientName}</Text>
                        <Text style={type.small}>{formatRelative(r.createdAt)}</Text>
                      </View>
                      <Stars value={r.rating} size={12} />
                    </View>
                    {!!r.comment && (
                      <Text style={[type.bodyMuted, { fontSize: 14 }]} numberOfLines={5}>
                        “{r.comment}”
                      </Text>
                    )}
                    <Text style={styles.reviewTag}>{offerTitle({ type: r.consultationType, units: r.consultationUnits })}</Text>
                  </GlassCard>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {canBook && selected && (
        <View style={styles.footerWrap}>
          <LinearGradient colors={['rgba(8,8,18,0)', 'rgba(8,8,18,0.95)', colors.bg]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <View>
              <GradientText style={styles.footerPrice}>{formatPrice(selected.priceCents)}</GradientText>
              <Text style={type.small}>{offerTitle(selected)}</Text>
            </View>
            <Button
              title="Reservar"
              iconRight="arrow-forward"
              style={{ flex: 1, maxWidth: 210 }}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: reader.id, offerId: selected.id } })}
            />
          </SafeAreaView>
        </View>
      )}
    </CosmicScreen>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
      <Ionicons name={icon} size={16} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={type.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,18,0.5)',
  },
  hero: { paddingBottom: space.xl, overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -200, alignSelf: 'center', opacity: 0.35 },
  heroInner: { alignItems: 'center', gap: space.sm, paddingTop: 60, paddingHorizontal: space.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.md },
  name: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26,19,48,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  statusOnline: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.35)' },
  offDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textFaint },
  statusText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  body: { paddingHorizontal: space.xl, gap: space.xl },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.cream },
  divider: { width: 1, height: 44, backgroundColor: 'rgba(167,139,250,0.18)' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: {
    flexDirection: 'row',
    gap: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabIdle: { borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', backgroundColor: 'rgba(26,19,48,0.6)' },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.gold },
  offerPrice: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.cream },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingBig: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingBigText: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.cream },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewTag: { fontFamily: fonts.medium, fontSize: 11, color: colors.accent, marginTop: 'auto' },
  footerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  footerPrice: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32 },
});
