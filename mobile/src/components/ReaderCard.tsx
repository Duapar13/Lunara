import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { GlassCard, GradientText, LivePulse } from './Cosmic';
import { PressableScale, Rating } from './ui';
import { formatPrice } from '@/lib/format';
import type { Reader } from '@/lib/types';
import { avatarGradients, colors, fonts, radius, type } from '@/theme';
import { t } from '@/lib/i18n';

type Props = { reader: Reader; onToggleFavorite?: (reader: Reader) => void };

function Heart({ reader, onToggleFavorite }: Props) {
  if (!onToggleFavorite) return null;
  return (
    <Pressable hitSlop={12} onPress={() => onToggleFavorite(reader)} style={styles.heart}>
      <Ionicons
        name={reader.isFavorite ? 'heart' : 'heart-outline'}
        size={18}
        color={reader.isFavorite ? '#FF7AB6' : colors.textMuted}
      />
    </Pressable>
  );
}

/** Ligne de liste : avatar à anneau doré, spécialités, note, prix « desde ». */
export function ReaderCard({ reader, onToggleFavorite }: Props) {
  return (
    <PressableScale onPress={() => router.push(`/expert/${reader.id}`)}>
      <GlassCard contentStyle={styles.row}>
        <Avatar name={reader.name} url={reader.avatarUrl} size={64} online={reader.online} ring />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {reader.name}
            </Text>
            <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
          </View>
          <Text style={type.small} numberOfLines={1}>
            {reader.headline || reader.specialties.map((s) => t(s)).join(' · ')}
          </Text>
          <View style={styles.metaRow}>
            <Rating avg={reader.ratingAvg} count={reader.ratingCount} />
            {reader.online && (
              <View style={styles.onlineTag}>
                <LivePulse size={6} />
                <Text style={styles.online}>{t('En línea')}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.right}>
          <Heart reader={reader} onToggleFavorite={onToggleFavorite} />
          {reader.fromPriceCents != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.from}>{t('desde')}</Text>
              <Text style={styles.price}>{formatPrice(reader.fromPriceCents)}</Text>
            </View>
          )}
        </View>
      </GlassCard>
    </PressableScale>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Grande carte du carrousel « En vedette » : fond en dégradé propre à la voyante. */
export function FeaturedReaderCard({ reader, onToggleFavorite, width = 250 }: Props & { width?: number }) {
  const g = avatarGradients[hash(reader.name) % avatarGradients.length];
  return (
    <PressableScale onPress={() => router.push(`/expert/${reader.id}`)} style={{ width }}>
      <LinearGradient colors={['rgba(226,185,127,0.7)', 'rgba(167,139,250,0.15)', 'rgba(109,91,255,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featuredBorder}>
        <LinearGradient colors={[g[0], '#120D28', '#0D0A1E']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.featured}>
          <View style={[styles.orb, { backgroundColor: g[1] }]} />
          <View style={styles.featuredTop}>
            {reader.online ? (
              <View style={styles.livePill}>
                <LivePulse size={7} />
                <Text style={styles.livePillText}>{t('En línea')}</Text>
              </View>
            ) : (
              <View />
            )}
            <Heart reader={reader} onToggleFavorite={onToggleFavorite} />
          </View>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Avatar name={reader.name} url={reader.avatarUrl} size={96} ring />
            <GradientText style={styles.featuredName}>{reader.name}</GradientText>
            <Text style={[type.small, { textAlign: 'center' }]} numberOfLines={1}>
              {reader.specialties.slice(0, 3).map((s) => t(s)).join(' · ')}
            </Text>
            <Rating avg={reader.ratingAvg} count={reader.ratingCount} />
          </View>
          <View style={styles.featuredFooter}>
            <View>
              <Text style={styles.from}>{t('desde')}</Text>
              <Text style={styles.price}>{reader.fromPriceCents != null ? formatPrice(reader.fromPriceCents) : '—'}</Text>
            </View>
            <View style={styles.go}>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.cream, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  onlineTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  online: { fontFamily: fonts.medium, fontSize: 12, color: colors.success },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
  heart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 8, 18, 0.45)',
  },
  from: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint },
  price: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  featuredBorder: { borderRadius: 28, padding: 1.2 },
  featured: { borderRadius: 27, padding: 18, gap: 16, overflow: 'hidden', minHeight: 330, justifyContent: 'space-between' },
  orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, right: -70, opacity: 0.35 },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  livePillText: { fontFamily: fonts.medium, fontSize: 11, color: colors.success },
  featuredName: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  go: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
