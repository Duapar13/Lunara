import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ARCANA_ICONS, MAJOR_ARCANA } from '@/lib/tarot';
import type { DrawnCard } from '@/lib/types';
import { colors, fonts, gradients } from '@/theme';

type Props = {
  card?: DrawnCard;
  faceUp?: boolean;
  width?: number;
  onPress?: () => void;
  selected?: boolean;
  label?: string;
  /** Anime le retournement quand `faceUp` passe à true. */
  animated?: boolean;
};

/** Dos de carte : rosace lune/étoile dorée sur violet nuit. */
function CardBack({ w, h }: { w: number; h: number }) {
  return (
    <LinearGradient colors={['#2A1F5C', '#140F2A', '#1F1640']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 60 100">
        <Rect x="3" y="3" width="54" height="94" rx="4" stroke={colors.gold} strokeOpacity={0.6} strokeWidth="0.7" fill="none" />
        <Rect x="6.5" y="6.5" width="47" height="87" rx="2.5" stroke={colors.gold} strokeOpacity={0.25} strokeWidth="0.4" fill="none" />
        {[0, 30, 60, 90, 120, 150].map((a) => (
          <Line
            key={a}
            x1={30 + 20 * Math.cos((a * Math.PI) / 180)}
            y1={50 + 20 * Math.sin((a * Math.PI) / 180)}
            x2={30 - 20 * Math.cos((a * Math.PI) / 180)}
            y2={50 - 20 * Math.sin((a * Math.PI) / 180)}
            stroke={colors.gold}
            strokeOpacity={0.18}
            strokeWidth="0.4"
          />
        ))}
        <Circle cx="30" cy="50" r="15" stroke={colors.gold} strokeOpacity={0.55} strokeWidth="0.6" fill="none" />
        <Circle cx="30" cy="50" r="21" stroke={colors.gold} strokeOpacity={0.2} strokeWidth="0.4" fill="none" />
        <Path d="M30 37 L32.2 47.8 L43 50 L32.2 52.2 L30 63 L27.8 52.2 L17 50 L27.8 47.8 Z" fill={colors.gold} />
        <Path d="M30 12 a5 5 0 1 0 4 8 a4 4 0 1 1 -4 -8 Z" fill={colors.gold} fillOpacity={0.75} />
        <Circle cx="30" cy="86" r="1.6" fill={colors.gold} fillOpacity={0.7} />
        <Circle cx="24" cy="86" r="0.9" fill={colors.gold} fillOpacity={0.5} />
        <Circle cx="36" cy="86" r="0.9" fill={colors.gold} fillOpacity={0.5} />
      </Svg>
    </LinearGradient>
  );
}

function CardFace({ card, w, h }: { card: DrawnCard; w: number; h: number }) {
  const arcana = MAJOR_ARCANA[card.id];
  const icon = ARCANA_ICONS[card.id];
  return (
    <LinearGradient colors={['#2B2160', '#1A1338', '#120D28']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ width: w, height: h }}>
      <View style={[styles.faceFrame, { borderRadius: w * 0.06 }]} />
      <View style={[styles.face, card.reversed && { transform: [{ rotate: '180deg' }] }]}>
        <Text style={[styles.numeral, { fontSize: Math.max(10, w * 0.15) }]}>{arcana.numeral}</Text>
        <View style={[styles.iconHalo, { width: w * 0.56, height: w * 0.56, borderRadius: w * 0.28 }]}>
          <LinearGradient colors={['rgba(212,167,106,0.35)', 'rgba(109,91,255,0.15)']} style={StyleSheet.absoluteFill} />
          <Ionicons name={icon} size={w * 0.3} color={colors.gold} />
        </View>
        <Text style={[styles.name, { fontSize: Math.max(9, w * 0.115) }]} numberOfLines={2}>
          {arcana.name}
        </Text>
      </View>
    </LinearGradient>
  );
}

export function TarotCard({ card, faceUp, width = 90, onPress, selected, label, animated }: Props) {
  const height = width * 1.66;
  const flip = useSharedValue(faceUp && !animated ? 1 : 0);
  const lift = useSharedValue(0);

  useEffect(() => {
    flip.value = animated ? withTiming(faceUp ? 1 : 0, { duration: 700 }) : faceUp ? 1 : 0;
  }, [faceUp, animated, flip]);
  useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, { damping: 12 });
  }, [selected, lift]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
  }));
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * lift.value }, { scale: 1 + 0.04 * lift.value }],
  }));

  const r = width * 0.08;
  const content = (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Animated.View style={[liftStyle, selected && styles.selectedGlow]}>
        <LinearGradient
          colors={selected ? gradients.violet : ['rgba(226,185,127,0.9)', 'rgba(212,167,106,0.25)', 'rgba(226,185,127,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: selected ? 2 : 1, borderRadius: r + 1 }}
        >
          <View style={{ width, height, borderRadius: r, overflow: 'hidden' }}>
            <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
              <CardBack w={width} h={height} />
            </Animated.View>
            {card && (
              <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
                <CardFace card={card} w={width} h={height} />
              </Animated.View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
      {label && <Text style={styles.label}>{label}</Text>}
      {faceUp && card?.reversed && <Text style={styles.reversed}>Invertida</Text>}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  faceFrame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 0.8,
    borderColor: 'rgba(212, 167, 106, 0.45)',
  },
  face: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 6, paddingVertical: 8 },
  iconHalo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 0.6, borderColor: 'rgba(212,167,106,0.4)' },
  numeral: { fontFamily: fonts.display, color: colors.gold, letterSpacing: 1 },
  name: { fontFamily: fonts.display, color: colors.cream, textAlign: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  reversed: { fontFamily: fonts.regular, fontSize: 11, color: colors.accent, marginTop: -4 },
  selectedGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
