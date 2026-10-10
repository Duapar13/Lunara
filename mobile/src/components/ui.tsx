import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, gradients, radius, space, type } from '@/theme';
import { t } from '@/lib/i18n';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

/** Enveloppe qui rétrécit légèrement au toucher (ressort), pour un retour tactile premium. */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(scaleTo, { damping: 18, stiffness: 320 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 14, stiffness: 260 }));
      }}
    >
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, iconRight, style, small }: ButtonProps) {
  const inactive = disabled || loading;
  const textColor =
    variant === 'gold' ? '#1A1206' : variant === 'primary' || variant === 'danger' ? colors.white : colors.cream;
  const fill = variant === 'primary' ? gradients.violet : variant === 'gold' ? gradients.gold : null;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.buttonInner}>
      {icon && <Ionicons name={icon} size={small ? 16 : 18} color={textColor} />}
      <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: textColor }]}>{title}</Text>
      {iconRight && <Ionicons name={iconRight} size={small ? 16 : 18} color={textColor} />}
    </View>
  );

  return (
    <PressableScale
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      disabled={inactive}
      style={[inactive && { opacity: 0.45 }, style]}
    >
      {fill ? (
        <LinearGradient
          colors={fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, small && styles.buttonSmall, variant === 'primary' && styles.buttonGlow]}
        >
          {/* Reflet en haut du bouton */}
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            style={[StyleSheet.absoluteFill, { borderRadius: small ? radius.sm : radius.md, height: '55%' }]}
          />
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            small && styles.buttonSmall,
            variant === 'secondary' && styles.buttonSecondary,
            variant === 'danger' && { backgroundColor: colors.danger },
          ]}
        >
          {content}
        </View>
      )}
    </PressableScale>
  );
}

type InputProps = TextInputProps & { label?: string; hint?: string };

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, hint, style, ...props }, ref) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
        {...props}
      />
      {hint && <Text style={type.small}>{hint}</Text>}
    </View>
  );
});

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.75 }]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.white : colors.accent} />}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Ligne de chips défilante horizontalement. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={type.h2}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Badge({ label, tone = 'violet' }: { label: string; tone?: 'violet' | 'green' | 'gold' | 'muted' | 'red' }) {
  const tint = {
    violet: colors.accent,
    green: colors.success,
    gold: colors.gold,
    muted: colors.textMuted,
    red: colors.danger,
  }[tone];
  return (
    <View style={[styles.badge, { borderColor: `${tint}55`, backgroundColor: `${tint}1A` }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function OnlineDot({ online, label }: { online: boolean; label?: boolean }) {
  return (
    <View style={styles.onlineRow}>
      <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textFaint }]} />
      {label && (
        <Text style={[styles.onlineText, { color: online ? colors.success : colors.textFaint }]}>
          {online ? t('En línea') : t('Desconectado')}
        </Text>
      )}
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.gold}
        />
      ))}
    </View>
  );
}

export function Rating({ avg, count }: { avg: number; count: number }) {
  if (!count) return <Badge label={t('Nuevo en Lunara')} tone="gold" />;
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={13} color={colors.gold} />
      <Text style={styles.ratingValue}>{avg.toFixed(1)}</Text>
      <Text style={type.small}>({count})</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[type.h3, { textAlign: 'center' }]}>{title}</Text>
      {text && <Text style={[type.small, { textAlign: 'center' }]}>{text}</Text>}
      {action}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function ListRow({
  icon,
  label,
  onPress,
  right,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.accent} />
      <Text style={[type.body, { flex: 1 }, danger && { color: colors.danger }]}>{label}</Text>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.sm },
  buttonSecondary: { backgroundColor: 'rgba(26, 19, 48, 0.7)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.28)' },
  buttonGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  inputLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.cream },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    color: colors.cream,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 110, paddingTop: 14, textAlignVertical: 'top' },
  card: {
    backgroundColor: 'rgba(26, 19, 48, 0.72)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.22)',
    backgroundColor: 'rgba(26, 19, 48, 0.7)',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.cream },
  chipRow: { gap: 8, paddingHorizontal: space.xl },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionAction: { fontFamily: fonts.medium, fontSize: 14, color: colors.accent },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  badgeText: { fontFamily: fonts.medium, fontSize: 11 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontFamily: fonts.medium, fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.cream },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  errorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger, flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
});
