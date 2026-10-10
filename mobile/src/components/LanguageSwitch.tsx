import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { t, useLang, type Lang } from '@/lib/i18n';
import { useAppConfig } from '@/lib/appConfig';
import { Badge } from './ui';
import { colors, fonts, gradients, radius } from '@/theme';

const OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: 'es', label: 'Español', flag: '🇵🇪' },
  { lang: 'fr', label: 'Français', flag: '🇫🇷' },
];

/** Sélecteur de langue de l'interface (et des réponses de l'IA). */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const { testMode } = useAppConfig();

  return (
    <View style={{ gap: 8 }}>
      {!compact && (
        <View style={styles.head}>
          <Text style={styles.title}>{t('Idioma')}</Text>
          {testMode && <Badge label={t('Modo prueba')} tone="gold" />}
        </View>
      )}
      <View style={[styles.row, compact && styles.rowCompact]}>
        {OPTIONS.map((o) => {
          const active = o.lang === lang;
          const content = (
            <Text style={[styles.label, active && { color: colors.white }]}>
              {o.flag} {compact ? o.lang.toUpperCase() : o.label}
            </Text>
          );
          return (
            <Pressable
              key={o.lang}
              style={{ flex: compact ? undefined : 1 }}
              onPress={() => {
                if (active) return;
                Haptics.selectionAsync();
                setLang(o.lang);
              }}
            >
              {active ? (
                <LinearGradient colors={gradients.violet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.option, compact && styles.optionCompact]}>
                  {content}
                </LinearGradient>
              ) : (
                <View style={[styles.option, styles.idle, compact && styles.optionCompact]}>{content}</View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.cream },
  row: { flexDirection: 'row', gap: 8 },
  rowCompact: { alignSelf: 'flex-end', gap: 6 },
  option: { height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  optionCompact: { height: 32, borderRadius: radius.pill },
  idle: { borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', backgroundColor: 'rgba(26,19,48,0.6)' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
});
