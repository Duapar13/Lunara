import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useReaders } from '@/lib/hooks';
import { firstName } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { FeaturedReaderCard, ReaderCard } from '@/components/ReaderCard';
import { TarotCard } from '@/components/TarotCard';
import { Avatar } from '@/components/Avatar';
import { CosmicScreen, Float, GlassCard, GradientText } from '@/components/Cosmic';
import { MoonWidget } from '@/components/MoonWidget';
import { EmptyState, ErrorText, Loading, PressableScale, SectionHeader } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme';
import { t } from '@/lib/i18n';

const CATEGORIES = [
  { label: 'Amor', icon: 'heart', tint: ['#FF7AB6', '#8B3A7A'] },
  { label: 'Trabajo', icon: 'briefcase', tint: ['#7C9BFF', '#3B3F9A'] },
  { label: 'Dinero', icon: 'diamond', tint: ['#F6DDB0', '#A97C45'] },
  { label: 'Familia', icon: 'people', tint: ['#7EE0C3', '#2E6B5E'] },
  { label: 'Energía', icon: 'flash', tint: ['#C4A5FF', '#5B3FE0'] },
  { label: 'Astrología', icon: 'planet', tint: ['#FFB38A', '#8A4A3A'] },
] as const;

const STEPS = [
  { icon: 'person-circle-outline', title: 'Encuentra a tu experto', text: 'Perfiles verificados y reseñas reales.' },
  { icon: 'chatbubbles-outline', title: 'Elige chat o videollamada', text: 'Paquetes claros, sin sorpresas.' },
  { icon: 'shield-checkmark-outline', title: 'Paga de forma segura', text: 'Precio fijo en soles. Reembolso si no empieza.' },
  { icon: 'sparkles-outline', title: 'Profundiza con IA', text: 'Guarda tu lectura y explórala cuando quieras.' },
] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t('Buenos días') : h < 19 ? t('Buenas tardes') : t('Buenas noches');
}

export default function Home() {
  const { user } = useAuth();
  const { readers, loading, error, refreshing, refresh, toggleFavorite } = useReaders('/readers');
  const online = readers.filter((r) => r.online);
  const featured = [...readers].sort((a, b) => b.ratingAvg * b.ratingCount - a.ratingAvg * a.ratingCount).slice(0, 6);

  return (
    <CosmicScreen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
        >
          <View style={styles.header}>
            <Logo size={34} />
            <Pressable onPress={() => router.push('/(client)/profile')}>
              <Avatar name={user?.name ?? '?'} url={user?.avatarUrl} size={42} ring />
            </Pressable>
          </View>

          <View style={styles.pad}>
            <Text style={styles.hello}>{greeting()},</Text>
            <GradientText style={styles.name}>{firstName(user?.name ?? '')}</GradientText>
            <Text style={[type.bodyMuted, { marginTop: 6 }]}>{t('¿Qué te gustaría descubrir hoy?')}</Text>
            <PressableScale onPress={() => router.push('/(client)/explore')} style={{ marginTop: space.lg }}>
              <GlassCard contentStyle={styles.search}>
                <Ionicons name="search" size={18} color={colors.accent} />
                <Text style={styles.searchText}>{t('Busca un experto, un tema…')}</Text>
                <View style={styles.searchBtn}>
                  <Ionicons name="options-outline" size={16} color={colors.cream} />
                </View>
              </GlassCard>
            </PressableScale>
          </View>

          <View style={styles.pad}>
            <MoonWidget />
          </View>

          {online.length > 0 && (
            <View style={{ gap: space.md }}>
              <View style={styles.pad}>
                <SectionHeader title={t('En línea ahora')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
                {online.map((r) => (
                  <Pressable key={r.id} onPress={() => router.push(`/expert/${r.id}`)} style={styles.story}>
                    <LinearGradient colors={['#4ADE80', '#6D5BFF', '#D4A76A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
                      <View style={styles.storyInner}>
                        <Avatar name={r.name} url={r.avatarUrl} size={60} />
                      </View>
                    </LinearGradient>
                    <Text style={styles.storyName} numberOfLines={1}>
                      {firstName(r.name)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ gap: space.md }}>
            <View style={styles.pad}>
              <SectionHeader title={t('Expertos destacados')} action={t('Ver todos')} onAction={() => router.push('/(client)/explore')} />
            </View>
            {loading && <Loading />}
            <View style={styles.pad}>
              <ErrorText message={error} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={262}
              decelerationRate="fast"
              contentContainerStyle={styles.carousel}
            >
              {featured.map((r) => (
                <FeaturedReaderCard key={r.id} reader={r} onToggleFavorite={toggleFavorite} />
              ))}
            </ScrollView>
          </View>

          <View style={[styles.pad, { gap: space.md }]}>
            <SectionHeader title={t('¿Qué te preocupa?')} />
            <View style={styles.grid}>
              {CATEGORIES.map((c) => (
                <PressableScale
                  key={c.label}
                  style={styles.tileWrap}
                  onPress={() => router.push({ pathname: '/(client)/explore', params: { specialty: c.label } })}
                >
                  <GlassCard contentStyle={styles.tile}>
                    <LinearGradient colors={c.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileIcon}>
                      <Ionicons name={c.icon} size={20} color={colors.white} />
                    </LinearGradient>
                    <Text style={styles.tileText}>{t(c.label)}</Text>
                  </GlassCard>
                </PressableScale>
              ))}
            </View>
          </View>

          <PressableScale onPress={() => router.push('/(client)/tarot')} style={styles.pad}>
            <LinearGradient
              colors={['rgba(226,185,127,0.8)', 'rgba(109,91,255,0.5)', 'rgba(226,185,127,0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyBorder}
            >
              <LinearGradient colors={['#2A1F5C', '#140F2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.daily}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.dailyLabel}>{t('✦ TIRADA DEL DÍA')}</Text>
                  <GradientText style={styles.dailyTitle}>{t('Elige 3 cartas')}</GradientText>
                  <Text style={type.small}>{t('Pasado, presente y futuro, interpretados al instante.')}</Text>
                  <View style={styles.dailyCta}>
                    <Text style={styles.dailyCtaText}>{t('Empezar')}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.gold} />
                  </View>
                </View>
                <View style={styles.dailyCards}>
                  <Float distance={6} duration={3000}>
                    <View style={{ transform: [{ rotate: '-12deg' }], marginRight: -30 }}>
                      <TarotCard width={50} />
                    </View>
                  </Float>
                  <Float distance={9} duration={3400} delay={300}>
                    <TarotCard width={56} card={{ id: 18, reversed: false }} faceUp />
                  </Float>
                  <Float distance={6} duration={2800} delay={600}>
                    <View style={{ transform: [{ rotate: '12deg' }], marginLeft: -30 }}>
                      <TarotCard width={50} />
                    </View>
                  </Float>
                </View>
              </LinearGradient>
            </LinearGradient>
          </PressableScale>

          <View style={[styles.pad, { gap: space.md }]}>
            <SectionHeader title={t('Todos los expertos')} action={t('Explorar')} onAction={() => router.push('/(client)/explore')} />
            {!loading && !error && !readers.length && (
              <EmptyState icon="moon-outline" title={t('Pronto habrá expertos aquí')} text={t('Estamos verificando los primeros perfiles.')} />
            )}
            {readers.slice(0, 5).map((r) => (
              <ReaderCard key={r.id} reader={r} onToggleFavorite={toggleFavorite} />
            ))}
          </View>

          <View style={[styles.pad, { gap: space.md }]}>
            <SectionHeader title={t('¿Cómo funciona?')} />
            <GlassCard contentStyle={{ gap: 18 }}>
              {STEPS.map((s, i) => (
                <View key={s.title} style={styles.step}>
                  <LinearGradient colors={['rgba(212,167,106,0.25)', 'rgba(109,91,255,0.2)']} style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{t(s.title)}</Text>
                    <Text style={type.small}>{t(s.text)}</Text>
                  </View>
                  <Ionicons name={s.icon} size={22} color={colors.accent} />
                </View>
              ))}
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </CosmicScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl + 4, paddingBottom: space.xxl * 1.5 },
  pad: { paddingHorizontal: space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
  },
  hello: { fontFamily: fonts.display, fontSize: 22, color: colors.textMuted },
  name: { fontFamily: fonts.displayItalic, fontSize: 40, lineHeight: 48 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingRight: 8 },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.textFaint },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  stories: { gap: 16, paddingHorizontal: space.xl },
  story: { alignItems: 'center', gap: 6, width: 72 },
  storyRing: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  storyName: { fontFamily: fonts.medium, fontSize: 12, color: colors.cream },
  carousel: { gap: 12, paddingHorizontal: space.xl, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileWrap: { width: '31.6%' },
  tile: { alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 6 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.medium, fontSize: 13, color: colors.cream },
  dailyBorder: { borderRadius: 26, padding: 1.2 },
  daily: { borderRadius: 25, flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10, overflow: 'hidden' },
  dailyLabel: { ...type.label, color: colors.gold },
  dailyTitle: { fontFamily: fonts.display, fontSize: 26 },
  dailyCards: { flexDirection: 'row', alignItems: 'center' },
  dailyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,167,106,0.5)',
  },
  dailyCtaText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,167,106,0.5)' },
  stepNumText: { fontFamily: fonts.displayBold, color: colors.gold, fontSize: 15 },
});
