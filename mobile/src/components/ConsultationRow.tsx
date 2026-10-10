import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Badge } from './ui';
import { formatDateTime, offerTitle, statusLabel } from '@/lib/format';
import type { Consultation } from '@/lib/types';
import { colors, fonts, radius, type } from '@/theme';
import { t } from '@/lib/i18n';

const TONE = {
  pending_payment: 'muted',
  paid: 'violet',
  active: 'green',
  completed: 'gold',
  cancelled: 'muted',
  refunded: 'muted',
} as const;

/** `viewer` : qui regarde la liste, pour afficher l'autre participant. */
export function ConsultationRow({ c, viewer }: { c: Consultation; viewer: 'client' | 'reader' }) {
  const other = viewer === 'client' ? c.reader : c.client;
  const when = c.scheduledAt ?? c.startedAt ?? c.createdAt;
  return (
    <Pressable
      onPress={() => router.push(`/consultation/${c.id}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Avatar name={other.name} url={other.avatarUrl} size={48} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.name} numberOfLines={1}>
          {other.name}
        </Text>
        <View style={styles.meta}>
          <Ionicons name={c.type === 'chat' ? 'chatbubble-outline' : 'videocam-outline'} size={13} color={colors.accent} />
          <Text style={type.small}>{offerTitle(c)}</Text>
        </View>
        <Text style={type.small}>{c.type === 'video' && !c.scheduledAt && c.status === 'paid' ? t('Lo antes posible') : formatDateTime(when)}</Text>
      </View>
      <Badge label={statusLabel(c.status)} tone={TONE[c.status]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cream },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
