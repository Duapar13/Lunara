import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { GradientText } from './Cosmic';
import { colors, fonts } from '@/theme';

function starPath(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Croissant de lune + étoile, repris de l'icône de l'app. */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6DDB0" />
          <Stop offset="0.55" stopColor={colors.gold} />
          <Stop offset="1" stopColor="#A97C45" />
        </LinearGradient>
        <Mask id="crescent">
          <Rect x="0" y="0" width="100" height="100" fill="white" />
          <Circle cx="61" cy="45" r="31" fill="black" />
        </Mask>
      </Defs>
      <Line x1="62" y1="2" x2="62" y2="22" stroke={colors.gold} strokeWidth="1.2" opacity="0.8" />
      <Circle cx="62" cy="11" r="3.2" fill="url(#gold)" />
      <Circle cx="45" cy="55" r="38" fill="url(#gold)" mask="url(#crescent)" />
      <Path d={starPath(63, 52, 17, 3.6)} fill="url(#gold)" />
    </Svg>
  );
}

type LogoProps = {
  size?: number;
  tagline?: boolean;
  layout?: 'row' | 'column';
};

export function Logo({ size = 40, tagline = false, layout = 'row' }: LogoProps) {
  const column = layout === 'column';
  return (
    <View style={[styles.wrap, column && styles.column]}>
      <LogoMark size={size} />
      <View style={column && styles.columnText}>
        <GradientText style={[styles.word, { fontSize: size * (column ? 0.62 : 0.6) }]}>Lunara</GradientText>
        {tagline && <Text style={styles.tagline}>TAROT Y GUÍA ESPIRITUAL</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  column: { flexDirection: 'column', gap: 12 },
  columnText: { alignItems: 'center' },
  word: { fontFamily: fonts.display, color: colors.cream, letterSpacing: 0.5 },
  tagline: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 3, color: colors.gold, marginTop: 6 },
});
