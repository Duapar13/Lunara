import { StyleSheet, View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, gradients } from '@/theme';
import { t } from '@/lib/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icône d'onglet : pastille en dégradé violet lumineuse quand l'onglet est actif. */
function TabIcon({ icon, iconActive, focused, color }: { icon: IconName; iconActive: IconName; focused: boolean; color: ColorValue }) {
  if (!focused) return <Ionicons name={icon} size={22} color={color} />;
  return (
    <View style={styles.activeWrap}>
      <LinearGradient colors={gradients.violet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
        <Ionicons name={iconActive} size={20} color={colors.white} />
      </LinearGradient>
    </View>
  );
}

export const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title: t(title),
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <TabIcon icon={icon} iconActive={iconActive} focused={focused} color={color} />
  ),
});

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.cream,
  tabBarInactiveTintColor: 'rgba(245, 231, 214, 0.45)',
  tabBarStyle: {
    backgroundColor: '#0A0918',
    borderTopColor: 'rgba(167, 139, 250, 0.14)',
    paddingTop: 8,
  },
  tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, marginTop: 4 },
  sceneStyle: { backgroundColor: colors.bg },
} as const;

const styles = StyleSheet.create({
  activeWrap: {
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  pill: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
