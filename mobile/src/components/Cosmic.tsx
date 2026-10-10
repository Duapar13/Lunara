import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, gradients } from '@/theme';

/** Générateur pseudo-aléatoire déterministe : le ciel est le même à chaque rendu. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Stars({ count, seed, maxR }: { count: number; seed: number; maxR: number }) {
  const stars = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: 0.15 + rand() * maxR,
      o: 0.25 + rand() * 0.6,
      gold: rand() < 0.18,
    }));
  }, [count, seed, maxR]);
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.gold ? colors.gold : colors.cream} opacity={s.o} />
      ))}
    </Svg>
  );
}

/**
 * Fond « ciel nocturne » : dégradé profond, deux nébuleuses diffuses et deux couches d'étoiles,
 * dont une qui scintille lentement. Volontairement discret pour laisser respirer le contenu.
 */
export function CosmicBackground({ intensity = 1 }: { intensity?: number }) {
  const twinkle = useSharedValue(0.25);
  useEffect(() => {
    twinkle.value = withRepeat(
      withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(0.25, { duration: 2600 })),
      -1,
    );
  }, [twinkle]);
  const twinkleStyle = useAnimatedStyle(() => ({ opacity: twinkle.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="nebulaViolet" cx="85%" cy="8%" rx="70%" ry="35%">
            <Stop offset="0" stopColor="#6D5BFF" stopOpacity={0.32 * intensity} />
            <Stop offset="1" stopColor="#6D5BFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaGold" cx="5%" cy="62%" rx="55%" ry="28%">
            <Stop offset="0" stopColor="#D4A76A" stopOpacity={0.1 * intensity} />
            <Stop offset="1" stopColor="#D4A76A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nebulaDeep" cx="60%" cy="100%" rx="80%" ry="30%">
            <Stop offset="0" stopColor="#3B1F7A" stopOpacity={0.35 * intensity} />
            <Stop offset="1" stopColor="#3B1F7A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#nebulaViolet)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#nebulaGold)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#nebulaDeep)" />
      </Svg>
      <Stars count={70} seed={7} maxR={0.18} />
      <Animated.View style={[StyleSheet.absoluteFill, twinkleStyle]}>
        <Stars count={18} seed={42} maxR={0.32} />
      </Animated.View>
    </View>
  );
}

/** Conteneur d'écran avec le ciel nocturne en fond. */
export function CosmicScreen({ children, intensity }: { children: ReactNode; intensity?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CosmicBackground intensity={intensity} />
      {children}
    </View>
  );
}

/** Texte rempli d'un dégradé (doré par défaut). */
export function GradientText({
  children,
  style,
  colors: palette = gradients.goldText,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

/** Carte « verre dépoli » avec bordure en dégradé violet → or. */
export function GlassCard({
  children,
  style,
  contentStyle,
  glow,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
}) {
  return (
    <LinearGradient
      colors={glow ? gradients.border : ['rgba(167, 139, 250, 0.22)', 'rgba(167, 139, 250, 0.06)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.glassBorder, style]}
    >
      <LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.glassInner, contentStyle]}>
        {children}
      </LinearGradient>
    </LinearGradient>
  );
}

/** Lévitation douce (logo, cartes) : montée/descente lente et infinie. */
export function Float({ children, distance = 8, duration = 3200, delay = 0 }: { children: ReactNode; distance?: number; duration?: number; delay?: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(withTiming(-distance, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [y, distance, duration, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Point vert « en ligne » avec une onde qui pulse. */
export function LivePulse({ size = 10 }: { size?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
  }, [p]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }, ring]} />
      <View style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glassBorder: { borderRadius: 22, padding: 1 },
  glassInner: { borderRadius: 21, padding: 16, overflow: 'hidden' },
  pulse: { position: 'absolute', backgroundColor: colors.success },
});
