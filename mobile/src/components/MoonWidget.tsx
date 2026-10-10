import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { moonInfo } from '@/lib/moon';
import { Float, GlassCard } from './Cosmic';
import { colors, fonts, type } from '@/theme';
import { t } from '@/lib/i18n';

/** Dessine la partie éclairée de la lune selon la phase (croissant, gibbeuse, pleine…). */
function MoonDisc({ phase, size }: { phase: number; size: number }) {
  const r = size / 2 - 4;
  const c = size / 2;
  const waxing = phase < 0.5;
  const k = Math.cos(2 * Math.PI * phase); // 1 = nouvelle lune, -1 = pleine lune
  const rx = Math.abs(k) * r;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${rx} ${r} 0 0 ${innerSweep} ${c} ${c - r} Z`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0.6" stopColor={colors.gold} stopOpacity="0.25" />
          <Stop offset="1" stopColor={colors.gold} stopOpacity="0" />
        </RadialGradient>
        <SvgGradient id="lit" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FBE7C2" />
          <Stop offset="1" stopColor="#C8975A" />
        </SvgGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#halo)" />
      <Circle cx={c} cy={c} r={r} fill="#1C1636" stroke="rgba(212,167,106,0.35)" strokeWidth={0.8} />
      <Path d={lit} fill="url(#lit)" />
      <Circle cx={c - r * 0.3} cy={c - r * 0.2} r={r * 0.09} fill="#000" opacity={0.08} />
      <Circle cx={c + r * 0.25} cy={c + r * 0.3} r={r * 0.13} fill="#000" opacity={0.07} />
    </Svg>
  );
}

/** Carte « Energía lunar de hoy » : phase réelle de la lune et intention du jour. */
export function MoonWidget() {
  const info = useMemo(() => moonInfo(), []);
  return (
    <GlassCard glow contentStyle={styles.row}>
      <Float distance={4} duration={4000}>
        <MoonDisc phase={info.phase} size={74} />
      </Float>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.label}>{t('ENERGÍA LUNAR DE HOY')}</Text>
        <Text style={type.h2}>{t(info.name)}</Text>
        <Text style={styles.percent}>{t('{n} % iluminada', { n: Math.round(info.illumination * 100) })}</Text>
        <Text style={type.small}>{t(info.energy)}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  label: { ...type.label, color: colors.gold },
  percent: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent },
});
