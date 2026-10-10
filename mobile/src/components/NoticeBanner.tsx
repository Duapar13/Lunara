import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '@/lib/socket';
import { colors, fonts, radius } from '@/theme';

/** Bannière in-app pour les nouveaux messages et réservations reçus via Socket.io. */
export function NoticeBanner() {
  const { notice, dismissNotice } = useSocket();
  const insets = useSafeAreaInsets();
  if (!notice) return null;
  return (
    <Pressable
      onPress={() => {
        dismissNotice();
        if (notice.consultationId) router.push(`/consultation/${notice.consultationId}`);
      }}
      style={[styles.wrap, { top: insets.top + 8 }]}
    >
      <View style={styles.icon}>
        <Ionicons name="moon" size={16} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {notice.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notice.body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
