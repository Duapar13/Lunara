import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LivePulse } from './Cosmic';
import { avatarGradients, colors, fonts, gradients } from '@/theme';

type Props = { name: string; url?: string | null; size?: number; online?: boolean; ring?: boolean };

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Photo de profil, ou à défaut un « avatar astral » : dégradé propre à la personne + monogramme.
 * `ring` ajoute un anneau doré ; `online` un point vert pulsant (ou gris si hors ligne).
 */
export function Avatar({ name, url, size = 52, online, ring }: Props) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const inner = ring ? size - 6 : size;
  const g = avatarGradients[hash(name) % avatarGradients.length];
  const dot = Math.max(10, size * 0.2);

  const face = url ? (
    <Image source={{ uri: url }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} transition={200} />
  ) : (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.center, { width: inner, height: inner, borderRadius: inner / 2 }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
        style={[StyleSheet.absoluteFill, { borderRadius: inner / 2 }]}
        end={{ x: 0.5, y: 0.6 }}
      />
      <Text style={[styles.initials, { fontSize: inner * 0.36 }]}>{initials}</Text>
    </LinearGradient>
  );

  return (
    <View style={{ width: size, height: size }}>
      {ring ? (
        <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.center, { width: size, height: size, borderRadius: size / 2 }]}>
          <View style={[styles.center, { width: size - 3, height: size - 3, borderRadius: size / 2, backgroundColor: colors.bg }]}>{face}</View>
        </LinearGradient>
      ) : (
        face
      )}
      {online !== undefined && (
        <View style={[styles.dotWrap, { right: size * 0.02, bottom: size * 0.02, padding: 2, borderRadius: dot }]}>
          {online ? (
            <LivePulse size={dot} />
          ) : (
            <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.textFaint }} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: fonts.displayBold, color: colors.cream, letterSpacing: 0.5 },
  dotWrap: { position: 'absolute', backgroundColor: colors.bg },
});
